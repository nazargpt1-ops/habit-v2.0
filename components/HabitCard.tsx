
import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, Droplet, Book, Activity, Moon, Star, Zap, ChevronRight, FileText, Clock } from 'lucide-react';
import { HabitWithCompletion, Priority } from '../types';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface HabitCardProps {
  habit: HabitWithCompletion;
  onToggle: (id: string) => void;
  onOpenDetails: (habit: HabitWithCompletion) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  droplet: <Droplet size={20} />,
  book: <Book size={20} />,
  activity: <Activity size={20} />,
  moon: <Moon size={20} />,
  star: <Star size={20} />,
  zap: <Zap size={20} />,
};

const PriorityIndicator = ({ priority }: { priority: Priority }) => {
  if (priority === 'high') return <div className="absolute left-0 top-3 bottom-3 w-1 bg-red-500 rounded-r-full z-20" />;
  if (priority === 'medium') return <div className="absolute left-0 top-3 bottom-3 w-1 bg-orange-400 rounded-r-full z-20" />;
  return <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-300 rounded-r-full z-20" />;
};

export const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggle, onOpenDetails }) => {
  const x = useMotionValue(0);
  const opacityRight = useTransform(x, [50, 100], [0, 1]);
  const opacityLeft = useTransform(x, [-50, -100], [0, 1]);
  
  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100 && !habit.completed) {
      // Swiped Right -> Complete
       triggerConfetti(event);
       onToggle(habit.id);
    } else if (info.offset.x < -100) {
      // Swiped Left -> Details
      onOpenDetails(habit);
    }
  };

  const triggerConfetti = (e: any) => {
      // Fallback center if event is drag
      const x = 0.5; 
      const y = 0.5;
      
      confetti({
        origin: { x, y },
        particleCount: 60,
        spread: 70,
        colors: [habit.color, '#ffffff']
      });
  };

  return (
    <div className="relative mb-3 h-20 overflow-hidden rounded-2xl group">
      {/* Background Layers for Swipe Actions */}
      <motion.div 
        style={{ opacity: opacityRight, backgroundColor: habit.color }} 
        className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 z-0 rounded-2xl"
      >
        <Check className="text-white" size={24} strokeWidth={4} />
      </motion.div>
      
      <motion.div 
        style={{ opacity: opacityLeft }} 
        className="absolute inset-y-0 right-0 w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-end pr-6 z-0 rounded-2xl"
      >
        <FileText className="text-[var(--tg-theme-text-color)]" size={24} />
      </motion.div>

      {/* Main Card Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2} // Bouncy feel
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative z-10 h-full w-full flex items-center justify-between p-4 bg-[var(--tg-theme-secondary-bg-color)] border border-transparent transition-colors",
          habit.completed ? "opacity-60" : "opacity-100"
        )}
      >
        <PriorityIndicator priority={habit.priority || 'medium'} />
        
        <div className="flex items-center gap-4 pl-3" onClick={() => onOpenDetails(habit)}>
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: habit.color }}
          >
            {iconMap[habit.icon || 'star'] || <Star size={20} />}
          </div>
          
          {/* Text */}
          <div className="flex flex-col">
            <span className={cn(
              "font-semibold text-base transition-all line-clamp-1 text-[var(--tg-theme-text-color)]",
              habit.completed && "line-through"
            )}>
              {habit.title}
            </span>
            <div className="flex items-center gap-2 text-xs text-[var(--tg-theme-hint-color)]">
              <span>{habit.category}</span>
              
              {/* Reminder Time Display */}
              {habit.reminder_time && (
                <span className="flex items-center gap-1 text-[var(--tg-theme-hint-color)]">
                   • <Clock size={10} /> {habit.reminder_time}
                </span>
              )}

              {habit.currentStreak !== undefined && habit.currentStreak > 0 && (
                 <span className="flex items-center text-orange-500 font-bold ml-1">
                   <Zap size={10} className="mr-0.5 fill-current" /> {habit.currentStreak}
                 </span>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox Button (Clickable alternative to swipe) */}
        <button
          onClick={(e) => {
              e.stopPropagation();
              if(!habit.completed) triggerConfetti(e);
              onToggle(habit.id);
          }}
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2",
            habit.completed 
              ? "bg-[var(--tg-theme-button-color)] border-[var(--tg-theme-button-color)]" 
              : "border-[var(--tg-theme-hint-color)]"
          )}
        >
          {habit.completed && <Check size={16} className="text-white" strokeWidth={3} />}
        </button>
      </motion.div>
    </div>
  );
};
