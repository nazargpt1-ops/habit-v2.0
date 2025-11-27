
import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Check, Droplet, Book, Activity, Moon, Star, Zap, Flame, Bell } from 'lucide-react';
import { HabitWithCompletion, Habit } from '../types';
import { cn, hexToRgba } from '../lib/utils';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';

interface HabitCardProps {
  habit: HabitWithCompletion;
  onToggle: (id: string) => void;
  onOpenDetails: (habit: HabitWithCompletion) => void;
  onUpdate: (id: string, updates: Partial<Habit>) => void;
  onEdit: (habit: Habit) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  droplet: <Droplet size={24} strokeWidth={2.5} />,
  book: <Book size={24} strokeWidth={2.5} />,
  activity: <Activity size={24} strokeWidth={2.5} />,
  moon: <Moon size={24} strokeWidth={2.5} />,
  star: <Star size={24} strokeWidth={2.5} />,
  zap: <Zap size={24} strokeWidth={2.5} />,
};

export const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggle, onOpenDetails, onUpdate, onEdit }) => {
  const { t } = useLanguage();
  const x = useMotionValue(0);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 80 && !habit.completed) {
       triggerConfetti(event);
       onToggle(habit.id);
    } else if (info.offset.x < -80) {
      onOpenDetails(habit);
    }
  };

  const triggerConfetti = (e: any) => {
      const x = e.clientX ? e.clientX / window.innerWidth : 0.5;
      const y = e.clientY ? e.clientY / window.innerHeight : 0.5;
      
      confetti({
        origin: { x, y },
        particleCount: 40,
        spread: 70,
        colors: [habit.color, '#fbbf24', '#ffffff'],
        disableForReducedMotion: true,
        ticks: 200,
        gravity: 1.2,
      });
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent bubbling issues
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.selectionChanged();
      }
      setIsEditingTime(true);
  };

  useEffect(() => {
    if (isEditingTime && inputRef.current) {
        // Attempt to focus and open the picker
        inputRef.current.focus();
        
        // Use showPicker() if supported (modern browsers/mobile)
        if ('showPicker' in inputRef.current) {
             try {
                 (inputRef.current as any).showPicker();
             } catch (err) {
                 // Fallback if showPicker fails or is not allowed without user activation
             }
        }
    }
  }, [isEditingTime]);

  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      if (newTime && newTime !== habit.reminder_time) {
          if (window.Telegram?.WebApp?.HapticFeedback) {
             window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
          onUpdate(habit.id, { reminder_time: newTime });
      }
      setIsEditingTime(false);
  };
  
  // Also handle manual Enter key for desktop testing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.currentTarget.blur();
      }
  };

  // Helper to get translated category
  const getCategoryLabel = (cat: string) => {
      let key = cat.toLowerCase();
      // Simple normalization if needed, e.g. 'Mindfulness' -> 'mind'
      if (key === 'mindfulness') key = 'mind';
      
      const tKey = ('cat_' + key) as keyof typeof t;
      return t[tKey] || cat;
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      style={{ x }}
      className="relative mb-3 group touch-pan-y select-none"
    >
      <div 
        onClick={() => onEdit(habit)}
        className={cn(
            "relative z-10 w-full p-4 flex items-center justify-between bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-transparent transition-all duration-300 cursor-pointer",
            !habit.completed && "hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.1)]",
            habit.completed ? "opacity-60 saturate-50" : "opacity-100"
        )}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {/* Icon with Pastel Background */}
          <div 
            className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm"
            style={{ 
                backgroundColor: hexToRgba(habit.color, 0.15),
                color: habit.color 
            }}
          >
            {iconMap[habit.icon || 'star'] || <Star size={24} strokeWidth={2.5} />}
          </div>
          
          {/* Text Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "font-bold text-gray-800 text-[17px] leading-tight truncate transition-all",
                  habit.completed && "line-through text-gray-400"
                )}>
                  {habit.title}
                </span>
                
                {/* Streak Badge */}
                {habit.currentStreak !== undefined && habit.currentStreak > 0 && !habit.completed && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100/80 text-orange-600 rounded-full text-[12px] font-bold shadow-sm border border-orange-200/50">
                        <Flame size={14} className="fill-orange-500 text-orange-600" />
                        <span>{habit.currentStreak}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Category Badge */}
              <span className="text-xs text-gray-500 font-semibold bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                {getCategoryLabel(habit.category)}
              </span>

              {/* Reminder Badge (Interactive) */}
              {habit.reminder_time && (
                 <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBadgeClick}
                    className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium bg-gray-50/50 px-2.5 py-1 rounded-lg border border-gray-100/50 min-h-[28px] min-w-[60px] justify-center hover:bg-gray-100/80 transition-colors relative"
                 >
                    {isEditingTime ? (
                        <input
                            ref={inputRef}
                            type="time"
                            defaultValue={habit.reminder_time}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={handleTimeBlur}
                            onKeyDown={handleKeyDown}
                            className="bg-transparent border-none outline-none w-full h-full text-[11px] font-medium text-gray-600 leading-none text-center p-0 m-0 absolute inset-0 opacity-100"
                            style={{ colorScheme: 'light' }}
                        />
                    ) : (
                        <>
                            <Bell size={11} className="fill-gray-300" />
                            <span>{habit.reminder_time}</span>
                        </>
                    )}
                 </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Circular Checkbox */}
        <button
          onClick={(e) => {
              e.stopPropagation();
              if(!habit.completed) triggerConfetti(e);
              onToggle(habit.id);
          }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ml-2 active:scale-90",
            habit.completed 
              ? "bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.4)] scale-105" 
              : "bg-gray-100 hover:bg-gray-200"
          )}
        >
          {habit.completed 
            ? <Check size={24} className="text-white drop-shadow-sm" strokeWidth={3.5} />
            : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
          }
        </button>
      </div>
    </motion.div>
  );
};
