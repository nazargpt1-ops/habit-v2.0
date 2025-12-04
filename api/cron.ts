import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// Убираем пробелы
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

// Функция-помощник: Генерирует список минут для проверки (окно 10 минут)
// Пример: Если сейчас 14:10, вернет ["14:10", "14:11", ... "14:19"]
function getUserTimeWindow(userTimezone: string): string[] {
  try {
    const now = new Date();
    const times: string[] = [];

    // 1. Получаем текущее время в часовом поясе пользователя
    // Используем хак с toLocaleString, чтобы получить правильное смещение
    const userDateString = now.toLocaleString('en-US', { timeZone: userTimezone });
    const userDate = new Date(userDateString);

    // 2. Округляем минуты вниз до десятков (14:15 -> 14:10)
    const currentMinutes = userDate.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 10) * 10;
    userDate.setMinutes(roundedMinutes);
    userDate.setSeconds(0);

    // 3. Генерируем 10 минут вперед (чтобы поймать 14:12, 14:15 и т.д.)
    for (let i = 0; i < 10; i++) {
      const future = new Date(userDate);
      future.setMinutes(userDate.getMinutes() + i);
      
      const h = String(future.getHours()).padStart(2, '0');
      const m = String(future.getMinutes()).padStart(2, '0');
      times.push(`${h}:${m}`);
    }
    return times;
  } catch (e) {
    console.error(`Timezone error for ${userTimezone}:`, e);
    return [];
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // --- AUTH CHECK ---
  const authHeader = req.headers['authorization'] || '';
  const receivedToken = authHeader.replace('Bearer ', '').trim();

  if (receivedToken !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ------------------

  try {
    console.log(`⏰ CRON STARTED at ${new Date().toISOString()}`);

    // 1. Забираем ВСЕ активные привычки с напоминаниями
    // Используем .not('reminder_time', 'is', null) - это синтаксис Supabase
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*, users!inner(telegram_id, timezone)')
      .not('reminder_time', 'is', null) 
      .eq('is_archived', false);

    if (error) throw error;

    console.log(`📦 Loaded ${habits?.length || 0} potential habits.`);

    let sentCount = 0;

    if (habits && habits.length > 0) {
      // 2. Проверяем каждый habit ИНДИВИДУАЛЬНО
      for (const habit of habits) {
        const user = Array.isArray(habit.users) ? habit.users[0] : habit.users;
        
        if (!user || !user.telegram_id) continue;

        // Определяем зону пользователя (или UTC)
        const userTimezone = user.timezone || 'UTC';

        // Получаем "окно" времени для этого пользователя сейчас
        // Например: ["17:10", "17:11", ... "17:19"]
        const validTimes = getUserTimeWindow(userTimezone);

        // 3. Проверка: Входит ли время привычки в этот интервал?
        if (validTimes.includes(habit.reminder_time)) {
            console.log(`⚡ MATCH! Habit "${habit.title}" at ${habit.reminder_time} (User time: ${userTimezone})`);
            
            const text = `🔔 **Напоминание (${habit.reminder_time})**\nПора: **${habit.title}**!`;
            
            try {
              const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: user.telegram_id,
                  text: text,
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [[{ text: "✅ Готово", callback_data: `done_${habit.id}` }]]
                  }
                })
              });
              
              if (response.ok) sentCount++;
              else console.error(`Telegram Error for ${user.telegram_id}:`, await response.text());
              
            } catch (err) {
              console.error(`Fetch Error:`, err);
            }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      processed: habits?.length || 0,
      notifications_sent: sentCount
    });

  } catch (error: any) {
    console.error('CRON ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};
