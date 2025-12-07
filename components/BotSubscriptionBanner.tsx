
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUserId } from '../services/habitService';
import { checkBotStarted } from '../lib/botHelpers';

export const BotSubscriptionBanner: React.FC = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const userId = getCurrentUserId();
  
  const botUsername = 'calendar_for_chenge_bot';

  useEffect(() => {
    // 1. Check if previously dismissed in this session or device
    const dismissed = localStorage.getItem(`bot_banner_dismissed_${userId}`);
    
    const checkStatus = async () => {
        if (!dismissed) {
             const isStarted = await checkBotStarted();
             if (!isStarted) {
                 setIsVisible(true);
             }
        }
    };

    checkStatus();

    // 2. Listen for forced show events (e.g., from AddHabitModal)
    const handleForceShow = () => {
        setIsVisible(true);
    };

    window.addEventListener('show-bot-banner', handleForceShow);
    return () => window.removeEventListener('show-bot-banner', handleForceShow);
  }, [userId]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`bot_banner_dismissed_${userId}`, 'true');
  };

  const handleOpenBot = () => {
    const url = `https://t.me/${botUsername}?start=user_${userId}`;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
    // Optimistically dismiss after action
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-[40]" // z-40 to be below the bottom nav (z-50)
        >
          <div className="relative p-4 rounded-2xl shadow-xl overflow-hidden text-white" 
               style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            
            {/* Gloss Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex items-start gap-3">
               <div className="p-2 bg-white/20 rounded-lg shrink-0 backdrop-blur-sm">
                  <Send size={20} className="fill-white stroke-white" />
               </div>
               
               <div className="flex-1">
                  <p className="text-sm font-medium leading-snug text-white/95 pr-6">
                    {t.bot_banner_text}
                  </p>
                  
                  <button 
                    onClick={handleOpenBot}
                    className="mt-3 px-4 py-2 bg-white text-[#764ba2] text-xs font-bold uppercase tracking-wider rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    {t.bot_banner_btn}
                  </button>
               </div>
               
               <button 
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 p-2 text-white/70 hover:text-white transition-colors"
                >
                  <X size={16} />
               </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
