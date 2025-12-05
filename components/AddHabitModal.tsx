
import React, { useState, useEffect } from 'react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Priority, Translations, Habit } from '../types';
import { cn } from '../lib/utils';
import { hapticImpact } from '../lib/telegram';

const motion = m as any;

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]) => void;
  onDelete?: () => void;
  initialHabit?: Habit | null;
}

const COLOR_PALETTE: { color: string; category: string }[] = [
  { color: '#60A5FA', category: 'Health' }, // Blue
  { color: '#F472B6', category: 'Social' }, // Pink
  { color: '#34D399', category: 'Growth' }, // Green
  { color: '#A78BFA', category: 'Mind' },   // Purple
  { color: '#FBBF24', category: 'Work' },   // Yellow
  { color: '#F87171', category: 'Energy' }, // Red
];

export const AddHabitModal: React.FC<HabitModalProps> = ({ isOpen, onClose, onSave, onDelete, initialHabit }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedColorObj, setSelectedColorObj] = useState(COLOR_PALETTE[0]);
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen && initialHabit) {
      setTitle(initialHabit.title);
      setPriority(initialHabit.priority);
      const foundColor = COLOR_PALETTE.find(
        c => c.color === initialHabit.color || c.category === initialHabit.category || (initialHabit.category === 'Mindfulness' && c.category === 'Mind')
      );
      if (foundColor) setSelectedColorObj(foundColor);
      
      if (initialHabit.reminder_time) {
        setReminderEnabled(true);
        setReminderTime(initialHabit.reminder_time);
      } else {
        setReminderEnabled(false);
      }
      setIsConfirmingDelete(false);
    } else if (isOpen && !initialHabit) {
      setTitle('');
      setPriority('medium');
      setSelectedColorObj(COLOR_PALETTE[0]);
      setReminderEnabled(false);
      setReminderTime('09:00');
      setIsConfirmingDelete(false);
    }
  }, [isOpen, initialHabit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    hapticImpact('medium');
    const category = selectedColorObj.category;
    onSave(
        title, 
        priority, 
        selectedColorObj.color,
        category, 
        reminderEnabled ? reminderTime : undefined, 
        undefined, 
        undefined
    );
    onClose();
  };

  const isEditing = !!initialHabit;
  const priorityKeys: Record<Priority, keyof Translations> = {
    low: 'priority_low',
    medium: 'priority_medium',
    high: 'priority_high'
  };

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-[32px] shadow-2xl overflow-hidden h-[92vh] flex flex-col border-t border-white/10"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-xl font-bold text-primary">
                {isEditing ? t.edit_habit : t.create_habit_btn}
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-surface dark:bg-slate-800">
                <X size={20} className="text-secondary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
              {/* Title Input */}
              <div className="space-y-3">
                <label className="text-xs uppercase font-bold text-secondary tracking-wider">
                    {t.habit_title_label}
                </label>
                <input
                  autoFocus={!isEditing}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-surface dark:bg-slate-800/80 text-primary text-xl font-medium border-none outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-secondary/50"
                  placeholder={t.placeholder_title}
                />
              </div>

              {/* Priority Segmented Control */}
              <div className="space-y-3">
                 <label className="text-xs uppercase font-bold text-secondary tracking-wider">
                    {t.priority_label}
                 </label>
                 <div className="flex p-1 bg-surface dark:bg-slate-800/80 rounded-xl">
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                          priority === p 
                            ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                            : "text-secondary hover:text-primary"
                        )}
                      >
                         {t[priorityKeys[p]]}
                      </button>
                    ))}
                  </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                 <label className="text-xs uppercase font-bold text-secondary tracking-wider">
                    {t.category_label}
                 </label>
                 
                 <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
                  {COLOR_PALETTE.map((cObj) => {
                      const isSelected = selectedColorObj.color === cObj.color;
                      const categoryKey = ('cat_' + cObj.category.toLowerCase()) as keyof Translations;
                      const label = t[categoryKey] || cObj.category;

                      return (
                        <button
                          key={cObj.color}
                          type="button"
                          onClick={() => setSelectedColorObj(cObj)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl transition-all relative shrink-0 whitespace-nowrap",
                            isSelected 
                                ? "text-white shadow-lg scale-105" 
                                : "bg-surface dark:bg-slate-800/80 text-primary"
                          )}
                          style={{ 
                              backgroundColor: isSelected ? cObj.color : undefined,
                          }}
                        >
                            <div 
                                className={cn("w-3 h-3 rounded-full border border-white/50", isSelected ? "bg-white" : "")}
                                style={{ backgroundColor: isSelected ? undefined : cObj.color }} 
                            />
                            <span className="font-bold text-sm">{label}</span>
                        </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart Reminder Section */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-surface dark:bg-slate-800/80 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-accent shadow-sm">
                            <Bell size={20} fill={reminderEnabled ? "currentColor" : "none"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-primary">{t.enable_reminder}</span>
                            <span className="text-xs text-secondary">{t.get_notified}</span>
                        </div>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={() => {
                            setReminderEnabled(!reminderEnabled);
                            hapticImpact('light');
                        }}
                        className={cn(
                            "w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative focus:outline-none",
                            reminderEnabled ? "bg-accent" : "bg-gray-300 dark:bg-slate-600"
                        )}
                    >
                        <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 700, damping: 30 }}
                            className="w-5 h-5 bg-white rounded-full shadow-md"
                            style={{ 
                                x: reminderEnabled ? 20 : 0 
                            }}
                        />
                    </button>
                 </div>

                 <AnimatePresence>
                    {reminderEnabled && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-3 p-4 bg-surface dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-white/5">
                                <Clock size={20} className="text-secondary" />
                                <span className="text-sm font-semibold text-primary flex-1">
                                    {t.remind_at}
                                </span>
                                <div className="flex items-center justify-end">
                                  <div className="relative">
                                    <input
                                      type="time"
                                      value={reminderTime}
                                      onChange={(e) => setReminderTime(e.target.value)}
                                      className="
                                        appearance-none
                                        bg-gray-100 dark:bg-slate-700
                                        hover:bg-gray-200 dark:hover:bg-slate-600
                                        text-primary
                                        text-2xl 
                                        font-bold 
                                        rounded-xl 
                                        px-6 
                                        py-3 
                                        h-16
                                        min-w-[160px] 
                                        text-center 
                                        outline-none 
                                        border-2 border-transparent focus:border-accent
                                        cursor-pointer
                                        transition-all
                                      "
                                    />
                                  </div>
                                </div>
                            </div>
                            
                            {/* Timezone Indicator */}
                            <div className="px-2 mt-1.5 text-right">
                                <p className="text-[10px] text-secondary/50 font-medium tracking-wide">
                                  Timezone: {userTimezone}
                                </p>
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-background space-y-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!title.trim()}
                  className="w-full py-4 rounded-xl bg-accent text-white dark:text-slate-900 font-bold text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {isEditing ? t.save_changes : t.save_habit}
                </button>
                
                {isEditing && onDelete && (
                  <div className="flex flex-col gap-2">
                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsConfirmingDelete(true);
                        }}
                        className="w-full py-3 text-red-500 font-medium bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={20} />
                        {t.delete_habit}
                      </button>
                    ) : (
                      <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsConfirmingDelete(false);
                          }}
                          className="flex-1 py-3 text-secondary font-medium bg-gray-100 dark:bg-slate-700 rounded-xl"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onDelete();
                            onClose();
                          }}
                          className="flex-1 py-3 text-white font-bold bg-red-500 hover:bg-red-600 rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                          <Trash2 size={20} />
                          {t.confirm}
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
