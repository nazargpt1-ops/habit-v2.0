
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarStrip } from '../components/CalendarStrip';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitDetailsModal } from '../components/HabitDetailsModal';
import { useLanguage } from '../context/LanguageContext';
import { fetchHabitsWithCompletions, toggleHabitCompletion, createHabit } from '../services/habitService';
import { HabitWithCompletion, Priority } from '../types';
import { getTelegramUser, hapticImpact, hapticSuccess } from '../lib/telegram';
import { Plus, Sun, Moon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Details Modal State
  const [selectedHabit, setSelectedHabit] = useState<HabitWithCompletion | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Manual Theme Toggle State (Visual only, overrides CSS)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    const root = document.documentElement;
    // Simple override for demo purposes. In real app, we'd swap a whole palette.
    if (!isDarkMode) {
        root.style.setProperty('--tg-theme-bg-color', '#17212b');
        root.style.setProperty('--tg-theme-text-color', '#f5f5f5');
        root.style.setProperty('--tg-theme-secondary-bg-color', '#232e3c');
    } else {
        root.style.setProperty('--tg-theme-bg-color', '#ffffff');
        root.style.setProperty('--tg-theme-text-color', '#000000');
        root.style.setProperty('--tg-theme-secondary-bg-color', '#f4f4f5');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const user = getTelegramUser();
    const data = await fetchHabitsWithCompletions(user.id, selectedDate);
    setHabits(data);
    setIsLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort Habits
  const sortedHabits = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return [...habits].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pA = priorityWeight[a.priority || 'medium'];
      const pB = priorityWeight[b.priority || 'medium'];
      return pB - pA;
    });
  }, [habits]);

  const handleToggle = async (habitId: string) => {
    hapticImpact('medium');
    
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const oldHabit = habits[habitIndex];
    const newStatus = !oldHabit.completed;

    if (newStatus) hapticSuccess();

    const updatedHabits = [...habits];
    updatedHabits[habitIndex] = { ...oldHabit, completed: newStatus };
    setHabits(updatedHabits);

    const result = await toggleHabitCompletion(habitId, selectedDate, newStatus, oldHabit.completionId);
    
    if (result.success && newStatus && result.newId) {
        updatedHabits[habitIndex].completionId = result.newId;
        setHabits([...updatedHabits]);
    } else if (!result.success) {
      setHabits(habits); // Revert
    }
  };

  const handleAddHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]) => {
    const user = getTelegramUser();
    const newHabitMock: HabitWithCompletion = {
      id: Math.random().toString(),
      user_id: user.id,
      title,
      category,
      priority,
      color,
      is_archived: false,
      completed: false,
      reminder_time: reminderTime,
      reminder_date: reminderDate,
      reminder_days: reminderDays
    };
    
    setHabits(prev => [newHabitMock, ...prev]);
    const created = await createHabit(user.id, title, priority, color, category, reminderTime, reminderDate, reminderDays);
    if (created) loadData();
  };

  const openDetails = (habit: HabitWithCompletion) => {
      setSelectedHabit(habit);
      setIsDetailsOpen(true);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)]/95 backdrop-blur-sm border-b border-[var(--tg-theme-secondary-bg-color)]">
        <div className="px-4 py-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t.today}</h1>
            <p className="text-xs text-[var(--tg-theme-hint-color)]">
                {t.swipeHint}
            </p>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <CalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-20 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] animate-pulse" />
             ))}
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {sortedHabits.length > 0 ? (
              <div className="space-y-1">
                {sortedHabits.map((habit) => (
                  <HabitCard 
                    key={habit.id} 
                    habit={habit} 
                    onToggle={handleToggle} 
                    onOpenDetails={openDetails}
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center pt-10 text-center opacity-60"
              >
                <div className="text-4xl mb-4">🌱</div>
                <p className="text-[var(--tg-theme-hint-color)]">{t.noHabits}</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="absolute bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] flex items-center justify-center shadow-lg shadow-[var(--tg-theme-button-color)]/40"
      >
        <Plus size={28} />
      </motion.button>

      <AddHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddHabit} 
      />

      <HabitDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        habit={selectedHabit}
      />
    </div>
  );
};
