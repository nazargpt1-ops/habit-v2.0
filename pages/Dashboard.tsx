import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { CalendarStrip } from '../components/CalendarStrip';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitDetailsModal } from '../components/HabitDetailsModal';
import { CircularProgress } from '../components/CircularProgress';
import { WeeklyChart } from '../components/WeeklyChart';
import { useLanguage } from '../context/LanguageContext';
import { fetchHabitsWithCompletions, toggleHabitCompletion, createHabit, fetchWeeklyStats } from '../services/habitService';
import { HabitWithCompletion, Priority } from '../types';
import { getTelegramUser, hapticImpact, hapticSuccess } from '../lib/telegram';

export const Dashboard: React.FC = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{day: string, count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Details Modal State
  const [selectedHabit, setSelectedHabit] = useState<HabitWithCompletion | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const user = getTelegramUser();
    const data = await fetchHabitsWithCompletions(user.id, selectedDate);
    const stats = await fetchWeeklyStats(user.id);
    setHabits(data);
    setWeeklyStats(stats);
    setIsLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort Habits: Uncompleted first, then by priority
  const sortedHabits = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return [...habits].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pA = priorityWeight[a.priority || 'medium'];
      const pB = priorityWeight[b.priority || 'medium'];
      return pB - pA;
    });
  }, [habits]);

  // Calculate Progress for Hero Section
  const progressPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    const completedCount = habits.filter(h => h.completed).length;
    return (completedCount / habits.length) * 100;
  }, [habits]);

  const handleToggle = async (habitId: string) => {
    hapticImpact('light');
    
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

  // Date formatting for Header
  const dateString = selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAFA] text-gray-900 font-sans relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-28 pt-4 space-y-8 relative z-10 no-scrollbar">
        
        {/* Glass Hero Card */}
        <div className="mx-4 mt-2 p-6 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-xl relative overflow-hidden transition-all duration-300">
           
           {/* Header Row: Date & Controls */}
           <div className="flex justify-between items-start mb-6">
              <div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                   {isToday ? t.today : 'Selected'}
                 </p>
                 <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                   {dateString}
                 </h1>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={toggleLanguage}
                   className="w-10 h-10 rounded-full bg-white/50 hover:bg-white shadow-sm border border-white/60 flex items-center justify-center text-gray-600 active:scale-95 transition-all"
                 >
                   <span className="text-xs font-bold uppercase">{language}</span>
                 </button>
                 <button 
                   onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                   className={`w-10 h-10 rounded-full shadow-sm border flex items-center justify-center transition-all duration-300 ${isCalendarOpen ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' : 'bg-white/50 hover:bg-white text-gray-600 border-white/60'}`}
                 >
                   <CalendarIcon size={18} strokeWidth={2.5} />
                 </button>
              </div>
           </div>

           {/* Collapsible Calendar inside Card */}
           <AnimatePresence>
              {isCalendarOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden border-b border-gray-200/30"
                >
                  <CalendarStrip selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setIsCalendarOpen(false); }} />
                </motion.div>
              )}
           </AnimatePresence>

           {/* Circular Progress & Text */}
           <div className="flex flex-col items-center justify-center relative">
               <CircularProgress 
                  percentage={progressPercentage} 
                  size={220} 
                  strokeWidth={18}
                  color={progressPercentage === 100 ? "#10B981" : "#3B82F6"}
               />
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={progressPercentage}
                  className="mt-6 flex flex-col items-center text-center"
               >
                  <p className="text-gray-900 font-bold text-xl tracking-tight">
                     {progressPercentage === 0 ? "Ready to start?" : 
                      progressPercentage === 100 ? "Crushed it! 🎉" : 
                      "Keep the momentum!"}
                  </p>
                  <p className="text-gray-500 text-sm font-medium mt-1">
                     {progressPercentage === 100 ? "You completed all habits" : "One step at a time"}
                  </p>
               </motion.div>
           </div>
        </div>

        {/* Habit List */}
        <section className="px-5">
             <div className="flex justify-between items-end mb-4 px-2">
                 <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">{t.habitsTab}</h2>
                 <span className="text-xs font-bold bg-white/80 backdrop-blur text-blue-600 px-3 py-1.5 rounded-full shadow-sm border border-blue-50/50">
                    {habits.filter(h => h.completed).length} / {habits.length} Done
                 </span>
             </div>

            {isLoading ? (
              <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-24 rounded-[24px] bg-white shadow-sm animate-pulse" />
                 ))}
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {sortedHabits.length > 0 ? (
                  <div className="space-y-3">
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
                    className="flex flex-col items-center justify-center py-10 opacity-50"
                  >
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 animate-pulse" />
                    <p className="text-gray-400 font-medium">{t.noHabits}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
        </section>

        {/* Weekly Overview Chart */}
        <section className="px-5 pb-4">
            <WeeklyChart data={weeklyStats} />
        </section>

      </div>

      {/* Floating Add Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-16 h-16 rounded-full bg-black text-white flex items-center justify-center shadow-2xl shadow-black/30 border-4 border-white/20 backdrop-blur-sm"
      >
        <Plus size={32} strokeWidth={2.5} />
      </motion.button>

      {/* Modals */}
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