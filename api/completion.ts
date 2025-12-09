import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-telegram-id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const telegramId = req.headers['x-telegram-id'];
  if (!telegramId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // --- POST: Toggle Completion ---
    if (req.method === 'POST') {
      const { habitId, date, isCompleted, note } = req.body;
      const userId = telegramId;
      const dateKey = date; // Expecting YYYY-MM-DD

      // 1. Get Habit Info
      const { data: habit } = await supabase.from('habits').select('coins_reward').eq('id', habitId).single();
      const reward = habit?.coins_reward || 10;
      const xpReward = 10;

      // 2. Fetch User Info for Updates
      const { data: user } = await supabase.from('users').select('total_coins, xp, level').eq('telegram_id', userId).single();
      let newBadge: string | null = null;
      let newId: string | undefined;

      if (isCompleted) {
        // --- ADD COMPLETION ---
        const potentialBadges: string[] = [];
        
        // Check Early Bird
        const now = new Date();
        // Convert to rough user time if possible, or use server time
        if (now.getHours() < 8) potentialBadges.push('early_bird');

        // Check duplicates
        const { data: existing } = await supabase.from('completions').select('id').eq('habit_id', habitId).eq('date', dateKey).maybeSingle();
        
        if (!existing) {
            const { data: inserted, error: insertError } = await supabase
              .from('completions')
              .insert({ 
                  habit_id: habitId, 
                  user_id: userId, 
                  date: dateKey, 
                  note,
                  completed_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (insertError) throw insertError;
            newId = inserted.id;

            // Update User Stats
            const oldLevel = user?.level || 1;
            const newCoins = (user?.total_coins || 0) + reward;
            const newXP = (user?.xp || 0) + xpReward;
            const newLevel = Math.floor(newXP / 100) + 1;

            await supabase.from('users').update({ total_coins: newCoins, xp: newXP, level: newLevel }).eq('telegram_id', userId);

            // Badge Check: Level 5
            if (oldLevel < 5 && newLevel >= 5) potentialBadges.push('level_5');

            // Badge Check: Counts & Streaks
            // Need all user completion dates
            const { data: userCompletions } = await supabase.from('completions').select('date').eq('user_id', userId);
            const dates = (userCompletions || []).map((c: any) => c.date);
            const count = dates.length;
            
            // Calc Global Streak
            const uniqueDates = Array.from(new Set(dates)).sort((a: any, b: any) => b.localeCompare(a));
            let streak = 0;
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
                let currentCheck = new Date();
                if (uniqueDates[0] !== todayStr) currentCheck.setDate(currentCheck.getDate() - 1);
                for (const d of uniqueDates) {
                    if (d === currentCheck.toISOString().split('T')[0]) {
                        streak++;
                        currentCheck.setDate(currentCheck.getDate() - 1);
                    } else break;
                }
            }

            if (count === 1) potentialBadges.push('first_step');
            if (streak === 7) potentialBadges.push('week_streak');

            // Priority Logic
            if (potentialBadges.includes('level_5')) newBadge = 'level_5';
            else if (potentialBadges.includes('week_streak')) newBadge = 'week_streak';
            else if (potentialBadges.includes('first_step')) newBadge = 'first_step';
            else if (potentialBadges.includes('early_bird')) newBadge = 'early_bird';
        } else {
            newId = existing.id;
        }

        return res.status(200).json({ success: true, newId, coinsEarned: reward, newBadge });

      } else {
        // --- REMOVE COMPLETION ---
        await supabase.from('completions').delete().eq('habit_id', habitId).eq('date', dateKey);
        
        // Revert Stats
        if (user) {
            const newCoins = Math.max(0, (user.total_coins || 0) - reward);
            const newXP = Math.max(0, (user.xp || 0) - xpReward);
            const newLevel = Math.floor(newXP / 100) + 1;
            await supabase.from('users').update({ total_coins: newCoins, xp: newXP, level: newLevel }).eq('telegram_id', userId);
        }

        return res.status(200).json({ success: true, coinsEarned: -reward, newBadge: null });
      }
    }

    // --- PATCH: Update Note ---
    if (req.method === 'PATCH') {
        const { completionId, note } = req.body;
        const { error } = await supabase.from('completions').update({ note }).eq('id', completionId);
        if (error) throw error;
        return res.status(200).json({ success: true });
    }

    // --- GET: Fetch History for a Habit ---
    if (req.method === 'GET') {
        const { habitId } = req.query;
        if (!habitId) return res.status(400).json({ error: 'Missing habitId' });

        const { data } = await supabase
            .from('completions')
            .select('*')
            .eq('habit_id', habitId)
            .order('date', { ascending: false });
        
        return res.status(200).json(data || []);
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
