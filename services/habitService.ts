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

const calculateGlobalStreakFromDates = (dates: string[]): number => {
  if (!dates || dates.length === 0) return 0;
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  
  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

  let streak = 0;
  let currentCheckDate = new Date();
  if (uniqueDates[0] !== todayStr) currentCheckDate.setDate(currentCheckDate.getDate() - 1);

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

  const userId = getCurrentUserId();
  // Локальный тест пропускаем (если не в Телеграме)
  if (userId === TEST_USER_ID) {
     hasVerifiedUser = true;
     return true;
  }

  const tgWebApp = window.Telegram?.WebApp;
  const tgUser = tgWebApp?.initDataUnsafe?.user;

  // --- ЛОГИКА ЗАХВАТА РЕФЕРАЛКИ (ПЫЛЕСОС) ---
  // 1. Ищем в нативных данных Телеграма (start_param из t.me ссылки)
  let startParam = tgWebApp?.initDataUnsafe?.start_param;
  console.log("🔍 DEBUG: Telegram initData param:", startParam);

  // 2. Если там пусто — ищем в URL (для кнопок с явным параметром)
  if (!startParam && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    startParam = urlParams.get('start_param') || undefined;
    console.log("🔍 DEBUG: URL Query param:", startParam);
  }

  // 3. Если все еще пусто — проверяем 'tgWebAppStartParam' (специфичный параметр ТГ)
  if (!startParam && typeof window !== 'undefined') {
     const urlParams = new URLSearchParams(window.location.search);
     startParam = urlParams.get('tgWebAppStartParam') || undefined;
     console.log("🔍 DEBUG: tgWebAppStartParam:", startParam);
  }
  
  console.log("✅ FINAL START PARAM TO SEND:", startParam);
  // ------------------------------------------

  let timezone = 'UTC';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

  try {
    // ЗВОНОК НА СЕРВЕР (API)
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: userId,
        username: tgUser?.username || `user_${userId}`,
        first_name: tgUser?.first_name || 'Unknown',
        last_name: tgUser?.last_name || '',
        language_code: tgUser?.language_code || 'en',
        timezone: timezone,
        start_param: startParam
      }),
    });

    if (response.ok) {
      hasVerifiedUser = true;
      return true;
    } else {
      console.error('Registration API failed:', await response.text());
      return false;
    }
  } catch (err) {
    console.error("Network error during registration:", err);
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
  } catch { return null; }
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
  } catch { return []; }
};

// CRUD Привычек
export const createHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]): Promise<Habit | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const userId = getCurrentUserId();
  await ensureUserExists();
  
  try {
    const { data, error } = await supabase.from('habits').insert({
      user_id: userId, title, category, priority, color, icon: 'star',
      reminder_time: reminderTime, reminder_date: reminderDate, reminder_days: reminderDays,
      is_archived: false, coins_reward: 10
    }).select().single();
    
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Error creating habit:", e);
    return null;
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  if (!isSupabaseConfigured || !supabase) return false;
  await supabase.from('habits').update(updates).eq('id', habitId);
  return true;
};

export const deleteHabit = async (habitId: string) => {
  if (!isSupabaseConfigured || !supabase) return false;
  await supabase.from('habits').delete().eq('id', habitId);
  return true;
};

// Выполнение привычки + Локальное обновление XP
export const toggleHabitCompletion = async (habitId: string, date: Date, isCompleted: boolean, existingCompletionId?: string, note?: string): Promise<any> => {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  const dateKey = formatDateKey(date);
  const userId = getCurrentUserId();

  if (isCompleted) {
      const { data, error } = await supabase.from('completions').insert({ 
        habit_id: habitId, user_id: userId, date: dateKey, note, completed_at: new Date().toISOString() 
      }).select().single();
      
      if (!error) {
         // Обновляем XP локально (простая логика, сложную делает сервер)
         const { data: u } = await supabase.from('users').select('xp').eq('telegram_id', userId).single();
         if (u) {
            const newXp = (u.xp || 0) + 10;
            const newLvl = Math.floor(newXp / 100) + 1;
            await supabase.from('users').update({ xp: newXp, level: newLvl }).eq('telegram_id', userId);
         }
         return { success: true, newId: data.id, coinsEarned: 10, newBadge: null };
      }
  } else {
      if (existingCompletionId) await supabase.from('completions').delete().eq('id', existingCompletionId);
      return { success: true, coinsEarned: -10 };
  }
  return { success: false };
};

export const updateCompletionNote = async (completionId: string, note: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('completions').update({ note }).eq('id', completionId);
};

// Stats functions
export const fetchWeeklyStats = async () => { 
    // (Можно вернуть вашу полную реализацию, здесь заглушка чтобы не раздувать код, если он не менялся)
    if (!isSupabaseConfigured || !supabase) return [];
    const userId = getCurrentUserId();
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const startDateStr = formatDateKey(sevenDaysAgo);
    try {
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
    } catch { return []; }
};

export const fetchHeatmapData = async () => { 
    if (!isSupabaseConfigured || !supabase) return { heatmap: [], totalCompletions: 0, currentStreak: 0 };
    try {
        const userId = getCurrentUserId();
        const { data: completions } = await supabase.from('completions').select('date').eq('user_id', userId);
        const dates = (completions || []).map(c => c.date);
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
        return { heatmap, totalCompletions: dates.length, currentStreak: calculateGlobalStreakFromDates(dates) };
    } catch { return { heatmap: [], totalCompletions: 0, currentStreak: 0 }; }
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
