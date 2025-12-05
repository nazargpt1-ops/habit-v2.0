import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Habit, Completion, HabitWithCompletion, Priority, User, RPGStat } from '../types';
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
 */
const calculateGlobalStreakFromDates = (dates: string[]): number => {
  if (!dates || dates.length === 0) return 0;
  
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  
  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentCheckDate = new Date();
  
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
  const tgWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const tgUser = tgWebApp?.initDataUnsafe?.user;
  const startParam = tgWebApp?.initDataUnsafe?.start_param;

  let timezone = 'UTC';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

  try {
    // 1. Проверяем существование (только по telegram_id)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('telegram_id') 
      .eq('telegram_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking user existence:", checkError);
      return false;
    }

    // 2. Если пользователь есть - обновляем инфо
    if (existingUser) {
      console.log("User exists, updating metadata...");
      await supabase.from('users').update({
        username: tgUser?.username || `user_${userId}`,
        first_name: tgUser?.first_name || 'Unknown',
        last_name: tgUser?.last_name || '',
        language_code: tgUser?.language_code || 'en',
        timezone: timezone
      }).eq('telegram_id', userId);

      hasVerifiedUser = true;
      return true;
    }

    // 3. Если пользователя НЕТ - создаем (с Рефералкой)
    console.log("Creating NEW user with param:", startParam);
    
    let referredBy: number | null = null;
    let initialXp = 0;
    const initialLevel = 1;

    if (startParam && startParam.startsWith('ref_')) {
       const refString = startParam.split('ref_')[1];
       const referrerId = parseInt(refString, 10);
       
       if (!isNaN(referrerId) && referrerId !== Number(userId)) {
          // Проверяем, существует ли пригласивший
          const { data: refCheck } = await supabase.from('users').select('telegram_id').eq('telegram_id', referrerId).maybeSingle();
          if (refCheck) {
             referredBy = referrerId;
             initialXp = 50; // Бонус новичку
             console.log("Valid referral from:", referredBy);
          }
       }
    }

    const userData = {
      telegram_id: userId,
      username: tgUser?.username || `user_${userId}`,
      first_name: tgUser?.first_name || 'Unknown',
      last_name: tgUser?.last_name || '',
      language_code: tgUser?.language_code || 'en',
      timezone: timezone,
      referred_by: referredBy, 
      xp: initialXp, 
      level: initialLevel,
      total_coins: 0
    };

    const { error: insertError } = await supabase.from('users').insert(userData);

    if (insertError) {
       console.error("Insert user error:", insertError);
       return false;
    }

    // 4. Награда пригласившему
    if (referredBy) {
       console.log("Rewarding referrer:", referredBy);
       const { data: referrer } = await supabase
         .from('users')
         .select('xp')
         .eq('telegram_id', referredBy)
         .single();

       if (referrer) {
         const newXp = (referrer.xp || 0) + 100;
         const newLevel = Math.floor(newXp / 100) + 1;
         await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('telegram_id', referredBy);
       }
    }

    hasVerifiedUser = true;
    return true;
  } catch (err) {
    console.error("Fatal ensureUserExists:", err);
    return false;
  }
};

export const fetchUserProfile = async (): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const userId = getCurrentUserId();
  try {
    const { data, error } = await supabase.from('users').select('*').eq('telegram_id', userId).single();
    if (error) throw error;
    return data;
  } catch (err) { return null; }
};

// Обновление геймификации (XP, Монеты, Уровень)
const updateUserGamification = async (coinAmount: number, xpAmount: number): Promise<{ oldLevel: number, newLevel: number }> => {
  if (!isSupabaseConfigured || !supabase) return { oldLevel: 1, newLevel: 1 };
  const userId = getCurrentUserId();

  try {
    const { data: user } = await supabase.from('users').select('total_coins, xp, level').eq('telegram_id', userId).single();
    if (!user) return { oldLevel: 1, newLevel: 1 };

    const oldLevel = user.level || 1;
    let newCoins = (user.total_coins || 0) + coinAmount;
    if (newCoins < 0) newCoins = 0;

    let newXP = (user.xp || 0) + xpAmount;
    if (newXP < 0) newXP = 0;

    const newLevel = Math.floor(newXP / 100) + 1;

    await supabase.from('users').update({ total_coins: newCoins, xp: newXP, level: newLevel }).eq('telegram_id', userId);
    return { oldLevel, newLevel };
  } catch (err) {
    return { oldLevel: 1, newLevel: 1 };
  }
};

export const fetchHabitsWithCompletions = async (date: Date): Promise<HabitWithCompletion[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const userId = getCurrentUserId();
    await ensureUserExists();
    const dateKey = formatDateKey(date);

    const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).eq('is_archived', false).order('created_at', { ascending: true });
    if (!habits || habits.length === 0) return [];

    const habitIds = habits.map(h => h.id);
    const { data: completions } = await supabase.from('completions').select('*').in('habit_id', habitIds);

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
  } catch (err) { return []; }
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

// Проверка ачивок
const checkBadgeConditions = async (userId: string | number): Promise<{ count: number, streak: number }> => {
    if (!supabase) return { count: 0, streak: 0 };
    const { data } = await supabase.from('completions').select('date').eq('user_id', userId);
    const dates = (data || []).map(d => d.date);
    const count = dates.length;
    const streak = calculateGlobalStreakFromDates(dates);
    return { count, streak };
};

// Переключение выполнения привычки
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
      const potentialBadges: string[] = [];
      if (new Date().getHours() < 8) potentialBadges.push('early_bird');

      const { data: existing } = await supabase.from('completions').select('id').eq('habit_id', habitId).eq('date', dateKey).maybeSingle();
      if (existing) return { success: true, newId: existing.id, coinsEarned: 0 };

      const { data, error } = await supabase
        .from('completions')
        .insert({ habit_id: habitId, user_id: userId, date: dateKey, note, completed_at: new Date().toISOString() })
        .select().single();
      
      if (error) throw error;
      const newId = data.id;

      const { oldLevel, newLevel } = await updateUserGamification(reward, xpReward);
      if (oldLevel < 5 && newLevel >= 5) potentialBadges.push('level_5');

      const { count, streak } = await checkBadgeConditions(userId);
      if (count === 1) potentialBadges.push('first_step');
      if (streak === 7) potentialBadges.push('week_streak');

      if (potentialBadges.includes('level_5')) newBadge = 'level_5';
      else if (potentialBadges.includes('week_streak')) newBadge = 'week_streak';
      else if (potentialBadges.includes('first_step')) newBadge = 'first_step';
      else if (potentialBadges.includes('early_bird')) newBadge = 'early_bird';

      return { success: true, newId, coinsEarned: reward, newBadge };

    } else {
      if (!existingCompletionId) {
          await supabase.from('completions').delete().eq('habit_id', habitId).eq('date', dateKey);
      } else {
          await supabase.from('completions').delete().eq('id', existingCompletionId);
      }
      await updateUserGamification(-reward, -xpReward);
      return { success: true, coinsEarned: -reward, newBadge: null };
    }
  } catch (err) { return { success: false }; }
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
    const { data: completions } = await supabase.from('completions').select('date').eq('user_id', userId).gte('date', startDateStr);
    const counts: Record<string, number> = {};
    (completions || []).forEach(c => { counts[c.date] = (counts[c.date] || 0) + 1; });
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

export const fetchHeatmapData = async (): Promise<{ heatmap: any[], totalCompletions: number, currentStreak: number }> => {
  if (!isSupabaseConfigured || !supabase) return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
  try {
      const userId = getCurrentUserId();
      await ensureUserExists();
      const { data: completions } = await supabase.from('completions').select('date').eq('user_id', userId);
      const safeCompletions = completions || [];
      const dates = safeCompletions.map(c => c.date);
      const counts: Record<string, number> = {};
      dates.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
      
      const heatmap = [];
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
      return { heatmap, totalCompletions: safeCompletions.length, currentStreak: calculateGlobalStreakFromDates(dates) };
  } catch (err) { return { heatmap: [], totalCompletions: 0, currentStreak: 0 }; }
};

export const fetchRPGStats = async (): Promise<RPGStat[]> => {
  if (!isSupabaseConfigured || !supabase) return ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'].map(s => ({ subject: s, A: 0, fullMark: 10 }));
  const userId = getCurrentUserId();
  const categoryMap: Record<string, string> = { 'health': 'VIT', 'mind': 'INT', 'mindfulness': 'INT', 'work': 'DIS', 'social': 'CHA', 'growth': 'WIS', 'energy': 'STA' };
  const scores: Record<string, number> = { 'VIT': 0, 'INT': 0, 'DIS': 0, 'CHA': 0, 'WIS': 0, 'STA': 0 };

  try {
    const { data: completions } = await supabase.from('completions').select('habit_id, habit:habits(category)').eq('user_id', userId);
    if (completions) {
      completions.forEach((item: any) => {
        const habitData = Array.isArray(item.habit) ? item.habit[0] : item.habit;
        if (habitData && habitData.category) {
          const catLower = habitData.category.toLowerCase().trim();
          const statKey = categoryMap[catLower];
          if (statKey && scores[statKey] !== undefined) scores[statKey] += 1; 
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
    const maxVal = Math.max(...Object.values(scores), 0); 
    const fullMark = Math.max(Math.ceil(maxVal * 1.2), 10); 
    return ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'].map(subject => ({ subject, A: scores[subject], fullMark }));
  } catch (err) { return ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'].map(s => ({ subject: s, A: 0, fullMark: 10 })); }
};
