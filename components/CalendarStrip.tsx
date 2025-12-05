
import React from 'react';
import { motion as m } from 'framer-motion';
import { getWeekDays, isSameDay, cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const motion = m as any;

interface CalendarStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({ selectedDate, onSelectDate }) => {
  const { t } = useLanguage();
  const days = getWeekDays(new Date());

  const dayLabels = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  return (
    <div className="w-full overflow-x-auto py-4 px-2 no-scrollbar">
      <div className="flex justify-between items-center min-w-full">
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-2xl mx-1 cursor-pointer transition-all duration-300 border",
                isSelected 
                  ? "bg-accent border-accent shadow-lg scale-105" 
                  : "bg-white/50 dark:bg-slate-700/50 border-transparent dark:border-white/5"
              )}
            >
              <span className={cn(
                "text-xs mb-1 font-medium",
                isSelected ? "text-white dark:text-slate-900" : "text-secondary"
              )}>
                {dayLabels[date.getDay()]}
              </span>
              <span className={cn(
                "text-lg font-bold",
                isSelected ? "text-white dark:text-slate-900" : "text-primary",
                isToday && !isSelected && "text-accent"
              )}>
                {date.getDate()}
              </span>
              {isToday && (
                <div className={cn(
                  "w-1 h-1 rounded-full mt-1",
                  isSelected ? "bg-white dark:bg-slate-900" : "bg-accent"
                )} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
