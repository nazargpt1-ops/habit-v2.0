
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Zap, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { HabitWithCompletion, Completion } from '../types';
import { cn } from '../lib/utils';
import { fetchHabitHistory, updateCompletionNote } from '../services/habitService';

interface HabitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitWithCompletion | null;
}

export const HabitDetailsModal: React.FC<HabitDetailsModalProps> = ({ isOpen, onClose, habit }) => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<Completion[]>([]);
  const [note, setNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (habit && isOpen) {
      setNote(habit.todayNote || '');
      fetchHabitHistory(habit.id).then(setHistory);
    }
  }, [habit, isOpen]);

  const handleSaveNote = async () => {
      if(!habit?.completionId) return;
      setIsSavingNote(true);
      await updateCompletionNote(habit.completionId, note);
      setIsSavingNote(false);
  };

  if (!habit) return null;

  // Generate last 30 days for heatmap
  const generateHeatmap = () => {
      const days = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const iso = d.toISOString().split('T')[0];
          const isCompleted = history.some(h => h.date === iso);
          days.push({ date: d, isCompleted });
      }
      return days;
  };

  const heatmapData = generateHeatmap();

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
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className="fixed inset-4 z-[70] bg-[var(--tg-theme-bg-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[var(--tg-theme-secondary-bg-color)] flex justify-between items-start">
               <div>
                   <h2 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">{habit.title}</h2>
                   <p className="text-[var(--tg-theme-hint-color)] text-sm">{habit.category} • {t[habit.priority]}</p>
               </div>
               <button onClick={onClose} className="p-2 bg-[var(--tg-theme-secondary-bg-color)] rounded-full">
                   <X size={20} className="text-[var(--tg-theme-hint-color)]" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Stats Row */}
                <div className="flex gap-4">
                    <div className="flex-1 bg-[var(--tg-theme-secondary-bg-color)] p-4 rounded-2xl flex flex-col items-center">
                        <Zap size={24} className="text-orange-500 mb-2" />
                        <span className="text-2xl font-bold">{habit.currentStreak || 0}</span>
                        <span className="text-xs text-[var(--tg-theme-hint-color)] uppercase">{t.streak}</span>
                    </div>
                     <div className="flex-1 bg-[var(--tg-theme-secondary-bg-color)] p-4 rounded-2xl flex flex-col items-center">
                        <Calendar size={24} className="text-[var(--tg-theme-button-color)] mb-2" />
                        <span className="text-2xl font-bold">{history.length}</span>
                        <span className="text-xs text-[var(--tg-theme-hint-color)] uppercase">Total</span>
                    </div>
                </div>

                {/* History Heatmap */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--tg-theme-hint-color)] uppercase mb-3">{t.history} (30 Days)</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {heatmapData.map((d, i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "aspect-square rounded-md flex items-center justify-center text-[10px]",
                                    d.isCompleted 
                                      ? "text-white font-bold"
                                      : "bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)]"
                                )}
                                style={{ backgroundColor: d.isCompleted ? habit.color : undefined }}
                            >
                                {d.date.getDate()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes Input */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--tg-theme-hint-color)] uppercase mb-3 flex items-center gap-2">
                        <FileText size={16} /> {t.notes}
                    </h3>
                    {habit.completed ? (
                        <div className="relative">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={t.addNote}
                                className="w-full h-24 p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] resize-none outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/20"
                            />
                            <button 
                                onClick={handleSaveNote}
                                className="absolute bottom-2 right-2 px-3 py-1 bg-[var(--tg-theme-button-color)] text-white text-xs rounded-lg font-medium"
                            >
                                {isSavingNote ? '...' : 'Save'}
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)] text-sm text-center italic">
                            Complete the habit to add a note.
                        </div>
                    )}
                </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
