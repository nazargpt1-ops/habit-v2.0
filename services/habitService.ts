
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Habit, Completion, HabitWithCompletion, Priority, User } from '../types';
import { formatDateKey } from '../lib/utils';

const TEST_USER_ID = 99999999;
let hasVerifiedUser = false;

// --- HELPERS ---

export const getCurrentUserId = (): number | string => {
  let userId: number | string = TEST_USER_ID;
  
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  }
  
  return userId;
};

/**
 * Calculates the current global streak based on a list of date strings.
 * Assumes dates are YYYY-MM-DD.
 */
const calculateGlobalStreakFromDates = (dates: string[]): number => {
  if (!dates || dates.length === 0) return 0;
  
  // Sort descending
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  
  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  // Check if streak is alive (latest completion must be today or yesterday)
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentCheckDate = new Date();
  
  // If latest is yesterday, start checking from yesterday
  if (uniqueDates[0] !== todayStr) {
     currentCheckDate.setDate(currentCheckDate.getDate() - 1);
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    const checkStr = formatDateKey(currentCheckDate);
    if (uniqueDates.includes(checkStr)) {
      streak++;
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calculates the current streak based on completion history for a single habit.
 */
const calculateStreak = (completions: Completion[]): number => {
  if (!completions || completions.length === 0) return 0;
  const dates = completions.map(c => c.date);
  return calculateGlobalStreakFromDates(dates);
};

// --- CORE SERVICE ---

export const ensureUserExists = async (): Promise<boolean> => {
  if (hasVerifiedUser) return true;
  if (!isSupabaseConfigured || !supabase) return true;

  const userId = getCurrentUserId();
  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;

  const userData = {
    telegram_id: userId,
    username: tgUser?.username || `user_${userId}`,
    first_name: tgUser?.first_name || 'Unknown',
    last_name: tgUser?.last_name || '',
    language_code: tgUser?.language_code || 'en'
  };

  try {
    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'telegram_id' });

    if (error) return false;

    hasVerifiedUser = true;
    return true;
  } catch (err) {
    return false;
  }
};

export const fetchUserProfile = async (): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const userId = getCurrentUserId();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Returns new level after update
 */
const updateUserGamification = async (coinAmount: number, xpAmount: number): Promise<{ oldLevel: number, newLevel: number }> => {
  if (!isSupabaseConfigured || !supabase) return { oldLevel: 1, newLevel: 1 };
  const userId = getCurrentUserId();

  try {
    const { data: user } = await supabase
      .from('users')
      .select('total_coins, xp, level')
      .eq('telegram_id', userId)
      .single();

    if (!user) return { oldLevel: 1, newLevel: 1 };

    const oldLevel = user.level || 1;
    let newCoins = (user.total_coins || 0) + coinAmount;
    if (newCoins < 0) newCoins = 0;

    let newXP = (user.xp || 0) + xpAmount;
    if (newXP < 0) newXP = 0;

    const newLevel = Math.floor(newXP / 100) + 1;

    await supabase
      .from('users')
      .update({ 
        total_coins: newCoins,
        xp: newXP,
        level: newLevel
      })
      .eq('telegram_id', userId);
      
    return { oldLevel, newLevel };
  } catch (err) {
    console.error("Failed to update gamification stats:", err);
    return { oldLevel: 1, newLevel: 1 };
  }
};

export const fetchHabitsWithCompletions = async (date: Date): Promise<HabitWithCompletion[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    const userId = getCurrentUserId();
    await ensureUserExists();

    const dateKey = formatDateKey(date);

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (habitsError) throw habitsError;
    if (!habits || habits.length === 0) return [];

    const habitIds = habits.map(h => h.id);
    const { data: completions, error: completionsError } = await supabase
      .from('completions')
      .select('*')
      .in('habit_id', habitIds);

    if (completionsError) throw completionsError;

    return habits.map((habit: Habit) => {
      const habitCompletions = completions?.filter(c => c.habit_id === habit.id) || [];
      const todayCompletion = habitCompletions.find(c => c.date === dateKey);
      
      return {
        ...habit,
        completed: !!todayCompletion,
        completionId: todayCompletion?.id,
        todayNote: todayCompletion?.note,
        currentStreak: calculateStreak(habitCompletions)
      };
    });

  } catch (err) {
    return [];
  }
};

export const fetchHabitHistory = async (habitId: string): Promise<Completion[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase.from('completions').select('*').eq('habit_id', habitId).order('date', { ascending: false });
  return data || [];
};

export const createHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]): Promise<Habit | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const userId = getCurrentUserId();
    await ensureUserExists();
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title, category, priority, color, icon: 'star',
        reminder_time: reminderTime, reminder_date: reminderDate, reminder_days: reminderDays,
        is_archived: false, coins_reward: 10
      })
      .select().single();
    if (error) throw error;
    return data;
  } catch (err) { return null; }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('habits').update(updates).eq('id', habitId);
    if (error) throw error;
    return true;
  } catch (err) { return false; }
};

export const deleteHabit = async (habitId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) throw error;
    return true;
  } catch (err) { return false; }
};

/**
 * Detects stats to see if a badge should be unlocked.
 */
const checkBadgeConditions = async (userId: string | number): Promise<{ count: number, streak: number }> => {
    if (!supabase) return { count: 0, streak: 0 };
    
    // Fetch all completions dates for user
    const { data } = await supabase
        .from('completions')
        .select('date')
        .eq('user_id', userId);
        
    const dates = (data || []).map(d => d.date);
    const count = dates.length;
    const streak = calculateGlobalStreakFromDates(dates);
    
    return { count, streak };
};

/**
 * Toggles completion status and handles coin rewards AND badge detection.
 */
export const toggleHabitCompletion = async (
  habitId: string, 
  date: Date, 
  isCompleted: boolean, 
  existingCompletionId?: string, 
  note?: string
): Promise<{ success: boolean, newId?: string, coinsEarned?: number, newBadge?: string | null }> => {
  if (!isSupabaseConfigured || !supabase) return { success: false };

  const dateKey = formatDateKey(date);
  const userId = getCurrentUserId();
  let newBadge: string | null = null;

  try {
    const { data: habit } = await supabase.from('habits').select('coins_reward').eq('id', habitId).single();
    const reward = habit?.coins_reward || 10;
    const xpReward = 10;

    if (isCompleted) {
      // Collect potential badges triggered by this action
      const potentialBadges: string[] = [];

      // 1. Check Early Bird (Time based action)
      // "Did user complete a habit before 8am?"
      if (new Date().getHours() < 8) {
          potentialBadges.push('early_bird');
      }

      // 2. Perform Insert
      const { data: existing } = await supabase.from('completions').select('id').eq('habit_id', habitId).eq('date', dateKey).maybeSingle();
      if (existing) return { success: true, newId: existing.id, coinsEarned: 0 };

      const { data, error } = await supabase
        .from('completions')
        .insert({ 
            habit_id: habitId, user_id: userId, date: dateKey, note,
            completed_at: new Date().toISOString()
        })
        .select().single();
      
      if (error) throw error;
      const newId = data.id;

      // 3. Update XP & Check Level Badge
      const { oldLevel, newLevel } = await updateUserGamification(reward, xpReward);
      if (oldLevel < 5 && newLevel >= 5) {
          potentialBadges.push('level_5');
      }

      // 4. Check Stats Badges (Count & Streak)
      const { count, streak } = await checkBadgeConditions(userId);
      
      // "First Step": Total went from 0 to 1
      if (count === 1) potentialBadges.push('first_step');
      
      // "On Fire": Streak reached 7
      if (streak === 7) potentialBadges.push('week_streak');

      // 5. Priority Selection
      // If multiple trigger, we return one based on priority: Level > Streak > First Step > Early Bird
      if (potentialBadges.includes('level_5')) newBadge = 'level_5';
      else if (potentialBadges.includes('week_streak')) newBadge = 'week_streak';
      else if (potentialBadges.includes('first_step')) newBadge = 'first_step';
      else if (potentialBadges.includes('early_bird')) newBadge = 'early_bird';

      return { success: true, newId, coinsEarned: reward, newBadge };

    } else {
      // Undo completion
      if (!existingCompletionId) {
          await supabase.from('completions').delete().eq('habit_id', habitId).eq('date', dateKey);
      } else {
          await supabase.from('completions').delete().eq('id', existingCompletionId);
      }
      
      await updateUserGamification(-reward, -xpReward);
      return { success: true, coinsEarned: -reward, newBadge: null };
    }
  } catch (err) {
    console.error("[HabitService] Error toggling completion:", err);
    return { success: false };
  }
};

export const updateCompletionNote = async (completionId: string, note: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('completions').update({ note }).eq('id', completionId);
};

export const fetchWeeklyStats = async (): Promise<{ day: string; count: number }[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  const userId = getCurrentUserId();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const startDateStr = formatDateKey(sevenDaysAgo);

  try {
    await ensureUserExists();
    const { data: completions } = await supabase
      .from('completions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDateStr);

    const counts: Record<string, number> = {};
    (completions || []).forEach(c => {
        counts[c.date] = (counts[c.date] || 0) + 1;
    });

    const result = [];
    for(let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const k = formatDateKey(d);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
        result.push({ day: dayName, count: counts[k] || 0 });
    }
    return result;
  } catch (err) { return []; }
};

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export const fetchHeatmapData = async (): Promise<{ heatmap: HeatmapData[], totalCompletions: number, currentStreak: number }> => {
  if (!isSupabaseConfigured || !supabase) return { heatmap: [], totalCompletions: 0, currentStreak: 0 };

  try {
      const userId = getCurrentUserId();
      await ensureUserExists();

      // Optimize: Fetch only dates
      const { data: completions } = await supabase
        .from('completions')
        .select('date')
        .eq('user_id', userId);
      
      const safeCompletions = completions || [];
      const dates = safeCompletions.map(c => c.date);
      const counts: Record<string, number> = {};
      dates.forEach(d => { counts[d] = (counts[d] || 0) + 1; });

      const heatmap: HeatmapData[] = [];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364);

      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
           const key = formatDateKey(d);
           const count = counts[key] || 0;
           let level = 0;
           if (count === 0) level = 0; else if (count <= 1) level = 1; else if (count <= 2) level = 2; else if (count <= 3) level = 3; else level = 4;
           heatmap.push({ date: key, count, level });
      }

      const currentStreak = calculateGlobalStreakFromDates(dates);

      return { 
          heatmap, 
          totalCompletions: safeCompletions.length, 
          currentStreak 
      };

  } catch (err) {
      return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  }
};

export interface RPGStat {
  subject: string;
  A: number;
  fullMark: number;
}

export const fetchRPGStats = async (): Promise<RPGStat[]> => {
  // Return Mock data if Supabase is not configured to let user see UI
  if (!isSupabaseConfigured || !supabase) {
    return [
      { subject: 'VIT', A: 45, fullMark: 100 },
      { subject: 'INT', A: 70, fullMark: 100 },
      { subject: 'DIS', A: 30, fullMark: 100 },
      { subject: 'CHA', A: 60, fullMark: 100 },
      { subject: 'WIS', A: 25, fullMark: 100 },
      { subject: 'STA', A: 80, fullMark: 100 },
    ];
  }

  const userId = getCurrentUserId();

  // Mapping from our categories to RPG Stats
  const categoryMap: Record<string, string> = {
    'Health': 'VIT',     // Vitality
    'Mind': 'INT',       // Intellect
    'Mindfulness': 'INT',
    'Work': 'DIS',       // Discipline
    'Social': 'CHA',     // Charisma
    'Growth': 'WIS',     // Wisdom
    'Energy': 'STA',     // Stamina
  };

  const scores: Record<string, number> = {
    'VIT': 0, 'INT': 0, 'DIS': 0, 'CHA': 0, 'WIS': 0, 'STA': 0
  };

  try {
    // 1. Fetch completions and join with habit details to get category
    const { data: completions, error } = await supabase
      .from('completions')
      .select('habit_id, habits (category)')
      .eq('user_id', userId);

    if (error) throw error;

    // 2. Aggregate scores
    if (completions) {
      completions.forEach((item: any) => {
        const habitData = Array.isArray(item.habits) ? item.habits[0] : item.habits;
        const cat = habitData?.category || '';
        
        let stat = categoryMap[cat];
        
        // Fallback for case-insensitive or slight variations
        if (!stat) {
           if (cat.toLowerCase().includes('health')) stat = 'VIT';
           else if (cat.toLowerCase().includes('mind')) stat = 'INT';
           else if (cat.toLowerCase().includes('work')) stat = 'DIS';
           else if (cat.toLowerCase().includes('social')) stat = 'CHA';
           else if (cat.toLowerCase().includes('growth')) stat = 'WIS';
           else if (cat.toLowerCase().includes('energy')) stat = 'STA';
        }

        if (stat && scores[stat] !== undefined) {
          scores[stat] += 1; // Increment by 1 per completion. Logic can be adjusted for difficulty.
        }
      });
    }

    // 3. Format for Recharts
    const order = ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'];
    
    // Determine dynamic fullMark (max value + buffer)
    const maxVal = Math.max(...Object.values(scores), 1); 
    const fullMark = Math.ceil(maxVal * 1.2); 

    return order.map(subject => ({
      subject,
      A: scores[subject],
      fullMark: fullMark < 10 ? 10 : fullMark // Minimum scale of 10
    }));

  } catch (err) {
    console.error("Error fetching RPG stats:", err);
    return ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'].map(s => ({ subject: s, A: 0, fullMark: 10 }));
  }
};
