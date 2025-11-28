import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key for backend operations if available, otherwise Anon Key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Security Check: Validate CRON_SECRET if it exists
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || !BOT_TOKEN) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  // 2. Initialize Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 3. Get Current UTC Time (HH:mm)
  // We match the "HH:mm" format stored in the database.
  // Note: This assumes users aligned their reminder times with UTC or the server logic matches their timezone expectation.
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  try {
    // 4. Query Database
    // Select all habits where reminder_time matches current time
    // We use !inner on users to ensure we only get habits with valid users that have a telegram_id
    const { data: habits, error } = await supabase
      .from('habits')
      .select(`
        id,
        title,
        reminder_time,
        users!inner (
          telegram_id,
          first_name
        )
      `)
      .eq('reminder_time', currentTime)
      .eq('is_archived', false);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (!habits || habits.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No habits found for this time.', 
        time: currentTime 
      });
    }

    // 5. Send Telegram Messages
    const notifications = await Promise.all(
      habits.map(async (habit: any) => {
        const user = habit.users;
        if (!user || !user.telegram_id) return null;

        const text = `🔔 Reminder: It's time for **${habit.title}**! \n\nMark it as done: 👇`;

        try {
          const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegram_id,
              text: text,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ Done", callback_data: `done_${habit.id}` }]
                ]
              }
            })
          });
          
          const result = await response.json();
          return { id: habit.id, success: result.ok };
        } catch (err) {
          console.error(`Failed to send to user ${user.telegram_id}`, err);
          return { id: habit.id, success: false, error: err };
        }
      })
    );

    const successful = notifications.filter((n) => n && n.success).length;

    return res.status(200).json({
      success: true,
      processed: successful,
      total: habits.length,
      time: currentTime
    });

  } catch (err: any) {
    console.error('Cron Error:', err);
    return res.status(500).json({ error: err.message });
  }
}