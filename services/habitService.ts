import { Habit, Completion, HabitWithCompletion, Priority, User } from '../types';
import { formatDateKey } from '../lib/utils';

const TEST_USER_ID = 99999999;
let hasVerifiedUser = false;

// --- HELPERS ---

export const getCurrentUserId = (): number => {
  let userId: number = TEST_USER_ID;
  
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  }
  
  return userId;
};

// Generic Fetch Wrapper to inject Authentication Headers
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const userId = getCurrentUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-telegram-id': userId.toString(),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(endpoint, { ...options, headers });
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    return null;
  }
};

// --- CORE SERVICE ---

export const ensureUserExists = async (): Promise<boolean> => {
  if (hasVerifiedUser) return true;

  const userId = getCurrentUserId();
  const tgWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const tgUser = tgWebApp?.initDataUnsafe?.user;
  
  let startParam = tgWebApp?.initDataUnsafe?.start_param;
  
  if (!startParam && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    startParam = urlParams.get('start_param') || urlParams.get('tgWebAppStartParam') || undefined;
  }

  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) { console.warn("Timezone detection failed"); }

  try {
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

    if (!response.ok) return false;
    hasVerifiedUser = true;
    return true;
  } catch (err) {
    return false;
  }
};

export const fetchUserProfile = async (): Promise<User | null> => {
  return await apiFetch('/api/user');
};

export const fetchHabitsWithCompletions = async (date: Date): Promise<HabitWithCompletion[]> => {
  await ensureUserExists();
  const dateKey = formatDateKey(date);
  const data = await apiFetch(`/api/habits?date=${dateKey}`);
  return data || [];
};

export const fetchHabitHistory = async (habitId: string): Promise<Completion[]> => {
  const data = await apiFetch(`/api/completion?habitId=${habitId}`);
  return data || [];
};

export const createHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]): Promise<Habit | null> => {
  await ensureUserExists();
  return await apiFetch('/api/habits', {
    method: 'POST',
    body: JSON.stringify({
      title, category, priority, color,
      reminder_time: reminderTime, reminder_date: reminderDate, reminder_days: reminderDays
    })
  });
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<boolean> => {
  const res = await apiFetch('/api/habits', {
    method: 'PATCH',
    body: JSON.stringify({ id: habitId, ...updates })
  });
  return !!res;
};

export const deleteHabit = async (habitId: string): Promise<boolean> => {
  const res = await apiFetch(`/api/habits?id=${habitId}`, {
    method: 'DELETE'
  });
  return !!res;
};

export const toggleHabitCompletion = async (
  habitId: string, 
  date: Date, 
  isCompleted: boolean, 
  existingCompletionId?: string, 
  note?: string
): Promise<{ success: boolean, newId?: string, coinsEarned?: number, newBadge?: string | null }> => {
  
  const dateKey = formatDateKey(date);
  
  const result = await apiFetch('/api/completion', {
    method: 'POST',
    body: JSON.stringify({
      habitId,
      date: dateKey,
      isCompleted,
      note
    })
  });

  if (!result) return { success: false };
  return result;
};

export const updateCompletionNote = async (completionId: string, note: string) => {
  await apiFetch('/api/completion', {
    method: 'PATCH',
    body: JSON.stringify({ completionId, note })
  });
};

export const fetchWeeklyStats = async (): Promise<{ day: string; count: number }[]> => {
  await ensureUserExists();
  const data = await apiFetch('/api/stats?type=weekly');
  return data || [];
};

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export const fetchHeatmapData = async (): Promise<{ heatmap: HeatmapData[], totalCompletions: number, currentStreak: number }> => {
  await ensureUserExists();
  const data = await apiFetch('/api/stats?type=heatmap');
  return data || { heatmap: [], totalCompletions: 0, currentStreak: 0 };
};

export interface RPGStat {
  subject: string;
  A: number;
  fullMark: number;
}

export const fetchRPGStats = async (): Promise<RPGStat[]> => {
  const data = await apiFetch('/api/stats?type=rpg');
  return data || ['VIT', 'INT', 'DIS', 'CHA', 'WIS', 'STA'].map(s => ({ subject: s, A: 0, fullMark: 10 }));
};
