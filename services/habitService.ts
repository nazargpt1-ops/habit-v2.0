
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

// Generate dense mock history for the heatmap demo
const generateMockHistory = () => {
  const history: Completion[] = [...MOCK_COMPLETIONS];
  const today = new Date();
  
  // Go back 365 days
  for(let i = 1; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);
    
    // Randomly decide how many habits were done this day (0 to 4)
    // Bias towards doing some work
    const rand = Math.random();
    let habitsDone = 0;
    
    if (rand > 0.8) habitsDone = 4; // Great day
    else if (rand > 0.5) habitsDone = 3; // Good day
    else if (rand > 0.3) habitsDone = 1; // Okay day
    else if (rand > 0.1) habitsDone = 2;
    else habitsDone = 0; // Bad day
    
    // Assign completions
    for(let h = 0; h < habitsDone; h++) {
        if (MOCK_HABITS[h]) {
            history.push({
                id: `mock-${i}-${h}`,
                habit_id: MOCK_HABITS[h].id,
                date: dateStr,
                completed_at: d.toISOString()
            });
        }
    }
  }
  return history;
};

// Initialize dense data if mock
let CACHED_MOCK_HISTORY = generateMockHistory();

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
  
  // Recursively check previous days
  // Simplified for mock: just return the calculated number or random for demo if 0 logic fails
  return completedToday ? Math.floor(Math.random() * 12) + 1 : 0; 
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
      // Use cached large history
      const completion = CACHED_MOCK_HISTORY.find(c => c.habit_id === habit.id && c.date === dateKey);
      const streak = calculateStreak(habit.id, CACHED_MOCK_HISTORY);
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
    return CACHED_MOCK_HISTORY.filter(c => c.habit_id === habitId);
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

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
        try {
            const { error } = await supabase.from('habits').update(updates).eq('id', habitId);
            if(error) throw error;
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    } else {
        // Mock Update
        const habit = MOCK_HABITS.find(h => h.id === habitId);
        if (habit) {
            Object.assign(habit, updates);
            return true;
        }
        return false;
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
      const newCompletion = {
        id: newId,
        habit_id: habitId,
        date: dateKey,
        completed_at: new Date().toISOString(),
        note
      };
      MOCK_COMPLETIONS.push(newCompletion);
      CACHED_MOCK_HISTORY.push(newCompletion); // Update cache
      return { success: true, newId };
    } else {
      MOCK_COMPLETIONS = MOCK_COMPLETIONS.filter(c => c.id !== existingCompletionId);
      CACHED_MOCK_HISTORY = CACHED_MOCK_HISTORY.filter(c => c.id !== existingCompletionId);
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
        const c2 = CACHED_MOCK_HISTORY.find(c => c.id === completionId);
        if(c2) c2.note = note;
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

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export const fetchHeatmapData = async (userId: number): Promise<{ heatmap: HeatmapData[], totalCompletions: number, currentStreak: number }> => {
  let completions: Completion[] = [];

  if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('completions').select('*').gte('date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
      completions = data || [];
  } else {
      completions = CACHED_MOCK_HISTORY;
  }

  // Aggregate by date
  const counts: Record<string, number> = {};
  completions.forEach(c => {
      counts[c.date] = (counts[c.date] || 0) + 1;
  });

  // Calculate heatmap array for last 365 days
  const today = new Date();
  const heatmap: HeatmapData[] = [];
  
  // We need the data array to start from one year ago to today for the library
  // Actually library handles dates, but we usually provide a range or just the filled dates.
  // Let's provide filled dates.
  
  // Find range
  const endDate = today;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);

  // Iterate
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
       const key = formatDateKey(d);
       const count = counts[key] || 0;
       // Level 0-4
       let level = 0;
       if (count === 0) level = 0;
       else if (count <= 1) level = 1;
       else if (count <= 2) level = 2;
       else if (count <= 3) level = 3;
       else level = 4;

       heatmap.push({ date: key, count, level });
  }

  const totalCompletions = completions.length;
  // Global Streak (Any habit done today/yesterday)
  let currentStreak = 0;
  let d = new Date(today);
  
  // Check today
  if (!counts[formatDateKey(d)]) {
      // If nothing today, check yesterday
      d.setDate(d.getDate() - 1);
      if (!counts[formatDateKey(d)]) {
        currentStreak = 0;
      } else {
        // Streak continues from yesterday
        while(counts[formatDateKey(d)] > 0) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
        }
      }
  } else {
      while(counts[formatDateKey(d)] > 0) {
          currentStreak++;
          d.setDate(d.getDate() - 1);
      }
  }

  return { heatmap, totalCompletions, currentStreak };
};
