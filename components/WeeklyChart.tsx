import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
        <p className="mb-0">{`${label}: ${payload[0].value} Habits`}</p>
      </div>
    );
  }
  return null;
};

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  return (
    <div className="w-full bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-8">
        <div>
           <h3 className="text-lg font-extrabold text-gray-800 tracking-tight">Weekly Focus</h3>
           <p className="text-xs text-gray-500 font-medium mt-1">Your consistency score</p>
        </div>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider border border-blue-100">
          Last 7 Days
        </span>
      </div>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
              tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }} 
              dy={15}
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
