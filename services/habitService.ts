
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Habit, Completion, HabitWithCompletion, Priority, User } from '../types';
import { formatDateKey } from '../lib/utils';
import { getTelegramUser } from '../lib/telegram';

// --- CONSTANTS ---
const TEST_USER_ID = 123456789; // Fixed ID for local development

// --- HELPERS ---

/**
 * Gets the current user ID.
 * Prioritizes Telegram WebApp ID, falls back to static test ID for development.
 */
export const getCurrentUserId = (): number => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
  }
  return TEST_USER_ID;
};

/**
 * Calculates the current streak based on completion history.
 * Checks for continuity starting from today or yesterday.
 */
const calculateStreak = (completions: Completion[]): number => {
  if (!completions || completions.length === 0) return 0;

  // Sort dates descending (newest first)
  const sortedDates = completions
    .map(c => c.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Unique dates only
  const uniqueDates = Array.from(new Set(sortedDates));
  if (uniqueDates.length === 0) return 0;

  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  // Check if the streak is active (completed today OR yesterday)
  // If the most recent completion is before yesterday, streak is broken -> 0
  const lastCompletion = uniqueDates[0];
  if (lastCompletion !== todayStr && lastCompletion !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentCheckDate = new Date();

  // If not completed today, start checking from yesterday
  if (lastCompletion !== todayStr) {
    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
  }

  // Iterate backwards
  for (let i = 0; i < uniqueDates.length; i++) {
    const checkStr = formatDateKey(currentCheckDate);
    if (uniqueDates.includes(checkStr)) {
      streak++;
      // Move to previous day
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else {
      // Gap found
      break;
    }
  }

  return streak;
};

// --- CORE SERVICE ---

/**
 * Ensures the user exists in the 'users' table.
 * Must be called before creating habits to ensure Foreign Key integrity.
 */
export const ensureUserExists = async (): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. skipping user check.");
    return true;
  }

  const telegramUser = getTelegramUser();
  const userId = getCurrentUserId();

  try {
    const userData: Partial<User> = {
      telegram_id: userId,
      username: telegramUser?.username || `user_${userId}`,
    };

    // Upsert: Insert if new, Update if exists
    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'telegram_id' });

    if (error) {
      console.error("Error ensuring user exists:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Critical error in ensureUserExists:", err);
    return false;
  }
};

/**
 * Fetches habits and links them with today's completion status and calculated streaks.
 */
export const fetchHabitsWithCompletions = async (userId: number, date: Date): Promise<HabitWithCompletion[]> => {
  const dateKey = formatDateKey(date);
  
  // Return empty array if no Supabase (or handle mock fallback differently if desired)
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    // 1. Fetch Habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (habitsError) throw habitsError;
    if (!habits || habits.length === 0) return [];

    // 2. Fetch ALL completions for these habits to calculate stats locally
    // (Optimized: In a massive app, we'd limit this range or use SQL views)
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
    console.error("Error fetching habits:", err);
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
  userId: number, 
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
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title,
        category,
        priority,
        color,
        icon: 'star', // Default icon, logic could be expanded
        reminder_time: reminderTime,
        reminder_date: reminderDate,
        reminder_days: reminderDays,
        is_archived: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error creating habit:", err);
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
    console.error("Error updating habit:", err);
    return false;
  }
};

/**
 * Deletes a habit (and relies on CASCADE for completions).
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
    console.error("Error deleting habit:", err);
    return false;
  }
};

/**
 * Toggles completion status. 
 * INSERTs if marking done, DELETEs if marking undone.
 */
export const toggleHabitCompletion = async (
  habitId: string, 
  date: Date, 
  isCompleted: boolean, 
  existingCompletionId?: string, 
  note?: string
): Promise<{ success: boolean, newId?: string }> => {
  if (!isSupabaseConfigured || !supabase) return { success: false };

  const dateKey = formatDateKey(date);

  try {
    if (isCompleted) {
      // Check if already exists to avoid duplicate constraint errors
      // (Though UI should prevent this, race conditions happen)
      const { data: existing } = await supabase
         .from('completions')
         .select('id')
         .eq('habit_id', habitId)
         .eq('date', dateKey)
         .maybeSingle();

      if (existing) return { success: true, newId: existing.id };

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
      return { success: true, newId: data.id };
    } else {
      // Delete completion
      if (!existingCompletionId) {
          // If we don't have the ID, try to find it by composite key
          const { error: deleteError } = await supabase
            .from('completions')
            .delete()
            .eq('habit_id', habitId)
            .eq('date', dateKey);
          
          if (deleteError) throw deleteError;
          return { success: true };
      }

      const { error } = await supabase
        .from('completions')
        .delete()
        .eq('id', existingCompletionId);
      
      if (error) throw error;
      return { success: true };
    }
  } catch (err) {
    console.error("Error toggling completion:", err);
    return { success: false };
  }
};

/**
 * Updates the note on a specific completion record.
 */
export const updateCompletionNote = async (completionId: string, note: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('completions').update({ note }).eq('id', completionId);
};

// --- STATISTICS SERVICES ---

/**
 * Calculates weekly activity counts for the last 7 days.
 */
export const fetchWeeklyStats = async (userId: number): Promise<{ day: string; count: number }[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const startDateStr = formatDateKey(sevenDaysAgo);

  try {
    // Get all habits for user to filter completions
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);

    if (!habits || habits.length === 0) return [];
    
    const habitIds = habits.map(h => h.id);

    // Fetch completions in range
    const { data: completions } = await supabase
      .from('completions')
      .select('date')
      .in('habit_id', habitIds)
      .gte('date', startDateStr);

    const counts: Record<string, number> = {};
    (completions || []).forEach(c => {
        counts[c.date] = (counts[c.date] || 0) + 1;
    });

    // Format output for Mon-Sun or Relative 7 days
    // We'll use the next 7 days logic from the chart component, or return actual days
    const result = [];
    for(let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const k = formatDateKey(d);
        // Returns "Mon", "Tue" etc.
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
        result.push({ day: dayName, count: counts[k] || 0 });
    }

    return result;

  } catch (err) {
    console.error("Error fetching weekly stats:", err);
    return [];
  }
};

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

/**
 * Fetches all time heatmap data and aggregates totals.
 */
export const fetchHeatmapData = async (userId: number): Promise<{ heatmap: HeatmapData[], totalCompletions: number, currentStreak: number }> => {
  if (!isSupabaseConfigured || !supabase) {
      return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  }

  try {
      // 1. Get User Habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId);
      
      if (!habits || habits.length === 0) {
          return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
      }
      
      const habitIds = habits.map(h => h.id);

      // 2. Get All Completions
      const { data: completions } = await supabase
        .from('completions')
        .select('date')
        .in('habit_id', habitIds);
      
      const safeCompletions = completions || [];

      // 3. Aggregate Counts
      const counts: Record<string, number> = {};
      const distinctDates = new Set<string>();

      safeCompletions.forEach(c => {
          counts[c.date] = (counts[c.date] || 0) + 1;
          distinctDates.add(c.date);
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

      // 5. Calculate Global Daily Streak
      // (Days in a row where AT LEAST ONE habit was done)
      let currentStreak = 0;
      let checkDate = new Date(today);
      let checkKey = formatDateKey(checkDate);
      
      // If nothing done today, check yesterday to start streak count
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
      console.error("Error fetching heatmap:", err);
      return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  }
};
