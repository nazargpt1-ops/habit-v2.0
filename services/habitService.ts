import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Habit, Completion, HabitWithCompletion, Priority, User } from '../types';
import { formatDateKey } from '../lib/utils';

const TEST_USER_ID = 99999999;
// Simple in-memory cache to avoid hitting the DB for user verification on every single request
let hasVerifiedUser = false;

// --- HELPERS ---

/**
 * Gets the current user ID.
 * Prioritizes Telegram WebApp ID, falls back to static test ID for development.
 */
export const getCurrentUserId = (): number | string => {
  let userId: number | string = TEST_USER_ID;
  
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    userId = window.Telegram.WebApp.initDataUnsafe.user.id;
    console.log("[HabitService] Detected Telegram User ID:", userId);
  } else {
    console.log("[HabitService] No Telegram detected. Using Test User ID:", userId);
  }
  
  return userId;
};

/**
 * Calculates the current streak based on completion history.
 */
const calculateStreak = (completions: Completion[]): number => {
  if (!completions || completions.length === 0) return 0;

  const sortedDates = completions
    .map(c => c.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const uniqueDates = Array.from(new Set(sortedDates));
  if (uniqueDates.length === 0) return 0;

  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  const lastCompletion = uniqueDates[0];
  if (lastCompletion !== todayStr && lastCompletion !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentCheckDate = new Date();

  if (lastCompletion !== todayStr) {
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

// --- CORE SERVICE ---

/**
 * Ensures the user exists in the 'users' table.
 * Should be called internally by other service functions.
 */
export const ensureUserExists = async (): Promise<boolean> => {
  if (hasVerifiedUser) return true;
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[HabitService] Supabase not configured. Skipping user check.");
    return true; // Proceed for mock mode logic if needed
  }

  const userId = getCurrentUserId();
  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;

  // Prepare user data for Upsert
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

    if (error) {
      console.error("[HabitService] Error ensuring user exists (Upsert failed):", error);
      return false;
    }

    hasVerifiedUser = true;
    return true;
  } catch (err) {
    console.error("[HabitService] Critical exception in ensureUserExists:", err);
    return false;
  }
};

/**
 * Fetches the current user's profile stats (coins, etc).
 */
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
    console.error("[HabitService] Error fetching user profile:", err);
    return null;
  }
};

/**
 * Helper to safely update coins and XP for the current user.
 * Handles Level up logic (100 XP per level).
 */
const updateUserGamification = async (coinAmount: number, xpAmount: number) => {
  if (!isSupabaseConfigured || !supabase) return;
  const userId = getCurrentUserId();

  try {
    // 1. Get current stats
    const { data: user } = await supabase
      .from('users')
      .select('total_coins, xp, level')
      .eq('telegram_id', userId)
      .single();

    if (!user) return;

    // 2. Calculate new values
    let newCoins = (user.total_coins || 0) + coinAmount;
    if (newCoins < 0) newCoins = 0;

    let newXP = (user.xp || 0) + xpAmount;
    if (newXP < 0) newXP = 0;

    // Level Logic: 100 XP = 1 Level. Level starts at 1.
    const newLevel = Math.floor(newXP / 100) + 1;

    // 3. Update DB
    await supabase
      .from('users')
      .update({ 
        total_coins: newCoins,
        xp: newXP,
        level: newLevel
      })
      .eq('telegram_id', userId);
      
  } catch (err) {
    console.error("[HabitService] Failed to update gamification stats:", err);
  }
};

/**
 * Fetches habits and links them with today's completion status.
 */
export const fetchHabitsWithCompletions = async (date: Date): Promise<HabitWithCompletion[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    const userId = getCurrentUserId();
    await ensureUserExists();

    const dateKey = formatDateKey(date);

    // 1. Fetch Habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (habitsError) {
        console.error("[HabitService] Error fetching habits:", habitsError);
        throw habitsError;
    }
    if (!habits || habits.length === 0) return [];

    // 2. Fetch Completions
    const habitIds = habits.map(h => h.id);
    const { data: completions, error: completionsError } = await supabase
      .from('completions')
      .select('*')
      .in('habit_id', habitIds);

    if (completionsError) throw completionsError;

    // 3. Map Data
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
    console.error("[HabitService] fetchHabitsWithCompletions failed:", err);
    return [];
  }
};

/**
 * Fetches raw completion history for a specific habit.
 */
export const fetchHabitHistory = async (habitId: string): Promise<Completion[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  
  const { data } = await supabase
    .from('completions')
    .select('*')
    .eq('habit_id', habitId)
    .order('date', { ascending: false });
    
  return data || [];
};

/**
 * Creates a new habit in the database.
 */
export const createHabit = async (
  title: string, 
  priority: Priority, 
  color: string, 
  category: string, 
  reminderTime?: string, 
  reminderDate?: string,
  reminderDays?: string[]
): Promise<Habit | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const userId = getCurrentUserId();
    await ensureUserExists();

    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title,
        category,
        priority,
        color,
        icon: 'star',
        reminder_time: reminderTime,
        reminder_date: reminderDate,
        reminder_days: reminderDays,
        is_archived: false,
        coins_reward: 10 // Default reward
      })
      .select()
      .single();
    
    if (error) {
        console.error("[HabitService] Supabase Error creating habit:", error);
        throw error;
    }
    return data;
  } catch (err) {
    console.error("[HabitService] Exception creating habit:", err);
    return null;
  }
};

/**
 * Updates an existing habit.
 */
export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', habitId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[HabitService] Error updating habit:", err);
    return false;
  }
};

/**
 * Deletes a habit.
 */
export const deleteHabit = async (habitId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[HabitService] Error deleting habit:", err);
    return false;
  }
};

/**
 * Toggles completion status and handles coin rewards.
 */
export const toggleHabitCompletion = async (
  habitId: string, 
  date: Date, 
  isCompleted: boolean, 
  existingCompletionId?: string, 
  note?: string
): Promise<{ success: boolean, newId?: string, coinsEarned?: number }> => {
  if (!isSupabaseConfigured || !supabase) return { success: false };

  // Note: We don't check ensureUserExists here for speed, assuming fetching habits worked.
  const dateKey = formatDateKey(date);

  try {
    // 1. Fetch habit to know the reward amount
    const { data: habit } = await supabase
        .from('habits')
        .select('coins_reward')
        .eq('id', habitId)
        .single();
    
    const reward = habit?.coins_reward || 10;
    const xpReward = 10; // Fixed XP per habit for now

    if (isCompleted) {
      // Check existing to prevent duplicates
      const { data: existing } = await supabase
         .from('completions')
         .select('id')
         .eq('habit_id', habitId)
         .eq('date', dateKey)
         .maybeSingle();

      if (existing) return { success: true, newId: existing.id, coinsEarned: 0 };

      const { data, error } = await supabase
        .from('completions')
        .insert({ 
            habit_id: habitId, 
            date: dateKey, 
            note,
            completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;

      // Award Coins & XP
      await updateUserGamification(reward, xpReward);

      return { success: true, newId: data.id, coinsEarned: reward };
    } else {
      // Undo completion
      if (!existingCompletionId) {
          // Fallback delete by composite key
          const { error: deleteError } = await supabase
            .from('completions')
            .delete()
            .eq('habit_id', habitId)
            .eq('date', dateKey);
          
          if (deleteError) throw deleteError;
      } else {
          const { error } = await supabase
            .from('completions')
            .delete()
            .eq('id', existingCompletionId);
          
          if (error) throw error;
      }
      
      // Deduct Coins & XP
      await updateUserGamification(-reward, -xpReward);

      return { success: true, coinsEarned: -reward };
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

// --- STATISTICS SERVICES ---

export const fetchWeeklyStats = async (): Promise<{ day: string; count: number }[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  const userId = getCurrentUserId();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const startDateStr = formatDateKey(sevenDaysAgo);

  try {
    await ensureUserExists();

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);

    if (!habits || habits.length === 0) return [];
    
    const habitIds = habits.map(h => h.id);

    const { data: completions } = await supabase
      .from('completions')
      .select('date')
      .in('habit_id', habitIds)
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

  } catch (err) {
    console.error("[HabitService] Error fetching weekly stats:", err);
    return [];
  }
};

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export const fetchHeatmapData = async (): Promise<{ heatmap: HeatmapData[], totalCompletions: number, currentStreak: number }> => {
  if (!isSupabaseConfigured || !supabase) {
      return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  }

  try {
      const userId = getCurrentUserId();
      await ensureUserExists();

      // 1. Habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId);
      
      if (!habits || habits.length === 0) {
          return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
      }
      
      const habitIds = habits.map(h => h.id);

      // 2. All Completions
      const { data: completions } = await supabase
        .from('completions')
        .select('date')
        .in('habit_id', habitIds);
      
      const safeCompletions = completions || [];

      // 3. Aggregate
      const counts: Record<string, number> = {};
      
      safeCompletions.forEach(c => {
          counts[c.date] = (counts[c.date] || 0) + 1;
      });

      // 4. Build Heatmap (Last 365 Days)
      const heatmap: HeatmapData[] = [];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364);

      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
           const key = formatDateKey(d);
           const count = counts[key] || 0;
           
           let level = 0;
           if (count === 0) level = 0;
           else if (count <= 1) level = 1;
           else if (count <= 2) level = 2;
           else if (count <= 3) level = 3;
           else level = 4;

           heatmap.push({ date: key, count, level });
      }

      // 5. Global Streak
      let currentStreak = 0;
      let checkDate = new Date(today);
      let checkKey = formatDateKey(checkDate);
      
      if (!counts[checkKey]) {
          checkDate.setDate(checkDate.getDate() - 1);
          checkKey = formatDateKey(checkDate);
          if (!counts[checkKey]) currentStreak = 0;
          else {
              while (counts[checkKey] > 0) {
                  currentStreak++;
                  checkDate.setDate(checkDate.getDate() - 1);
                  checkKey = formatDateKey(checkDate);
              }
          }
      } else {
          while (counts[checkKey] > 0) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
              checkKey = formatDateKey(checkDate);
          }
      }

      return { 
          heatmap, 
          totalCompletions: safeCompletions.length, 
          currentStreak 
      };

  } catch (err) {
      console.error("[HabitService] Error fetching heatmap:", err);
      return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  }
};
