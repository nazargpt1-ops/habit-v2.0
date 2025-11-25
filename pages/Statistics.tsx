
import React, { useEffect, useState } from 'react';
import { StatsChart } from '../components/StatsChart';
import { useLanguage } from '../context/LanguageContext';
import { getTelegramUser } from '../lib/telegram';
import { fetchWeeklyStats } from '../services/habitService';
import { Trophy, Users, Target } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const user = getTelegramUser();
      const stats = await fetchWeeklyStats(user.id);
      setData(stats);
    };
    loadStats();
  }, []);

  return (
    <div className="p-4 pt-8 h-full overflow-y-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">{t.statsTab}</h1>
      
      <StatsChart data={data} />
      
      <div className="grid grid-cols-2 gap-4 mt-6 mb-8">
        <div className="bg-[var(--tg-theme-secondary-bg-color)] p-4 rounded-2xl">
          <p className="text-[var(--tg-theme-hint-color)] text-xs uppercase font-bold tracking-wider mb-1">{t.totalHabits}</p>
          <p className="text-3xl font-bold text-[var(--tg-theme-text-color)]">4</p>
        </div>
        <div className="bg-[var(--tg-theme-secondary-bg-color)] p-4 rounded-2xl">
          <p className="text-[var(--tg-theme-hint-color)] text-xs uppercase font-bold tracking-wider mb-1">{t.completionRate}</p>
          <p className="text-3xl font-bold text-[var(--tg-theme-button-color)]">85%</p>
        </div>
      </div>

      {/* Challenges Section Stub */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> {t.challengesTab || "Challenges"}
      </h2>
      
      <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  <Target size={120} />
              </div>
              <div className="relative z-10">
                  <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded-md">GLOBAL</span>
                  <h3 className="text-lg font-bold mt-2">30 Days of Mindfulness</h3>
                  <div className="flex items-center gap-2 mt-3 text-sm opacity-90">
                      <Users size={16} /> 1,240 Participants
                  </div>
                  <button className="mt-4 w-full py-2 bg-white text-indigo-600 font-bold rounded-xl text-sm active:scale-95 transition-transform">
                      Join Challenge
                  </button>
              </div>
          </div>
          
           <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-5 flex items-center justify-between opacity-70">
              <div>
                  <h3 className="font-bold text-[var(--tg-theme-text-color)]">Early Birds</h3>
                  <p className="text-xs text-[var(--tg-theme-hint-color)]">Wake up at 6 AM</p>
              </div>
              <button className="px-4 py-2 bg-[var(--tg-theme-button-color)]/20 text-[var(--tg-theme-button-color)] font-bold rounded-xl text-xs">
                  Coming Soon
              </button>
          </div>
      </div>
    </div>
  );
};
