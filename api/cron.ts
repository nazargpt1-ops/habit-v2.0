import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

// Функция для получения массива времени (интервал 10 минут)
function getTenMinuteWindow(date: Date, offsetHours: number = 0): string[] {
  const times: string[] = [];
  
  // Копируем дату, чтобы не менять оригинал
  const baseTime = new Date(date);
  
  // Добавляем смещение (для MSK)
  baseTime.setUTCHours(baseTime.getUTCHours() + offsetHours);
  
  // Округляем вниз до ближайших 10 минут (18:14 -> 18:10)
  const currentMinutes = baseTime.getUTCMinutes();
  const roundedMinutes = Math.floor(currentMinutes / 10) * 10;
  baseTime.setUTCMinutes(roundedMinutes);
  
  // Генерируем 10-12 минут вперед (с запасом), чтобы покрыть весь интервал
  for (let i = 0; i < 12; i++) {
    const futureTime = new Date(baseTime);
    futureTime.setUTCMinutes(baseTime.getUTCMinutes() + i);
    
    const h = String(futureTime.getUTCHours()).padStart(2, '0');
    const m = String(futureTime.getUTCMinutes()).padStart(2, '0');
    times.push(`${h}:${m}`);
  }
  
  return times;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // 1. Защита
  const authHeader = req.headers['authorization'] || '';
  const receivedToken = authHeader.replace('Bearer ', '').trim();

  if (receivedToken !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();

    // 2. Генерируем "окно" времени
    // Получаем массив минут для UTC (0) и MSK (+3)
    // Например: ["14:10", "14:11", ... "14:19"] и ["17:10", "17:11", ... "17:19"]
    const timesUTC = getTenMinuteWindow(now, 0);
    const timesMSK = getTenMinuteWindow(now, 3);
    
    // Объединяем оба массива
    const allTimesToCheck = [...new Set([...timesUTC, ...timesMSK])];

    console.log(`⏰ CRON WINDOW: Checking habits set for:`, allTimesToCheck);

    // 3. Ищем в базе ЛЮБОЕ совпадение из списка
    // Используем фильтр .in(), так как у нас теперь точный список минут
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*, users(telegram_id)')
      .eq('is_archived', false)
      .in('reminder_time', allTimesToCheck); 

    if (error) {
      console.error("DB Error:", error);
      throw error;
    }

    console.log(`🔎 Found ${habits?.length || 0} habits.`);

    // 4. Рассылка
    let sent = 0;
    if (habits && habits.length > 0) {
      for (const habit of habits) {
        // @ts-ignore
        const telegramId = habit.users?.telegram_id;
        
        if (!telegramId) continue;

        // Добавим точное время в сообщение
        const text = `🔔 **Напоминание (${habit.reminder_time})**\nПора: **${habit.title}**!`;
        
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
          
          if (response.ok) sent++;
        } catch (err) {
          console.error(`Failed to send to ${telegramId}:`, err);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      window_checked: allTimesToCheck,
      found: habits?.length || 0,
      sent
    });

  } catch (error: any) {
    console.error('CRON ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};
