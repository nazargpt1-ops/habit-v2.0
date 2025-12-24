import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-telegram-id');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const telegramId = req.headers['x-telegram-id'];
  if (!telegramId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // --- GET: Fetch Habits (optionally with completions for a date) ---
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      const { date } = req.query; // YYYY-MM-DD

      // 1. Fetch Habits
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', telegramId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;
      if (!habits || habits.length === 0) return res.status(200).json([]);

      // 2. If date is provided, fetch completions for that date
      let result = habits;
      if (date) {
        const habitIds = habits.map(h => h.id);
        const { data: completions, error: compError } = await supabase
          .from('completions')
          .select('*')
          .in('habit_id', habitIds)
          .eq('date', date); // Filter by specific date

        if (compError) throw compError;

        const { data: allCompletions } = await supabase
           .from('completions')
           .select('habit_id, date')
           .in('habit_id', habitIds);

        result = habits.map((habit: any) => {
            const habitCompletions = allCompletions?.filter((c: any) => c.habit_id === habit.id) || [];
            const todayCompletion = completions?.find((c: any) => c.habit_id === habit.id);
            
            const sortedDates = habitCompletions.map((c: any) => c.date).sort((a: string, b: string) => b.localeCompare(a));
            let streak = 0;
            if (sortedDates.length > 0) {
                 const todayStr = new Date().toISOString().split('T')[0];
                 const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                 const yesterdayStr = yesterday.toISOString().split('T')[0];
                 
                 if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
                    let currentCheck = new Date();
                    if (sortedDates[0] !== todayStr) currentCheck.setDate(currentCheck.getDate() - 1);

                    for (const d of sortedDates) {
                        if (d === currentCheck.toISOString().split('T')[0]) {
                            streak++;
                            currentCheck.setDate(currentCheck.getDate() - 1);
                        } else {
                            break;
                        }
                    }
                 }
            }

            return {
                ...habit,
                completed: !!todayCompletion,
                completionId: todayCompletion?.id,
                todayNote: todayCompletion?.note,
                currentStreak: streak
            };
        });
      }

      return res.status(200).json(result);
    }

    // --- POST: Create Habit ---
    if (req.method === 'POST') {
      const { title, category, priority, color, reminder_time, reminder_date, reminder_days } = req.body;
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: telegramId,
          title, category, priority, color, icon: 'star',
          reminder_time, reminder_date, reminder_days,
          is_archived: false, coins_reward: 10
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // --- PATCH: Update Habit ---
    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', telegramId); // Security check

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // --- DELETE: Delete Habit ---
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
        .eq('user_id', telegramId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
