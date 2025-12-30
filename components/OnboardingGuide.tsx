
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Sun, Globe, BarChart3, Send, Zap, Target } from 'lucide-react';
import { hapticImpact } from '../lib/telegram';

interface OnboardingGuideProps {
  onComplete: () => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<HighlightRect | null>(null);

  const steps = [
    {
      id: 'progress',
      title: t.onboarding_step1_title,
      desc: t.onboarding_step1_desc,
      icon: <Target size={48} className="text-blue-500" strokeWidth={2.5} />,
      borderRadius: '9999px'
    },
    {
      id: 'add-button',
      title: t.onboarding_step2_title,
      desc: t.onboarding_step2_desc,
      icon: <Plus size={48} className="text-emerald-500" strokeWidth={2.5} />,
      borderRadius: '9999px'
    },
    {
      id: 'xp-bar',
      title: t.onboarding_step_xp_title,
      desc: t.onboarding_step_xp_desc,
      icon: <Zap size={48} className="text-indigo-500" strokeWidth={2.5} />,
      borderRadius: '1rem'
    },
    {
      id: 'settings',
      title: t.onboarding_step3_title,
      desc: t.onboarding_step3_desc,
      icon: (
        <div className="flex items-center justify-center gap-4">
          <Sun size={40} className="text-amber-500" strokeWidth={2.5} />
          <Globe size={40} className="text-cyan-500" strokeWidth={2.5} />
        </div>
      ),
      borderRadius: '1rem'
    },
    {
      id: 'stats-tab',
      title: t.onboarding_step4_title,
      desc: t.onboarding_step4_desc,
      icon: <BarChart3 size={48} className="text-violet-500" strokeWidth={2.5} />,
      borderRadius: '1rem'
    },
    {
      id: 'bot-banner',
      title: t.onboarding_step5_title,
      desc: t.onboarding_step5_desc,
      icon: <Send size={48} className="text-blue-600" strokeWidth={2.5} />,
      borderRadius: '2rem'
    }
  ];

  const updateHighlight = useCallback(() => {
    const targetId = steps[step].id;
    const element = document.querySelector(`[data-onboarding-target="${targetId}"]`);
    
    if (element) {
      const bcr = element.getBoundingClientRect();
      // Add a small padding around the highlight
      const padding = 6;
      setRect({
        top: bcr.top - padding,
        left: bcr.left - padding,
        width: bcr.width + padding * 2,
        height: bcr.height + padding * 2,
        borderRadius: steps[step].borderRadius
      });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [updateHighlight]);

  const nextStep = () => {
    hapticImpact('light');
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    hapticImpact('light');
    if (step > 0) setStep(s => s - 1);
  };

  const skip = () => {
    hapticImpact('medium');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 pointer-events-auto"
        onClick={skip}
      />

      {/* Spotlight Component */}
      <AnimatePresence>
        {rect && (
          <motion.div 
            initial={false}
            animate={{ 
              top: rect.top, 
              left: rect.left, 
              width: rect.width, 
              height: rect.height,
              borderRadius: rect.borderRadius
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed border-2 border-accent shadow-[0_0_80px_rgba(34,211,238,0.4)] bg-accent/5 z-[210]"
          />
        )}
      </AnimatePresence>

      <div className="p-4 w-full max-w-md flex items-center justify-center relative z-[220]">
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="w-full bg-slate-900 rounded-[3rem] p-8 shadow-2xl pointer-events-auto border border-white/10 text-center flex flex-col items-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-6 w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shrink-0">
                {steps[step].icon}
              </div>
              
              <h2 className="text-2xl font-black text-white mb-3 leading-tight">
                {steps[step].title}
              </h2>
              
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 px-4 max-w-[300px] mx-auto">
                {steps[step].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="w-full space-y-4">
            <div className="flex gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-4 rounded-2xl font-bold bg-white/10 text-slate-300 transition-all active:scale-95 border border-white/5"
                >
                  {t.onboarding_prev}
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex-1 py-4 rounded-2xl font-bold bg-accent text-slate-950 shadow-lg shadow-accent/20 transition-all active:scale-95"
              >
                {step === steps.length - 1 ? t.onboarding_finish : t.onboarding_next}
              </button>
            </div>
            
            <button
              onClick={skip}
              className="w-full py-1 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t.onboarding_skip}
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-accent' : 'w-2 bg-white/10'}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
