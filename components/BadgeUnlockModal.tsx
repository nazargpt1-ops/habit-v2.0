
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Footprints, Sunrise } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { Translations } from '../types';

interface BadgeUnlockModalProps {
  badgeId: string | null;
  onClose: () => void;
}

// Map IDs to Icons and Styles
const badgeConfig: Record<string, { icon: any, color: string, bg: string }> = {
  'first_step': { icon: Footprints, color: '#3B82F6', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'week_streak': { icon: Flame, color: '#F97316', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  'level_5': { icon: Trophy, color: '#EAB308', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  'early_bird': { icon: Sunrise, color: '#F43F5E', bg: 'bg-rose-100 dark:bg-rose-900/40' },
};

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badgeId, onClose }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (badgeId) {
      // Trigger confetti loop
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#60A5FA', '#F472B6', '#FBBF24']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#60A5FA', '#F472B6', '#FBBF24']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Also trigger haptic
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }
  }, [badgeId]);

  if (!badgeId) return null;

  const config = badgeConfig[badgeId];
  // If we receive a badge ID that isn't in our config (e.g. future ones), return null or handle gracefully
  if (!config) return null;

  const Icon = config.icon;
  // Dynamic keys for translation lookups
  const titleKey = `badge_${badgeId}_title` as keyof Translations;
  const descKey = `badge_${badgeId}_desc` as keyof Translations;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
           initial={{ scale: 0.5, opacity: 0, y: 100 }}
           animate={{ scale: 1, opacity: 1, y: 0 }}
           exit={{ scale: 0.8, opacity: 0, y: 100 }}
           transition={{ type: "spring", damping: 12, stiffness: 100 }}
           className="relative bg-white dark:bg-slate-800 w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl border border-white/10 overflow-hidden"
        >
           {/* Background Glow */}
           <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-gray-50/50 dark:to-slate-900/50 pointer-events-none" />
           <div 
             className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-32 h-32 blur-[60px] opacity-40 pointer-events-none"
             style={{ backgroundColor: config.color }}
           />
           
           <div className="relative z-10 flex flex-col items-center">
              <motion.div 
                 initial={{ scale: 0, rotate: -45 }}
                 animate={{ scale: 1, rotate: 0 }}
                 transition={{ delay: 0.1, type: "spring" }}
                 className={cn("w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl border-4 border-white dark:border-slate-700", config.bg)}
              >
                 <Icon size={56} color={config.color} strokeWidth={2.5} />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black text-primary mb-2 tracking-tight"
              >
                Badge Unlocked!
              </motion.h2>
              
              <motion.h3 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.3 }}
                 className="text-lg font-bold mb-2"
                 style={{ color: config.color }}
              >
                 {t[titleKey]}
              </motion.h3>

              <motion.p 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.4 }}
                 className="text-secondary text-sm font-medium mb-8 leading-relaxed px-4"
              >
                 {t[descKey]}
              </motion.p>

              <motion.button
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={onClose}
                 className="w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-transform text-lg"
                 style={{ backgroundColor: config.color, boxShadow: `0 10px 30px -10px ${config.color}` }}
              >
                 Awesome!
              </motion.button>
           </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
