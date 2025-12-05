
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    return res.status(500).json({ error: 'Server Configuration Error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { 
    telegram_id, 
    username, 
    first_name, 
    last_name, 
    language_code, 
    timezone, 
    start_param 
  } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  try {
    // --- ШАГ 1: Пробуем найти пользователя ---
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Если пользователь уже есть — обновляем и выходим (Рефералка не срабатывает для старых)
    if (existingUser) {
      await supabase.from('users').update({
          username, first_name, last_name, language_code, timezone
        }).eq('telegram_id', telegram_id);
      
      return res.status(200).json({ status: 'ok', message: 'User updated' });
    }

    // --- ШАГ 2: Логика для НОВОГО пользователя ---
    let referredBy: number | null = null;
    let initialXp = 0;
    let referrerToReward: number | null = null;

    // Парсим реферальную ссылку
    if (start_param && start_param.startsWith('ref_')) {
      const refIdString = start_param.replace(/\D/g, ''); // Оставляем только цифры
      const referrerId = parseInt(refIdString, 10);

      if (!isNaN(referrerId) && referrerId !== telegram_id) {
        // Проверяем, существует ли тот, кто пригласил
        const { data: referrer } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('telegram_id', referrerId)
          .maybeSingle();

        if (referrer) {
          referredBy = referrerId;
          initialXp = 50; // Бонус новичку
          referrerToReward = referrerId; // Запоминаем, кого наградить
          console.log(`[REGISTER] Valid referral: ${telegram_id} invited by ${referrerId}`);
        }
      }
    }

    // --- ШАГ 3: Пытаемся создать (INSERT/UPSERT) ---
    // Use upsert with ignoreDuplicates to handle race conditions without 409 errors
    // .select() is required to check if we actually inserted a row
    const { data: insertedUser, error: upsertError } = await supabase
      .from('users')
      .upsert({
        telegram_id,
        username,
        first_name,
        last_name,
        language_code,
        timezone,
        referred_by: referredBy,
        xp: initialXp,
        level: 1,
        total_coins: 0,
        current_streak: 0
      }, { onConflict: 'telegram_id', ignoreDuplicates: true })
      .select();

    if (upsertError) throw upsertError;

    // --- ШАГ 4: Update Fallback (Explicit) ---
    // If no user inserted (duplicate) and no error, it means we hit a race condition or the user existed
    // We update metadata just in case.
    if (!insertedUser || insertedUser.length === 0) {
        await supabase.from('users').update({
            username, first_name, last_name, language_code, timezone
        }).eq('telegram_id', telegram_id);
    }

    // --- ШАГ 5: Награда пригласившему ---
    // Only reward if we actually inserted a new user (insertedUser array has items)
    // This prevents double rewarding in race conditions.
    if (referrerToReward && insertedUser && insertedUser.length > 0) {
      try {
        const { data: currentRef } = await supabase
          .from('users')
          .select('xp')
          .eq('telegram_id', referrerToReward)
          .single();

        if (currentRef) {
          const newXp = (currentRef.xp || 0) + 100;
          const newLevel = Math.floor(newXp / 100) + 1;
          
          await supabase.from('users')
            .update({ xp: newXp, level: newLevel })
            .eq('telegram_id', referrerToReward);
            
          console.log(`[REGISTER] Reward sent to referrer ${referrerToReward}`);
        }
      } catch (err) {
        console.error(`[REGISTER] Failed to reward referrer ${referrerToReward}`, err);
      }
    }

    return res.status(200).json({ status: 'ok', message: 'User processed' });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
