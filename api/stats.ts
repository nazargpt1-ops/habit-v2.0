import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-telegram-id');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const telegramId = req.headers['x-telegram-id'];
  if (!telegramId) return res.status(401).json({ error: 'Unauthorized' });

  const { type } = req.query; // 'weekly', 'heatmap', 'rpg'

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    // 1. Weekly Stats
    if (type === 'weekly') {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

        const { data: completions } = await supabase
            .from('completions')
            .select('date')
            .eq('user_id', telegramId)
            .gte('date', startDateStr);

        const counts: Record<string, number> = {};
        (completions || []).forEach((c: any) => {
            counts[c.date] = (counts[c.date] || 0) + 1;
        });

        const result = [];
        for(let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const k = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
            result.push({ day: dayName, count: counts[k] || 0 });
        }
        return res.status(200).json(result);
    }

    // 2. Heatmap & Global Streak
    if (type === 'heatmap') {
        const { data: completions } = await supabase
            .from('completions')
            .select('date')
            .eq('user_id', telegramId);
        
        const safeCompletions = completions || [];
        const dates = safeCompletions.map((c: any) => c.date);
        const counts: Record<string, number> = {};
        dates.forEach((d: string) => { counts[d] = (counts[d] || 0) + 1; });

        const heatmap: any[] = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 364);

        const formatKey = (d: Date) => d.toISOString().split('T')[0];

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const key = formatKey(d);
            const count = counts[key] || 0;
            let level = 0;
            if (count === 0) level = 0; else if (count <= 1) level = 1; else if (count <= 2) level = 2; else if (count <= 3) level = 3; else level = 4;
            heatmap.push({ date: key, count, level });
        }

        const uniqueDates = Array.from(new Set(dates)).sort((a: any, b: any) => b.localeCompare(a));
        let streak = 0;
        const todayStr = formatKey(new Date());
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatKey(yesterday);

        if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
            let currentCheck = new Date();
            if (uniqueDates[0] !== todayStr) currentCheck.setDate(currentCheck.getDate() - 1);
            for (const d of uniqueDates) {
                if (d === formatKey(currentCheck)) {
                    streak++;
                    currentCheck.setDate(currentCheck.getDate() - 1);
                } else break;
            }
        }

        return res.status(200).json({ 
            heatmap, 
            totalCompletions: safeCompletions.length, 
            currentStreak: streak 
        });
    }

    // 3. RPG Stats
    if (type === 'rpg') {
        const categoryMap: Record<string, string> = {
            'health': 'VIT', 'mind': 'INT', 'mindfulness': 'INT', 
            'work': 'DIS', 'social': 'CHA', 'growth': 'WIS', 'energy': 'STA'
        };
        const scores: Record<string, number> = { 'VIT': 0, 'INT': 0, 'DIS': 0, 'CHA': 0, 'WIS': 0, 'STA': 0 };

        const { data: completions } = await supabase
            .from('completions')
            .select('habit_id, habit:habits(category)')
            .eq('user_id', telegramId);

        if (completions) {
            completions.forEach((item: any) => {
                const habitData = Array.isArray(item.habit) ? item.habit[0] : item.habit;
                if (habitData && habitData.category) {
                    const catLower = habitData.category.toLowerCase().trim();
                    const statKey = categoryMap[catLower];
                    if (statKey) scores[statKey] += 1;
                    else {
                        if (catLower.includes('health')) scores['VIT']++;
                        else if (catLower.includes('mind')) scores['INT']++;
                        else if (catLower.includes('work')) scores['DIS']++;
                        else if (catLower.includes('social')) scores['CHA']++;
                        else if (catLower.includes('growth')) scores['WIS']++;
                        else if (catLower.includes('energy')) scores['STA']++;
                    }
                }
            });
        }

        const order = ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'];
        const maxVal = Math.max(...Object.values(scores), 0); 
        const fullMark = Math.max(Math.ceil(maxVal * 1.2), 10);

        const result = order.map(subject => ({ subject, A: scores[subject], fullMark }));
        return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
