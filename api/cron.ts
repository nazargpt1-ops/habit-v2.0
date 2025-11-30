import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// Убираем пробелы, если они случайно попали в переменную
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

export default async (req: VercelRequest, res: VercelResponse) => {
  // 1. Умная проверка авторизации
  const authHeader = req.headers['authorization'] || '';
  
  // Вырезаем "Bearer " и пробелы, оставляем только сам пароль
  const receivedToken = authHeader.replace('Bearer ', '').trim();

  // ЛОГИРОВАНИЕ (Смотреть в Vercel Logs)
  console.log(`🔐 AUTH DEBUG:`);
  console.log(`   -> Received Token: "${receivedToken}"`);
  console.log(`   -> Server Secret:  "${CRON_SECRET}"`);

  // Если секрет на сервере пустой - значит переменная не загрузилась
  if (!CRON_SECRET) {
      console.error("❌ CRON_SECRET is missing in Vercel Environment Variables!");
      return res.status(500).json({ error: 'Server misconfiguration: CRON_SECRET missing' });
  }

  // Сравниваем чистые строки
  if (receivedToken !== CRON_SECRET) {
    console.error("⛔ Access Denied: Tokens do not match.");
    // Возвращаем детали ошибки, чтобы увидеть их в GitHub Actions
    return res.status(401).json({ 
        error: 'Unauthorized', 
        received: receivedToken, 
        expected_length: CRON_SECRET.length 
    });
  }

  try {
    const now = new Date();
    
    // 2. Округление до 10 минут
    const roundedMinutes = Math.floor(now.getUTCMinutes() / 10) * 10;
    
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(roundedMinutes).padStart(2, '0');
    const checkTimeUTC = `${hours}:${minutes}`;

    // 3. Расчет времени для MSK (UTC+3)
    const mskHourNum = (now.getUTCHours() + 3) % 24;
    const mskHours = String(mskHourNum).padStart(2, '0');
    const checkTimeMSK = `${mskHours}:${minutes}`;

    console.log(`⏰ CRON EXECUTION: Checking ${checkTimeUTC} (UTC) OR ${checkTimeMSK} (MSK)`);

    // 4. Поиск привычек в базе
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*, users(telegram_id)')
      .in('reminder_time', [checkTimeUTC, checkTimeMSK])
      .eq('is_archived', false);

    if (error) {
      console.error("DB Error:", error);
      throw error;
    }

    console.log(`🔎 Found ${habits?.length || 0} habits to notify`);

    // 5. Рассылка уведомлений
    let sent = 0;
    if (habits && habits.length > 0) {
      for (const habit of habits) {
        // @ts-ignore
        const telegramId = habit.users?.telegram_id;
        
        if (!telegramId) {
            console.log(`Skipping habit "${habit.title}" - No Telegram ID`);
            continue;
        }

        const text = `🔔 **Напоминание**\nПора: **${habit.title}**!`;
        
        try {
          const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: text,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: "✅ Готово", callback_data: `done_${habit.id}` }]]
              }
            })
          });
          
          if (response.ok) {
              console.log(`✅ Sent to ${telegramId}`);
              sent++;
          } else {
              const errText = await response.text();
              console.error(`❌ Telegram Error for ${telegramId}:`, errText);
          }
        } catch (err) {
          console.error(`Failed to send to ${telegramId}:`, err);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      checked: [checkTimeUTC, checkTimeMSK],
      found: habits?.length || 0,
      sent
    });

  } catch (error: any) {
    console.error('CRON FATAL ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};
