import React, { useEffect, useState } from 'react';
import { HistoryHeatmap } from '../components/HistoryHeatmap';
import { useLanguage } from '../context/LanguageContext';
import { fetchHeatmapData, HeatmapData } from '../services/habitService';
import { Trophy, Flame, CheckCircle2, TrendingUp, Share2 } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { t } = useLanguage();
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      // Service determines user context internally
      const { heatmap, totalCompletions, currentStreak } = await fetchHeatmapData();
      setHeatmapData(heatmap);
      setTotalCompletions(totalCompletions);
      setCurrentStreak(currentStreak);
      setIsLoading(false);
    };
    loadStats();
  }, []);

  const handleShare = () => {
    // 1. Haptic Feedback
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    // 2. Prepare Message
    const text = `📊 My progress in HabitFlow:\n• Current Streak: ${currentStreak} days\n• Total Completed: ${totalCompletions}\n\nKeep consistent! 🚀`;
    const appUrl = 'https://t.me/HabitFlowBot';
    
    // 3. Construct Telegram Share URL
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;

    // 4. Open Link
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
        (window as any).Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
        // Fallback for web testing
        window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="p-4 pt-8 h-full overflow-y-auto pb-32 no-scrollbar bg-background transition-colors duration-300 relative">
      {/* Background Orbs reused for consistency */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-300/20 dark:bg-purple-900/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-300/20 dark:bg-blue-900/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-6">
        
        <header>
            <h1 className="text-3xl font-extrabold text-primary tracking-tight">{t.profile_stats}</h1>
            <p className="text-secondary font-medium mt-1">{t.profile_subtitle}</p>
        </header>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
            
            {/* Current Streak Card */}
            <div className="bg-surface/70 dark:bg-slate-800/60 backdrop-blur-lg p-5 rounded-[2rem] shadow-lg border border-white/60 dark:border-white/5 relative overflow-hidden group transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Flame size={60} className="text-orange-500 rotate-12" />
                 </div>
                 
                 {/* Share Button - Only visible if streak > 0 */}
                 {currentStreak > 0 && (
                   <button 
                     onClick={handleShare}
                     className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/60 text-orange-600 dark:text-orange-400 transition-all active:scale-95 shadow-sm backdrop-blur-sm"
                     aria-label="Share Statistics"
                   >
                     <Share2 size={16} strokeWidth={2.5} />
                   </button>
                 )}

                 <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                             <Flame size={18} fill="currentColor" />
                         </div>
                         <span className="text-xs font-bold text-secondary uppercase tracking-wider">{t.streak_label}</span>
                     </div>
                     <p className="text-3xl font-black text-primary">{currentStreak}</p>
                     <p className="text-xs text-secondary font-medium mt-1">{t.days_in_row}</p>
                 </div>
            </div>

            {/* Total Completions Card */}
            <div className="bg-surface/70 dark:bg-slate-800/60 backdrop-blur-lg p-5 rounded-[2rem] shadow-lg border border-white/60 dark:border-white/5 relative overflow-hidden group transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <CheckCircle2 size={60} className="text-blue-500 -rotate-12" />
                 </div>
                 <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                             <TrendingUp size={18} />
                         </div>
                         <span className="text-xs font-bold text-secondary uppercase tracking-wider">{t.total_label}</span>
                     </div>
                     <p className="text-3xl font-black text-primary">{totalCompletions}</p>
                     <p className="text-xs text-secondary font-medium mt-1">{t.habits_done}</p>
                 </div>
            </div>
        </div>

        {/* Heatmap Section */}
        {isLoading ? (
            <div className="h-48 bg-surface/50 dark:bg-slate-800/50 animate-pulse rounded-[2.5rem]" />
        ) : (
            <HistoryHeatmap data={heatmapData} />
        )}

        {/* Challenges Teaser */}
        <div>
            <div className="flex items-center justify-between mb-4 px-2">
                 <h2 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} /> {t.challenges_title}
                 </h2>
                 <span className="text-xs font-bold text-secondary bg-surface/50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-white/5">{t.new_badge}</span>
            </div>
            
            <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] dark:from-[#4338ca] dark:to-[#6d28d9] rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-white/10">
                    <Trophy size={140} />
                </div>
                <div className="relative z-10">
                    <span className="bg-white/20 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 uppercase">{t.global_challenge}</span>
                    <h3 className="text-xl font-bold mt-3 mb-1">{t.consistency_master}</h3>
                    <p className="text-white/80 text-sm mb-4">{t.challenge_desc}</p>
                    
                    <div className="w-full bg-black/20 rounded-full h-2 mb-4">
                         <div className="bg-white h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <button className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl text-sm active:scale-95 transition-transform shadow-lg">
                        {t.view_progress}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};