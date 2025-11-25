import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '../context/LanguageContext';

interface DataPoint {
  day: string;
  count: number;
}

interface StatsChartProps {
  data: DataPoint[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  const { t } = useLanguage();
  
  // Get CSS variable for bar color
  const barColor = typeof window !== 'undefined' 
    ? getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-button-color').trim() || '#3B82F6'
    : '#3B82F6';

  const textColor = typeof window !== 'undefined' 
    ? getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-hint-color').trim() || '#9CA3AF'
    : '#9CA3AF';

  return (
    <div className="w-full bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 text-[var(--tg-theme-text-color)]">
        {t.weeklyStats}
      </h3>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 12 }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ 
                backgroundColor: 'var(--tg-theme-bg-color)', 
                borderColor: 'transparent',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: 'var(--tg-theme-text-color)'
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 6, 6]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColor} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};