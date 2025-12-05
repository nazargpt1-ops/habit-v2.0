import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server Configuration Error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  const { telegram_id, username, first_name, last_name, language_code, timezone, start_param } = req.body;

  if (!telegram_id) return res.status(400).json({ error: 'Missing telegram_id' });

  try {
    // 1. Сначала пробуем ОБНОВИТЬ существующего (так надежнее)
    const { data: existing, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username, first_name, last_name, language_code, timezone
      })
      .eq('telegram_id', telegram_id)
      .select();

    // Если обновление прошло успешно и вернуло данные — значит юзер есть, выходим
    if (existing && existing.length > 0) {
      return res.status(200).json({ status: 'updated', message: 'User exists' });
    }

    // 2. Если юзера нет — готовим данные для создания
    let referredBy: number | null = null;
    let initialXp = 0;

    if (start_param && start_param.startsWith('ref_')) {
      const refId = parseInt(start_param.replace(/\D/g, ''), 10);
      if (!isNaN(refId) && refId !== telegram_id) {
        const { data: referrer } = await supabaseAdmin
          .from('users').select('telegram_id, xp').eq('telegram_id', refId).maybeSingle();

        if (referrer) {
          referredBy = refId;
          initialXp = 50; 
          // Начисляем награду
          const newXp = (referrer.xp || 0) + 100;
          const newLevel = Math.floor(newXp / 100) + 1;
          await supabaseAdmin.from('users').update({ xp: newXp, level: newLevel }).eq('telegram_id', refId);
        }
      }
    }

    // 3. Пытаемся создать
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        telegram_id, username, first_name, last_name, language_code, timezone,
        referred_by: referredBy, xp: initialXp, level: 1, total_coins: 0, current_streak: 0
      });

    if (insertError) {
      // ЕСЛИ ОШИБКА 23505 (Дубликат) — игнорируем её и говорим "ОК"
      if (insertError.code === '23505') {
         console.log("User already exists (caught race condition)");
         return res.status(200).json({ status: 'ok', message: 'User already exists' });
      }
      throw insertError;
    }

    return res.status(200).json({ status: 'created' });

  } catch (error: any) {
    console.error('Register API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
