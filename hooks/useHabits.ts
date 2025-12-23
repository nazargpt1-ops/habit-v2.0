import useSWR, { mutate } from 'swr';
import { 
  fetchHabitsWithCompletions, 
  fetchUserProfile, 
  fetchWeeklyStats,
  toggleHabitCompletion 
} from '../services/habitService';
import { formatDateKey } from '../lib/utils';
import { HabitWithCompletion, User } from '../types';

// Cache Keys
const KEYS = {
  HABITS: (date: string) => ['habits', date],
  USER: 'user_profile',
  WEEKLY_STATS: 'weekly_stats'
};

export const useUser = () => {
  const { data, error, isLoading } = useSWR<User | null>(
    KEYS.USER, 
    fetchUserProfile
  );
  return { user: data, isLoading, isError: error };
};

export const useWeeklyStats = () => {
  const { data, error, isLoading } = useSWR(
    KEYS.WEEKLY_STATS, 
    fetchWeeklyStats
  );
  return { stats: data || [], isLoading, isError: error };
};

export const useHabits = (date: Date) => {
  const dateKey = formatDateKey(date);
  
  const { data, error, isLoading, mutate: mutateHabits } = useSWR<HabitWithCompletion[]>(
    KEYS.HABITS(dateKey),
    () => fetchHabitsWithCompletions(date)
  );

  const toggleHabit = async (habitId: string) => {
    // 1. Get current data for optimistic calculation
    const currentHabits = data || [];
    const habitIndex = currentHabits.findIndex(h => h.id === habitId);
    
    if (habitIndex === -1) return null; // Should not happen

    const oldHabit = currentHabits[habitIndex];
    const newStatus = !oldHabit.completed;
    
    // 2. Prepare Optimistic Habits Data
    const optimisticHabits = [...currentHabits];
    optimisticHabits[habitIndex] = {
        ...oldHabit,
        completed: newStatus,
        // Simple client-side streak approximation for visual feedback
        currentStreak: newStatus 
            ? (oldHabit.currentStreak || 0) + 1 
            : Math.max(0, (oldHabit.currentStreak || 0) - 1)
    };

    // 3. Prepare Optimistic User Data (Coins/XP)
    // We access the User Cache directly to update it optimistically
    const reward = oldHabit.coins_reward || 10;
    const xpReward = 10;
    
    // Apply Optimistic Updates
    const habitUpdatePromise = mutate(KEYS.HABITS(dateKey), optimisticHabits, false);
    
    const userUpdatePromise = mutate(KEYS.USER, (currentUser: User | null | undefined) => {
        if (!currentUser) return currentUser;
        
        let newCoins = (currentUser.total_coins || 0) + (newStatus ? reward : -reward);
        let newXp = (currentUser.xp || 0) + (newStatus ? xpReward : -xpReward);
        const newLevel = Math.floor(newXp / 100) + 1;

        return {
            ...currentUser,
            total_coins: Math.max(0, newCoins),
            xp: Math.max(0, newXp),
            level: newLevel
        };
    }, false);

    // 4. Perform Actual API Request
    try {
        const result = await toggleHabitCompletion(
            habitId, 
            date, 
            newStatus, 
            oldHabit.completionId
        );

        if (result.success && newStatus && result.newId) {
             // If we got a new completion ID, we might want to update the local cache silently
             // But usually a revalidate is safer to ensure consistency
             mutateHabits(); // Revalidate habits to get exact server IDs/Streak
             mutate(KEYS.USER); // Revalidate user to ensure server sync
             mutate(KEYS.WEEKLY_STATS); // Update chart
             return result;
        } else if (!result.success) {
             throw new Error("Failed to toggle");
        }
        
        // Revalidate all affected keys to ensure truth
        mutateHabits();
        mutate(KEYS.USER);
        mutate(KEYS.WEEKLY_STATS);
        
        return result;

    } catch (err) {
        // Rollback on error
        mutate(KEYS.HABITS(dateKey));
        mutate(KEYS.USER);
        console.error("Optimistic update failed:", err);
        return { success: false };
    }
  };

  const refreshHabits = () => mutateHabits();

  return {
    habits: data || [],
    isLoading,
    isError: error,
    toggleHabit,
    refreshHabits
  };
};
