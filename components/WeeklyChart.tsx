
import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';

interface DataPoint {
  day: string;
  count: number;
}

interface WeeklyChartProps {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl border border-white/10">
        <p className="mb-0">{`${label}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  const { t } = useLanguage();

  const formatDay = (val: string) => {
    const map: Record<string, string> = {
      Mon: t.day_mon,
      Tue: t.day_tue,
      Wed: t.day_wed,
      Thu: t.day_thu,
      Fri: t.day_fri,
      Sat: t.day_sat,
      Sun: t.day_sun
    };
    return map[val] || val;
  };

  return (
    <div className="w-full bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-8">
        <div>
           <h3 className="text-lg font-extrabold text-gray-800 tracking-tight">{t.weekly_focus}</h3>
           <p className="text-xs text-gray-500 font-medium mt-1">{t.consistency_score}</p>
        </div>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider border border-blue-100">
          {t.last_7_days}
        </span>
      </div>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity={1}/>
                <stop offset="100%" stopColor="#2563EB" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={formatDay}
              tick={{ fontSize: 12, fill: '#9CA3AF' }} 
              dy={10}
              interval={0}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 12 }} 
            />
            <Bar 
              dataKey="count" 
              barSize={32}
              radius={[12, 12, 0, 0]}
              fill="url(#barGradient)" 
              animationDuration={1000}
              activeBar={{ fill: '#1D4ED8' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
