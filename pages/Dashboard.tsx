import React, { useEffect, useState, useMemo } from 'react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Inbox, Sun, Moon, Zap, RefreshCw } from 'lucide-react';
import { CalendarStrip } from '../components/CalendarStrip';
import { HabitCard } from '../components/HabitCard';
import { HabitDetailsModal } from '../components/HabitDetailsModal';
import { CircularProgress } from '../components/CircularProgress';
import { WeeklyChart } from '../components/WeeklyChart';
import { HabitSuggestions, PresetHabit } from '../components/HabitSuggestions';
import { AddHabitModal } from '../components/AddHabitModal';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { BotSubscriptionBanner } from '../components/BotSubscriptionBanner';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  updateHabit, 
  createHabit, 
  deleteHabit,
  ensureUserExists,
  getCurrentUserId
} from '../services/habitService';
import { HabitWithCompletion, Habit, Priority } from '../types';
import { hapticImpact, hapticSuccess, requestNotificationPermission, isNotificationSupported } from '../lib/telegram';
import { clearCache } from '../lib/cache';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
// Hook Imports
import { useHabits, useUser, useWeeklyStats } from '../hooks/useHabits';

const motion = m as any;

interface DashboardProps {
  lastUpdated?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ lastUpdated }) => {
  const { t, toggleLanguage, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // SWR Hooks
  const { habits, isLoading: habitsLoading, toggleHabit, refreshHabits } = useHabits(selectedDate);
  const { user: userProfile, isLoading: userLoading } = useUser();
  const { stats: weeklyStats } = useWeeklyStats();
  
  const isLoading = habitsLoading && !habits.length;

  // Details Modal State
  const [selectedHabitDetails, setSelectedHabitDetails] = useState<HabitWithCompletion | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Edit/Add Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Suggestions State
  const [isSuggestionsDismissed, setIsSuggestionsDismissed] = useState(false);

  // Badge Modal State
  const [unlockedBadge, setUnlockedBadge] = useState<string | null>(null);

  useEffect(() => {
    ensureUserExists();
  }, []);

  useEffect(() => {
    const askForPermission = () => {
      if (!isNotificationSupported()) return;

      const userId = getCurrentUserId();
      const key = `notification_permission_asked_${userId}`;
      const hasAsked = localStorage.getItem(key);

      if (!hasAsked) {
        requestNotificationPermission((allowed) => {
          localStorage.setItem(key, 'true');
          if (allowed) hapticSuccess();
        });
      }
    };

    const timer = setTimeout(askForPermission, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      refreshHabits();
  }, [lastUpdated, refreshHabits]);

  const sortedHabits = useMemo(() => {
    const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
    return [...habits].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pA = priorityWeight[a.priority || 'medium'];
      const pB = priorityWeight[b.priority || 'medium'];
      return pB - pA;
    });
  }, [habits]);

  const progressPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    const completedCount = habits.filter(h => h.completed).length;
    return (completedCount / habits.length) * 100;
  }, [habits]);

  const handleManualRefresh = async () => {
    hapticImpact('light');
    setIsRefreshing(true);
    clearCache(); // Clear custom cache
    await refreshHabits();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleToggle = async (habitId: string) => {
    hapticImpact('medium');
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const willComplete = !habit.completed;
    if (willComplete) hapticSuccess();

    const currentCompletedCount = habits.filter(h => h.completed).length;
    const totalHabits = habits.length;
    
    if (willComplete && (currentCompletedCount + 1) === totalHabits && totalHabits > 0) {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.8 },
            colors: ['#60A5FA', '#F472B6', '#34D399', '#FBBF24'],
            gravity: 1.2,
            scalar: 1.2,
            ticks: 300
        });
    }

    const result = await toggleHabit(habitId);
    if (result && result.success && result.newBadge) {
        setUnlockedBadge(result.newBadge);
    }
  };

  const handleUpdateHabit = async (id: string, updates: Partial<Habit>) => {
      await updateHabit(id, updates);
      refreshHabits();
  };

  const handleQuickAdd = async (preset: PresetHabit) => {
    await createHabit(preset.title, preset.priority, preset.color, preset.category);
    refreshHabits();
  };

  const openDetails = (habit: HabitWithCompletion) => {
      setSelectedHabitDetails(habit);
      setIsDetailsOpen(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsEditModalOpen(true);
  };

  const handleSaveHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, { title, priority, color, category, reminder_time: reminderTime, reminder_date: reminderDate, reminder_days: reminderDays });
    } else {
      await createHabit(title, priority, color, category, reminderTime, reminderDate, reminderDays);
    }
    refreshHabits();
    setIsEditModalOpen(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (id: string) => {
    await deleteHabit(id);
    refreshHabits();
    setIsEditModalOpen(false);
    setEditingHabit(null);
  };

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const dateString = selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-col h-full w-full bg-background text-primary font-sans relative overflow-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-cyan-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-4 space-y-8 relative z-10 no-scrollbar">
        <div className="mx-4 mt-2 p-6 bg-surface backdrop-blur-xl rounded-[2.5rem] border border-white/50 dark:border-white/5 shadow-xl relative overflow-hidden">
           <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-3">
                 {(userProfile || userLoading) && (
                   <div className="flex items-center gap-3">
                       {userLoading && !userProfile ? (
                           <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                       ) : (
                           <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/50 dark:ring-white/10">
                               {userProfile?.first_name?.[0]?.toUpperCase() || 'U'}
                           </div>
                       )}
                       <div>
                           <div className="flex items-center gap-2">
                               <span className="font-bold text-sm text-primary leading-none">
                                   {userProfile?.first_name || 'User'}
                               </span>
                           </div>
                           <span className="text-xs text-secondary font-medium">Welcome back!</span>
                       </div>
                   </div>
                 )}
                 <div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-1 opacity-80">
                      {isToday ? t.today : t.selected_date}
                    </p>
                    <h1 className="text-3xl font-extrabold text-primary tracking-tight leading-none capitalize">
                      {dateString}
                    </h1>
                 </div>
              </div>

              <div className="flex flex-col items-end gap-3 z-10">
                 <div className="flex gap-2 items-center">
                    <button 
                      onClick={handleManualRefresh}
                      className={cn(
                        "w-10 h-10 rounded-full bg-white/50 dark:bg-slate-700/50 shadow-sm border border-white/60 dark:border-white/10 flex items-center justify-center text-secondary active:scale-95 transition-all",
                        isRefreshing && "animate-spin"
                      )}
                    >
                      <RefreshCw size={18} />
                    </button>

                    <button 
                      onClick={toggleLanguage}
                      className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-700/50 shadow-sm border border-white/60 dark:border-white/10 flex items-center justify-center text-secondary active:scale-95 transition-all"
                    >
                      <span className="text-xs font-bold">{language.toUpperCase()}</span>
                    </button>

                    <button 
                      onClick={toggleTheme}
                      className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-700/50 shadow-sm border border-white/60 dark:border-white/10 flex items-center justify-center text-secondary active:scale-95 transition-all overflow-hidden"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={theme}
                            initial={{ y: -20, opacity: 0, rotate: -90 }}
                            animate={{ y: 0, opacity: 1, rotate: 0 }}
                            exit={{ y: 20, opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            {theme === 'dark' ? <Moon size={18} className="fill-current" /> : <Sun size={18} className="fill-current" />}
                          </motion.div>
                      </AnimatePresence>
                    </button>

                    <button 
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className={cn(
                        "w-10 h-10 rounded-full shadow-sm border flex items-center justify-center transition-all duration-300",
                        isCalendarOpen 
                          ? "bg-accent text-white border-accent shadow-blue-200 dark:shadow-none" 
                          : "bg-white/50 dark:bg-slate-700/50 text-secondary border-white/60 dark:border-white/10"
                      )}
                    >
                      <CalendarIcon size={18} strokeWidth={2.5} />
                    </button>
                 </div>

                 <div className="flex items-center gap-2 bg-surface/50 dark:bg-slate-800/50 p-1.5 pr-3 rounded-full border border-gray-100 dark:border-white/5 backdrop-blur-md shadow-sm">
                    <div className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        Lvl {userProfile?.level || 1}
                    </div>
                    <div className="hidden sm:flex flex-col gap-1 min-w-[60px]">
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-indigo-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(userProfile?.xp || 0) % 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-secondary">
                        {(userProfile?.xp || 0) % 100} <span className="opacity-60 text-[9px]">/ 100 XP</span>
                    </span>
                 </div>
              </div>
           </div>

           <AnimatePresence>
              {isCalendarOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden border-b border-gray-200/30 dark:border-white/10"
                >
                  <CalendarStrip selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setIsCalendarOpen(false); }} />
                </motion.div>
              )}
           </AnimatePresence>

           <div className="flex flex-col items-center justify-center relative">
               <CircularProgress 
                  percentage={progressPercentage} 
                  size={220} 
                  strokeWidth={18}
                  color={progressPercentage === 100 ? "#10B981" : (theme === 'dark' ? '#22D3EE' : "#3B82F6")}
               />
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={progressPercentage}
                  className="mt-6 flex flex-col items-center text-center"
               >
                  <p className="text-primary font-bold text-xl tracking-tight">
                     {progressPercentage === 0 ? t.ready_to_start : 
                      progressPercentage === 100 ? t.progress_perfect : 
                      t.progress_keep_going}
                  </p>
                  <p className="text-secondary text-sm font-medium mt-1">
                     {progressPercentage === 100 ? t.progress_perfect_sub : t.progress_keep_going_sub}
                  </p>
               </motion.div>
           </div>
        </div>

        <section className="px-5">
             <div className="flex justify-between items-end mb-4 px-2">
                 <h2 className="text-xl font-extrabold text-primary tracking-tight">{t.habits_section_title}</h2>
                 {habits.length > 0 && (
                   <span className="text-xs font-bold bg-white/80 dark:bg-slate-800/80 backdrop-blur text-accent px-3 py-1.5 rounded-full shadow-sm border border-blue-50/50 dark:border-slate-700/50">
                      {habits.filter(h => h.completed).length} / {habits.length} {t.done_count}
                   </span>
                 )}
             </div>

            {isLoading ? (
              <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-24 rounded-[24px] bg-surface shadow-sm animate-pulse dark:bg-slate-800/50" />
                 ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {(!isLoading && habits.length === 0 && !isSuggestionsDismissed) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.9 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                      className="overflow-hidden mb-2 origin-top"
                    >
                       <HabitSuggestions 
                          onAdd={handleQuickAdd} 
                          onClose={() => setIsSuggestionsDismissed(true)} 
                       />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {habits.length === 0 && isSuggestionsDismissed && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-[2rem]"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600 mb-4">
                      <Inbox size={32} />
                    </div>
                    <p className="text-secondary font-medium">{t.noHabits}</p>
                    <p className="text-secondary/60 text-xs mt-1">Tap the + button to create one</p>
                  </motion.div>
                )}

                <AnimatePresence mode='popLayout'>
                  <div className="space-y-3">
                    {sortedHabits.map((habit) => (
                      <HabitCard 
                        key={habit.id} 
                        habit={habit} 
                        onToggle={handleToggle} 
                        onOpenDetails={openDetails}
                        onUpdate={handleUpdateHabit}
                        onEdit={handleEditHabit}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}
        </section>

        {habits.length > 0 && (
          <section className="px-5 pb-4">
              <WeeklyChart data={weeklyStats} />
          </section>
        )}
      </div>

      <HabitDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} habit={selectedHabitDetails} />
      <AddHabitModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingHabit(null); }} onSave={handleSaveHabit} onDelete={() => editingHabit && handleDeleteHabit(editingHabit.id)} initialHabit={editingHabit} />
      <BadgeUnlockModal badgeId={unlockedBadge} onClose={() => setUnlockedBadge(null)} />
      <BotSubscriptionBanner />
    </div>
  );
};
