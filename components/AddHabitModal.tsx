import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    hapticImpact('medium');
    
    // Fix: Extract category string
    const category = selectedColorObj.category;

    onSave(
        title, 
        priority, 
        selectedColorObj.color,
        category, 
        reminderEnabled ? reminderTime : undefined, 
        reminderEnabled ? reminderDate : undefined,
        undefined
    );
    
    // Reset
    setTitle('');
    setPriority('medium');
    setReminderEnabled(false);
    setReminderTime('09:00');
    setReminderDate('');
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

              {/* Reminder Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--tg-theme-hint-color)]">SET REMINDER</label>
                  <button 
                    type="button" 
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`w-10 h-6 rounded-full transition-all ${ reminderEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {reminderEnabled && (
                  <div className="space-y-2">
                    <input 
                      type="date" 
                      value={reminderDate} 
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border border-[var(--tg-theme-hint-color)]"
                    />
                    <input 
                      type="time" 
                      value={reminderTime} 
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border border-[var(--tg-theme-hint-color)]"
                    />
                  </div>
                )}
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