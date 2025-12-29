
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Sun, Globe, BarChart3, Send } from 'lucide-react';
import { hapticImpact } from '../lib/telegram';

interface OnboardingGuideProps {
  onComplete: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // Precision coordinates calculated based on App.tsx and Dashboard.tsx layout
  const steps = [
    {
      title: t.onboarding_step2_title, // Build Your Routine
      desc: t.onboarding_step2_desc,
      icon: <Plus size={48} className="text-green-500" strokeWidth={2.5} />,
      // Plus button (dock center). Shifted up to match its -mt-6 and dock height.
      highlightClass: "bottom-[2.6rem] left-1/2 -translate-x-1/2 w-[4.8rem] h-[4.8rem] rounded-full"
    },
    {
      title: t.onboarding_step3_title, // Make it Yours
      desc: t.onboarding_step3_desc,
      icon: (
        <div className="flex items-center justify-center gap-4">
          <Sun size={40} className="text-yellow-500" strokeWidth={2.5} />
          <Globe size={40} className="text-blue-500" strokeWidth={2.5} />
        </div>
      ),
      // Theme/Lang (top right corner controls). Shifted down for Dashboard's mt-2 and p-6.
      highlightClass: "top-[2.7rem] right-[2.4rem] w-[14.8rem] h-[3.5rem] rounded-[1.5rem]"
    },
    {
      title: t.onboarding_step4_title, // Track Progress
      desc: t.onboarding_step4_desc,
      icon: <BarChart3 size={48} className="text-purple-500" strokeWidth={2.5} />,
      // Stats icon in dock (right side). Distance calculated: 56/2 + 48 + 26/2 = ~89px from center.
      highlightClass: "bottom-[2.2rem] left-[calc(50%+89px)] -translate-x-1/2 w-[4.2rem] h-[4.2rem] rounded-[1.2rem]"
    },
    {
      title: t.onboarding_step5_title, // Stay Connected
      desc: t.onboarding_step5_desc,
      icon: <Send size={48} className="text-indigo-500" strokeWidth={2.5} />,
      // Telegram Banner. Uses absolute edges to avoid overflow issues reported.
      highlightClass: "bottom-[6.2rem] left-4 right-4 w-auto h-[6.8rem] rounded-[1.8rem]"
    }
  ];

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
      {/* Dimmed Background Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-[3px] pointer-events-auto"
        onClick={skip}
      />

      {/* Spotlight Effect - Precise Viewport Positioning */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`fixed border-2 border-cyan-400/40 shadow-[0_0_80px_rgba(34,211,238,0.2)] bg-cyan-400/5 ${steps[step].highlightClass}`}
        />
      </AnimatePresence>

      {/* Guide Card - Perfectly Centered */}
      <div className="p-4 w-full max-w-md flex items-center justify-center">
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto border border-white/10 text-center flex flex-col items-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -10 }}
              className="flex flex-col items-center w-full"
            >
              {/* Icon Container */}
              <div className="mb-6 w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shrink-0">
                {steps[step].icon}
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-black text-white mb-4 leading-tight">
                {steps[step].title}
              </h2>
              
              {/* Description */}
              <p className="text-slate-400 text-base font-medium leading-relaxed mb-8 px-2 max-w-[280px] mx-auto">
                {steps[step].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Buttons Group */}
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
                className="flex-1 py-4 rounded-2xl font-bold bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                {step === steps.length - 1 ? t.onboarding_finish : t.onboarding_next}
              </button>
            </div>
            
            <button
              onClick={skip}
              className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t.onboarding_skip}
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-cyan-500' : 'w-2 bg-white/10'}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
