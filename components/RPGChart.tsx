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

  return (
    <div className="bg-surface/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-xl p-6 relative overflow-hidden flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-2 px-2">
        <h3 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
          ⚔️ {t.skill_tree}
        </h3>
        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
           Lvl {Math.floor(data.reduce((acc, curr) => acc + curr.A, 0) / 10)}
        </span>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid 
              gridType="polygon" 
              stroke="var(--tg-theme-hint-color, #94a3b8)" 
              strokeOpacity={0.3}
            />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'var(--tg-theme-text-color, #64748B)', fontSize: 12, fontWeight: 700 }} 
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
              stroke="#6366f1" // Indigo 500
              strokeWidth={3}
              fill="#818cf8" // Indigo 400
              fillOpacity={0.5}
              isAnimationActive={true}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Info - Colors matched to AddHabitModal categories */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-[10px] text-secondary font-medium mt-2 opacity-90">
         {/* VIT - Health (Blue) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#60A5FA]"></div> 
            <span>{t.rpg_vit}</span>
         </div>
         
         {/* INT - Mind (Purple) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#A78BFA]"></div> 
            <span>{t.rpg_int}</span>
         </div>
         
         {/* DIS - Work (Yellow) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FBBF24]"></div> 
            <span>{t.rpg_dis}</span>
         </div>
         
         {/* CHA - Social (Pink) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#F472B6]"></div> 
            <span>{t.rpg_cha}</span>
         </div>
         
         {/* WIS - Growth (Green) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#34D399]"></div> 
            <span>{t.rpg_wis}</span>
         </div>
         
         {/* STA - Energy (Red) */}
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#F87171]"></div> 
            <span>{t.rpg_sta}</span>
         </div>
      </div>

    </div>
  );
};
