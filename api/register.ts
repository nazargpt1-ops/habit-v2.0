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

    // --- ШАГ 3: Пытаемся создать (INSERT) ---
    const { error: insertError } = await supabase
      .from('users')
      .insert({
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
      });

    // --- ШАГ 4: Обработка ошибок вставки ---
    if (insertError) {
      // Код 23505 = Дубликат ключа. Значит юзер успел создаться в параллельном запросе.
      if (insertError.code === '23505') {
        console.warn(`[REGISTER] Race condition detected for ${telegram_id}. Falling back to update.`);
        // Просто обновляем данные, но НЕ начисляем рефералку (так как юзер уже есть)
        await supabase.from('users').update({
            username, first_name, last_name, language_code, timezone
        }).eq('telegram_id', telegram_id);
        
        return res.status(200).json({ status: 'ok', message: 'User updated (fallback)' });
      }
      
      // Реальная ошибка
      throw insertError;
    }

    // --- ШАГ 5: Награда пригласившему (Только если вставка прошла успешно) ---
    if (referrerToReward) {
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
        // Не роняем запрос, если не удалось начислить бонус, так как юзер уже создан
      }
    }

    return res.status(200).json({ status: 'ok', message: 'User created successfully' });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
