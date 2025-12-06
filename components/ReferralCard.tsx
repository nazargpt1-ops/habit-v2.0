
import React from 'react';
import { motion as m } from 'framer-motion';
import { Users, Share2, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUserId } from '../services/habitService';

const motion = m as any;

export const ReferralCard: React.FC = () => {
  const { t } = useLanguage();
  const userId = getCurrentUserId();
  const botUsername = 'calendar_for_chenge_bot'; 

  const handleInvite = () => {
    // 1. Haptic Feedback
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    // 2. Generate Referral Link
    // Format: https://t.me/BOT_NAME/APP_NAME?startapp=USERID
    const inviteLink = `https://t.me/${botUsername}/HabitFlow?startapp=${userId}`;
    const text = t.referral_share_text;
    
    // 3. Construct Telegram Share URL
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;

    // 4. Open Link
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
        (window as any).Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
        window.open(shareUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-[2rem] shadow-xl group cursor-pointer"
      onClick={handleInvite}
    >
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-900 dark:via-purple-900 dark:to-indigo-900" />
      
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 p-6 flex items-center justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg">
               <Users size={16} className="text-white" />
            </div>
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
               Referral
            </span>
          </div>
          
          <h3 className="text-xl font-extrabold text-white leading-tight mb-1">
            {t.referral_title}
          </h3>
          <p className="text-white/80 text-sm font-medium leading-snug">
            {t.referral_desc}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-2">
            <button 
                className="w-12 h-12 rounded-full bg-white text-violet-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
                <Share2 size={22} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-md">
                <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold text-white">+100 XP</span>
            </div>
        </div>
      </div>
    </motion.div>
  );
};
