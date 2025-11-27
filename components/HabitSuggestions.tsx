
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mic, Dumbbell, BookOpen, Droplet, Moon, Ban, Plus, X } from 'lucide-react';
import { Priority, Translations } from '../types';
import { hexToRgba, cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export interface PresetHabit {
  title: string;
  category: string;
  color: string;
  icon: string;
  priority: Priority;
}

interface HabitSuggestionsProps {
  onAdd: (habit: PresetHabit) => void;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 }
};

export const HabitSuggestions: React.FC<HabitSuggestionsProps> = ({ onAdd, onClose }) => {
  const { t } = useLanguage();

  const presets = useMemo(() => [
    { 
      title: t.preset_diction, 
      category: "Growth", 
      color: "#A78BFA", // Purple
      icon: "mic",
      priority: "medium",
      IconComponent: Mic 
    },
    { 
      title: t.preset_exercise, 
      category: "Health", 
      color: "#34D399", // Green
      icon: "activity",
      priority: "high",
      IconComponent: Dumbbell 
    },
    { 
      title: t.preset_read, 
      category: "Mind", 
      color: "#60A5FA", // Blue
      icon: "book",
      priority: "medium",
      IconComponent: BookOpen 
    },
    { 
      title: t.preset_water, 
      category: "Health", 
      color: "#22D3EE", // Cyan
      icon: "droplet",
      priority: "high",
      IconComponent: Droplet 
    },
    { 
      title: t.preset_meditation, 
      category: "Mind", 
      color: "#818CF8", // Indigo
      icon: "moon",
      priority: "medium",
      IconComponent: Moon 
    },
    { 
      title: t.preset_no_sugar, 
      category: "Health", 
      color: "#F87171", // Red
      icon: "zap",
      priority: "high",
      IconComponent: Ban 
    }
  ], [t]);

  const handlePresetClick = (preset: typeof presets[0]) => {
    // 1. Haptic Feedback
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    
    // 2. Pass data up (remove IconComponent before passing)
    const { IconComponent, ...habitData } = preset;
    onAdd(habitData as PresetHabit);
  };

  const getCategoryLabel = (cat: string) => {
    const key = ('cat_' + cat.toLowerCase()) as keyof Translations;
    return t[key] || cat;
  };

  return (
    <div className="w-full relative bg-white/50 rounded-[32px] p-5 border border-white/60">
      
      <div className="flex justify-between items-start mb-6 px-1">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <h3 className="text-lg font-bold text-gray-800 leading-tight">{t.quick_start_title}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">{t.quick_start_desc}</p>
          </motion.div>

          <button 
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition-colors active:scale-95"
            aria-label="Dismiss suggestions"
          >
            <X size={20} />
          </button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="grid grid-cols-2 gap-3"
      >
        {presets.map((preset) => (
          <motion.button
            key={preset.title}
            variants={itemVariants}
            whileTap={{ scale: 0.96 }}
            onClick={() => handlePresetClick(preset)}
            className="relative flex flex-col items-center justify-center p-4 rounded-[24px] bg-white border border-transparent hover:border-black/5 transition-all duration-300 group shadow-sm"
          >
            {/* Background tint via pseudo-element or absolute to keep bg white but tinted */}
            <div 
                className="absolute inset-0 rounded-[24px] opacity-40 group-hover:opacity-60 transition-opacity" 
                style={{ backgroundColor: hexToRgba(preset.color, 0.1) }} 
            />

            {/* Quick Add Icon Indicator */}
            <div 
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-white text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10"
            >
              <Plus size={14} strokeWidth={3} />
            </div>

            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative z-10"
              style={{ color: preset.color, backgroundColor: hexToRgba(preset.color, 0.15) }}
            >
              <preset.IconComponent size={20} strokeWidth={2.5} />
            </div>

            <span className="relative z-10 font-bold text-gray-800 text-[13px] leading-tight text-center mb-0.5">
              {preset.title}
            </span>
            
            <span className="relative z-10 text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: preset.color }}>
              {getCategoryLabel(preset.category)}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
