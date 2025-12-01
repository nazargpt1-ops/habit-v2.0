
import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

interface HeatmapData {
  date: string;
  count: number;
  level: number; // 0-4
}

interface HistoryHeatmapProps {
  data: HeatmapData[];
}

export const HistoryHeatmap: React.FC<HistoryHeatmapProps> = ({ data }) => {
  const { t } = useLanguage();

  // Process data into weeks for the grid
  const weeks = useMemo(() => {
    if (!data || data.length === 0) return [];

    const weeksArray: (HeatmapData | null)[][] = [];
    let currentWeek: (HeatmapData | null)[] = new Array(7).fill(null);
    
    // Determine the start day of the week for the first data point
    // We assume the data is sorted by date ascending
    if (data.length > 0) {
        const firstDate = new Date(data[0].date);
        // Ensure we handle timezone offset or stick to UTC string parsing to avoid off-by-one errors
        // For simplicity in this view, local parsing usually works if input is YYYY-MM-DD
        const dayOfWeek = firstDate.getDay(); // 0 (Sun) - 6 (Sat)
        
        // Fill the first week up to the start day
        // Logic: The loop below will place data[0] at the correct index.
    }

    data.forEach((dayData) => {
      const date = new Date(dayData.date);
      const dayIndex = date.getDay(); // 0=Sun, 1=Mon...

      // If it's Sunday and the current week has data, push it and start new
      if (dayIndex === 0 && currentWeek.some(d => d !== null)) {
         weeksArray.push(currentWeek);
         currentWeek = new Array(7).fill(null);
      }

      currentWeek[dayIndex] = dayData;
    });

    // Push the last week
    if (currentWeek.some(d => d !== null)) {
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100/50';
    if (count === 1) return 'bg-blue-200';
    if (count === 2) return 'bg-blue-300';
    if (count === 3) return 'bg-blue-400';
    return 'bg-blue-600';
  };

  return (
    <div className="w-full bg-white/60 backdrop-blur-lg rounded-[2.5rem] border border-white/50 shadow-xl p-6 relative overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
                {t.activity_history}
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                {t.last_365}
            </span>
        </div>
        
        {/* Scrollable Container */}
        <div className="w-full overflow-x-auto no-scrollbar pb-2">
            <div className="flex gap-[3px] min-w-max">
                {weeks.map((week, wIndex) => (
                    <div key={wIndex} className="flex flex-col gap-[3px]">
                        {week.map((day, dIndex) => (
                            <div 
                                key={dIndex}
                                title={day ? `${day.count} habits on ${day.date}` : ''}
                                className={cn(
                                    "w-3 h-3 rounded-[3px] transition-colors duration-200",
                                    day ? getColor(day.count) : "bg-transparent" // transparent for spacer days
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400 font-medium">
            <span>{t.less}</span>
            <div className="flex gap-1">
                 <div className="w-3 h-3 rounded-[2px] bg-gray-100/50"></div>
                 <div className="w-3 h-3 rounded-[2px] bg-blue-200"></div>
                 <div className="w-3 h-3 rounded-[2px] bg-blue-400"></div>
                 <div className="w-3 h-3 rounded-[2px] bg-blue-600"></div>
            </div>
            <span>{t.more}</span>
        </div>
    </div>
  );
};
