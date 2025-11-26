import React from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Check, Droplet, Book, Activity, Moon, Star, Zap, Flame } from 'lucide-react';
import { HabitWithCompletion } from '../types';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface HabitCardProps {
  habit: HabitWithCompletion;
  onToggle: (id: string) => void;
  onOpenDetails: (habit: HabitWithCompletion) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  droplet: <Droplet size={24} strokeWidth={2.5} />,
  book: <Book size={24} strokeWidth={2.5} />,
  activity: <Activity size={24} strokeWidth={2.5} />,
  moon: <Moon size={24} strokeWidth={2.5} />,
  star: <Star size={24} strokeWidth={2.5} />,
  zap: <Zap size={24} strokeWidth={2.5} />,
};

// Helper to convert hex to rgba for pastel backgrounds
const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggle, onOpenDetails }) => {
  const x = useMotionValue(0);
  
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

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.96 }}
      style={{ x }}
      className="relative mb-3 group touch-pan-y"
    >
      <div 
        onClick={() => onOpenDetails(habit)}
        className={cn(
            "relative z-10 w-full p-4 flex items-center justify-between bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-transparent transition-all duration-300",
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
                
                {/* Streak Badge - Juicier version */}
                {habit.currentStreak !== undefined && habit.currentStreak > 0 && !habit.completed && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100/80 text-orange-600 rounded-full text-[12px] font-bold shadow-sm border border-orange-200/50">
                        <Flame size={14} className="fill-orange-500 text-orange-600" />
                        <span>{habit.currentStreak}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{habit.category}</span>
              {habit.reminder_time && (
                 <>
                   <span className="text-gray-300 text-[10px]">•</span>
                   <span className="text-xs text-gray-400 font-medium">{habit.reminder_time}</span>
                 </>
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
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ml-2",
            habit.completed 
              ? "bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.4)] scale-105" 
              : "bg-gray-100 hover:bg-gray-200 active:scale-90"
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
