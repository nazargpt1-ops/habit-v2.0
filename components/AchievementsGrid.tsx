import React, { useMemo } from 'react';
import { motion as m } from 'framer-motion';
import { Footprints, Flame, Trophy, Sunrise, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { User, Translations } from '../types';
import { cn } from '../lib/utils';

const motion = m as any;

interface AchievementsGridProps {
  user: User | null;
  totalCompleted: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export const AchievementsGrid: React.FC<AchievementsGridProps> = ({ user, totalCompleted }) => {
  const { t } = useLanguage();

  const achievements = useMemo(() => [
    {
      id: 'first_step',
      icon: Footprints,
      color: '#3B82F6', // Blue
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
      titleKey: 'badge_first_step_title',
      descKey: 'badge_first_step_desc',
      isUnlocked: totalCompleted > 0
    },
    {
      id: 'week_streak',
      icon: Flame,
      color: '#F97316', // Orange
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-600 dark:text-orange-400',
      titleKey: 'badge_week_streak_title',
      descKey: 'badge_week_streak_desc',
      isUnlocked: (user?.current_streak || 0) >= 7
    },
    {
      id: 'level_5',
      icon: Trophy,
      color: '#EAB308', // Yellow
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      titleKey: 'badge_level_5_title',
      descKey: 'badge_level_5_desc',
      isUnlocked: (user?.level || 1) >= 5
    },
    {
      id: 'early_bird',
      icon: Sunrise,
      color: '#F43F5E', // Rose
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      textColor: 'text-rose-600 dark:text-rose-400',
      titleKey: 'badge_early_bird_title',
      descKey: 'badge_early_bird_desc',
      // Proxy logic: Unlock if they are committed (e.g., > 10 completions) since we don't track time strictly in this view
      isUnlocked: totalCompleted >= 10 
    }
  ], [user, totalCompleted]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold text-primary tracking-tight">
          {t.achievements_title}
        </h2>
        <span className="text-xs font-bold text-secondary bg-surface/50 dark:bg-slate-800/50 px-2.5 py-1 rounded-md border border-white/5">
          {achievements.filter(a => a.isUnlocked).length} / {achievements.length}
        </span>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        {achievements.map((badge) => (
          <motion.div
            key={badge.id}
            variants={item}
            className={cn(
              "relative p-4 rounded-[24px] border transition-all duration-300 overflow-hidden group backdrop-blur-md",
              badge.isUnlocked 
                ? "bg-surface dark:bg-slate-800 border-white/60 dark:border-white/5 shadow-sm" 
                : "bg-gray-100/50 dark:bg-slate-800/40 border-transparent"
            )}
          >
            {/* Locked Overlay */}
            {!badge.isUnlocked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100/60 dark:bg-slate-900/60 backdrop-blur-[2px]">
                 <div className="flex flex-col items-center gap-1 opacity-70">
                    <Lock size={20} className="text-secondary" />
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{t.badge_locked}</span>
                 </div>
              </div>
            )}

            <div className={cn("flex flex-col h-full", !badge.isUnlocked && "opacity-40 grayscale")}>
              <div className="flex justify-between items-start mb-3">
                 <div 
                   className={cn(
                     "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner", 
                     badge.bg, 
                     badge.textColor
                   )}
                 >
                    <badge.icon size={20} strokeWidth={2.5} />
                 </div>
              </div>
              
              <div className="mt-auto">
                <h3 className="font-bold text-primary text-sm leading-tight mb-1">
                   {t[badge.titleKey as keyof Translations]}
                </h3>
                <p className="text-[10px] text-secondary font-medium leading-relaxed">
                   {t[badge.descKey as keyof Translations]}
                </p>
              </div>
            </div>

            {/* Subtle glow effect for unlocked */}
            {badge.isUnlocked && (
               <div 
                 className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                 style={{ backgroundColor: badge.color }}
               />
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
