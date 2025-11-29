const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
  // Security check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const roundedMinutes = Math.floor(now.getUTCMinutes() / 10) * 10;
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(roundedMinutes).padStart(2, '0');
    const checkTimeUTC = `${hours}:${minutes}`;
    const mskHourNum = (now.getUTCHours() + 3) % 24;
    const mskHours = String(mskHourNum).padStart(2, '0');
    const checkTimeMSK = `${mskHours}:${minutes}`;

    console.log(`CRON: Checking for habits at ${checkTimeUTC} (UTC) or ${checkTimeMSK} (MSK)`);

    const { data: habits, error } = await supabase
      .from('habits')
      .select('*, users(telegram_id)')
      .in('reminder_time', [checkTimeUTC, checkTimeMSK])
      .eq('is_archived', false);

    if (error) throw error;
    console.log(`Found ${habits?.length || 0} habits to notify`);

    let sent = 0;
    if (habits && habits.length > 0) {
      for (const habit of habits) {
        const telegramId = habit.users?.telegram_id;
        if (!telegramId) continue;

        const text = `🔔 Напоминание\nПора: ${habit.title}!`;
        try {
          const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: text,
              parse_mode: 'Markdown'
            })
          });
          if (response.ok) sent++;
        } catch (err) {
          console.error(`Failed to send to ${telegramId}:`, err);
        }
      }
    }

    return res.status(200).json({ ok: true, checked: [checkTimeUTC, checkTimeMSK], found: habits?.length, sent });
  } catch (error) {
    console.error('CRON ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};
