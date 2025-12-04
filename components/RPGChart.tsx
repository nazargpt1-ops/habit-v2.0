
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { RPGStat } from '../services/habitService';
import { useLanguage } from '../context/LanguageContext';

interface RPGChartProps {
  data: RPGStat[];
}

export const RPGChart: React.FC<RPGChartProps> = ({ data }) => {
  const { t } = useLanguage();

  if (!data || data.length === 0) return null;

  // Calculate max domain for scaling
  const maxVal = Math.max(...data.map(d => d.A));
  const domainMax = Math.max(maxVal + 2, 10); // Ensure at least 10 levels

  // Calculate average level
  const totalLevels = data.reduce((acc, curr) => acc + curr.A, 0);
  const averageLevel = Math.floor(totalLevels / 10);

  return (
    <div className="bg-surface/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-xl p-6 relative overflow-hidden flex flex-col items-center group transition-all duration-300 hover:shadow-2xl">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 px-2 relative z-10">
        <h3 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
          ⚔️ {t.skill_tree}
        </h3>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-500/30 shadow-sm backdrop-blur-md">
           Lvl {averageLevel}
        </span>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Chart */}
      <div className="w-full h-[320px] -ml-2 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <defs>
              <linearGradient id="rpgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            
            <PolarGrid 
              gridType="polygon" 
              stroke="var(--text-secondary)" 
              strokeOpacity={0.15} 
            />
            
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ 
                fill: 'var(--text-secondary)', 
                fontSize: 11, 
                fontWeight: 800,
                dy: 4 
              }} 
            />
            
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, domainMax]} 
              tick={false} 
              axisLine={false} 
            />
            
            <Radar
              name="Skills"
              dataKey="A"
              stroke="#818cf8"
              strokeWidth={3}
              fill="url(#rpgGradient)"
              fillOpacity={1}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Info - Colors matched to AddHabitModal categories */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-[10px] text-secondary font-semibold mt-2 opacity-90 w-full px-2">
         {/* VIT - Health (Blue) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#60A5FA] shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div> 
            <span>{t.rpg_vit}</span>
         </div>
         
         {/* INT - Mind (Purple) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#A78BFA] shadow-[0_0_8px_rgba(167,139,250,0.5)]"></div> 
            <span>{t.rpg_int}</span>
         </div>
         
         {/* DIS - Work (Yellow) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> 
            <span>{t.rpg_dis}</span>
         </div>
         
         {/* CHA - Social (Pink) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F472B6] shadow-[0_0_8px_rgba(244,114,182,0.5)]"></div> 
            <span>{t.rpg_cha}</span>
         </div>
         
         {/* WIS - Growth (Green) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div> 
            <span>{t.rpg_wis}</span>
         </div>
         
         {/* STA - Energy (Red) */}
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F87171] shadow-[0_0_8px_rgba(248,113,113,0.5)]"></div> 
            <span>{t.rpg_sta}</span>
         </div>
      </div>

    </div>
  );
};
