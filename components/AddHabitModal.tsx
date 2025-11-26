
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Priority, Translations } from '../types';
import { cn } from '../lib/utils';
import { hapticImpact } from '../lib/telegram';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]) => void;
}

const COLOR_PALETTE: { color: string; labelKey: keyof Translations; category: string }[] = [
  { color: '#60A5FA', labelKey: 'colorHealth', category: 'Health' }, // Blue
  { color: '#F472B6', labelKey: 'colorSocial', category: 'Social' }, // Pink
  { color: '#34D399', labelKey: 'colorGrowth', category: 'Growth' }, // Green
  { color: '#A78BFA', labelKey: 'colorMind', category: 'Mindfulness' },   // Purple
  { color: '#FBBF24', labelKey: 'colorWork', category: 'Work' },   // Yellow
  { color: '#F87171', labelKey: 'colorEnergy', category: 'Energy' }, // Red
];

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedColorObj, setSelectedColorObj] = useState(COLOR_PALETTE[0]);
  
  // Reminder State
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');

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
        undefined, // Date is optional/removed for now to focus on daily habits
        undefined
    );
    
    // Reset
    setTitle('');
    setPriority('medium');
    setReminderEnabled(false);
    setReminderTime('09:00');
    onClose();
  };

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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[var(--tg-theme-bg-color)] rounded-t-[32px] shadow-2xl overflow-hidden h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-[var(--tg-theme-secondary-bg-color)]">
              <h2 className="text-xl font-bold text-[var(--tg-theme-text-color)]">
                {t.newHabitTitle}
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-[var(--tg-theme-secondary-bg-color)]">
                <X size={20} className="text-[var(--tg-theme-hint-color)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
              {/* Title Input */}
              <div className="space-y-3">
                <label className="text-xs uppercase font-bold text-[var(--tg-theme-hint-color)] tracking-wider">
                    {t.habitTitle}
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] text-xl font-medium border-none outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/20 transition-all placeholder:text-[var(--tg-theme-hint-color)]/50"
                  placeholder="e.g. Read Books"
                />
              </div>

              {/* Priority Segmented Control */}
              <div className="space-y-3">
                 <label className="text-xs uppercase font-bold text-[var(--tg-theme-hint-color)] tracking-wider">
                    {t.priority}
                 </label>
                 <div className="flex p-1 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl">
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                          priority === p 
                            ? "bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] shadow-sm" 
                            : "text-[var(--tg-theme-hint-color)]"
                        )}
                      >
                         {t[p]}
                      </button>
                    ))}
                  </div>
              </div>

              {/* Category (formerly Color) Selection - Scrollable Chips */}
              <div className="space-y-3">
                 <label className="text-xs uppercase font-bold text-[var(--tg-theme-hint-color)] tracking-wider">
                    {t.category}
                 </label>
                 
                 <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
                  {COLOR_PALETTE.map((cObj) => {
                      const isSelected = selectedColorObj.color === cObj.color;
                      return (
                        <button
                          key={cObj.color}
                          type="button"
                          onClick={() => setSelectedColorObj(cObj)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl transition-all relative shrink-0",
                            isSelected 
                                ? "text-white shadow-lg scale-105" 
                                : "bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]"
                          )}
                          style={{ 
                              backgroundColor: isSelected ? cObj.color : undefined,
                          }}
                        >
                            <div 
                                className={cn("w-3 h-3 rounded-full border border-white/50", isSelected ? "bg-white" : "")}
                                style={{ backgroundColor: isSelected ? undefined : cObj.color }} 
                            />
                            <span className="font-bold text-sm">{t[cObj.labelKey]}</span>
                        </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart Reminder Section */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm">
                            <Bell size={20} fill={reminderEnabled ? "currentColor" : "none"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[var(--tg-theme-text-color)]">{t.enableReminder}</span>
                            <span className="text-xs text-[var(--tg-theme-hint-color)]">Get notified daily</span>
                        </div>
                    </div>
                    
                    {/* iOS Style Switch */}
                    <button 
                        type="button"
                        onClick={() => {
                            setReminderEnabled(!reminderEnabled);
                            hapticImpact('light');
                        }}
                        className={cn(
                            "w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative focus:outline-none",
                            reminderEnabled ? "bg-[var(--tg-theme-button-color)]" : "bg-gray-300 dark:bg-gray-600"
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
                            <div className="flex items-center gap-3 p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl border border-[var(--tg-theme-hint-color)]/10">
                                <Clock size={20} className="text-[var(--tg-theme-hint-color)]" />
                                <span className="text-sm font-semibold text-[var(--tg-theme-text-color)] flex-1">
                                    {t.remindAt || "Remind at"}
                                </span>
                                <div className="flex items-center justify-end">
                                  <div className="relative">
                                    {/* Visual Fake Button / Wrapper */}
                                    <input
                                      type="time"
                                      value={reminderTime}
                                      onChange={(e) => setReminderTime(e.target.value)}
                                      className="
                                        appearance-none
                                        bg-gray-100 
                                        hover:bg-gray-200 
                                        text-gray-900 
                                        text-2xl 
                                        font-bold 
                                        rounded-xl 
                                        px-6 
                                        py-3 
                                        h-16
                                        min-w-[160px] 
                                        text-center 
                                        outline-none 
                                        border-2 border-transparent focus:border-blue-500
                                        cursor-pointer
                                        transition-all
                                      "
                                    />
                                  </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
              </div>

            </div>

            {/* Footer / CTA */}
            <div className="p-6 border-t border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)]">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!title.trim()}
                  className="w-full py-4 rounded-xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-bold text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {t.save}
                </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
