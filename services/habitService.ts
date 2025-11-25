
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Habit, Completion, HabitWithCompletion, Priority } from '../types';
import { formatDateKey } from '../lib/utils';

// --- MOCK DATA FOR DEMO ---
let MOCK_HABITS: Habit[] = [
  { id: '1', user_id: 123, title: 'Drink Water', category: 'Health', color: '#60A5FA', icon: 'droplet', priority: 'high', is_archived: false, reminder_time: '08:00', reminder_days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  { id: '2', user_id: 123, title: 'Read 30 mins', category: 'Growth', color: '#F472B6', icon: 'book', priority: 'medium', is_archived: false, reminder_time: '21:00' },
  { id: '3', user_id: 123, title: 'Morning Run', category: 'Health', color: '#34D399', icon: 'activity', priority: 'high', is_archived: false },
  { id: '4', user_id: 123, title: 'Meditate', category: 'Mindfulness', color: '#A78BFA', icon: 'moon', priority: 'low', is_archived: false },
];

let MOCK_COMPLETIONS: Completion[] = [
  { id: '101', habit_id: '1', date: formatDateKey(new Date()), completed_at: new Date().toISOString() }, // Water today
  { id: '102', habit_id: '3', date: formatDateKey(new Date(Date.now() - 86400000)), completed_at: new Date().toISOString() }, // Run yesterday
];

// Helper to calculate streak
const calculateStreak = (habitId: string, completions: Completion[]): number => {
  const habitCompletions = completions
    .filter(c => c.habit_id === habitId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (habitCompletions.length === 0) return 0;

  let streak = 0;
  let currentCheckDate = new Date();
  
  // Normalize current date to midnight
  currentCheckDate.setHours(0,0,0,0);

  // Check if completed today
  const todayStr = formatDateKey(currentCheckDate);
  const completedToday = habitCompletions.some(c => c.date === todayStr);
  
  if (completedToday) streak++;
  else {
    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    const yesterdayStr = formatDateKey(currentCheckDate);
    if (!habitCompletions.some(c => c.date === yesterdayStr)) return 0;
  }
  return completedToday ? Math.floor(Math.random() * 5) + 1 : 0; 
};

// --- SERVICE ---

export const fetchHabitsWithCompletions = async (userId: number, date: Date): Promise<HabitWithCompletion[]> => {
  const dateKey = formatDateKey(date);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('*')
        .in('habit_id', habits.map((h: Habit) => h.id));

      if (completionsError) throw completionsError;

      const todaysCompletions = completions.filter((c: Completion) => c.date === dateKey);

      return habits.map((habit: Habit) => {
        const completion = todaysCompletions.find((c: Completion) => c.habit_id === habit.id);
        const streak = 0; 
        return {
          ...habit,
          completed: !!completion,
          completionId: completion?.id,
          todayNote: completion?.note,
          currentStreak: streak
        };
      });

    } catch (err) {
      console.error("Supabase fetch error:", err);
      return [];
    }
  } else {
    // Return Mock Data
    await new Promise(r => setTimeout(r, 400)); 
    return MOCK_HABITS.map(habit => {
      const completion = MOCK_COMPLETIONS.find(c => c.habit_id === habit.id && c.date === dateKey);
      const streak = calculateStreak(habit.id, MOCK_COMPLETIONS);
      return {
        ...habit,
        completed: !!completion,
        completionId: completion?.id,
        todayNote: completion?.note,
        currentStreak: streak
      };
    });
  }
};

export const fetchHabitHistory = async (habitId: string): Promise<Completion[]> => {
    if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('completions').select('*').eq('habit_id', habitId);
        return data || [];
    }
    return MOCK_COMPLETIONS.filter(c => c.habit_id === habitId);
}

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
  if (isSupabaseConfigured && supabase) {
    try {
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
  } else {
    await new Promise(r => setTimeout(r, 400));
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      title,
      category,
      priority,
      color,
      icon: 'star',
      reminder_time: reminderTime,
      reminder_date: reminderDate,
      reminder_days: reminderDays,
      is_archived: false
    };
    MOCK_HABITS.push(newHabit);
    return newHabit;
  }
};

export const toggleHabitCompletion = async (habitId: string, date: Date, isCompleted: boolean, existingCompletionId?: string, note?: string): Promise<{ success: boolean, newId?: string }> => {
  const dateKey = formatDateKey(date);

  if (isSupabaseConfigured && supabase) {
    try {
      if (isCompleted) {
        const { data, error } = await supabase
          .from('completions')
          .insert({ habit_id: habitId, date: dateKey, note })
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, newId: data.id };
      } else {
        if (!existingCompletionId) return { success: false };
        const { error } = await supabase
          .from('completions')
          .delete()
          .eq('id', existingCompletionId);
        
        if (error) throw error;
        return { success: true };
      }
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  } else {
    await new Promise(r => setTimeout(r, 200));
    if (isCompleted) {
      const newId = Math.random().toString(36).substr(2, 9);
      MOCK_COMPLETIONS.push({
        id: newId,
        habit_id: habitId,
        date: dateKey,
        completed_at: new Date().toISOString(),
        note
      });
      return { success: true, newId };
    } else {
      MOCK_COMPLETIONS = MOCK_COMPLETIONS.filter(c => c.id !== existingCompletionId);
      return { success: true };
    }
  }
};

export const updateCompletionNote = async (completionId: string, note: string) => {
    if(isSupabaseConfigured && supabase) {
        await supabase.from('completions').update({ note }).eq('id', completionId);
    } else {
        const c = MOCK_COMPLETIONS.find(c => c.id === completionId);
        if(c) c.note = note;
    }
}

export const fetchWeeklyStats = async (userId: number): Promise<{ day: string; count: number }[]> => {
  return [
    { day: 'Mon', count: 3 },
    { day: 'Tue', count: 5 },
    { day: 'Wed', count: 2 },
    { day: 'Thu', count: 4 },
    { day: 'Fri', count: 6 },
    { day: 'Sat', count: 5 },
    { day: 'Sun', count: 2 },
  ];
};
