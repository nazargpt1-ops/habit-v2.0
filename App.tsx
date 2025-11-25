import React, { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Statistics } from './pages/Statistics';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { initTelegramApp } from './lib/telegram';
import { Tab } from './types';
import { LayoutGrid, BarChart3, Languages } from 'lucide-react';
import { cn } from './lib/utils';
import { motion } from 'framer-motion';

// Inner component to use Language Context
const AppContent = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HABITS);

  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] transition-colors duration-300">
      
      {/* View Container */}
      <main className="flex-1 overflow-hidden relative">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === Tab.HABITS ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === Tab.HABITS ? 20 : -20 }}
          transition={{ duration: 0.2 }}
          className="h-full w-full"
        >
          {activeTab === Tab.HABITS ? <Dashboard /> : <Statistics />}
        </motion.div>
        
        {/* Floating Language Toggle */}
        <button 
          onClick={toggleLanguage}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-[var(--tg-theme-secondary-bg-color)]/80 backdrop-blur shadow-sm border border-transparent active:scale-95 transition-transform"
        >
          <span className="text-xs font-bold uppercase w-6 h-6 flex items-center justify-center">
            {language}
          </span>
        </button>
      </main>

      {/* Bottom Navigation */}
      <nav className="h-[80px] pb-[20px] bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)] flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab(Tab.HABITS)}
          className="flex flex-col items-center justify-center w-full h-full relative"
        >
          <div className={cn(
            "p-1.5 rounded-xl transition-colors duration-200",
            activeTab === Tab.HABITS ? "text-[var(--tg-theme-button-color)]" : "text-[var(--tg-theme-hint-color)]"
          )}>
            <LayoutGrid size={24} strokeWidth={activeTab === Tab.HABITS ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-medium mt-1",
            activeTab === Tab.HABITS ? "text-[var(--tg-theme-button-color)]" : "text-[var(--tg-theme-hint-color)]"
          )}>
            {t.habitsTab}
          </span>
        </button>
        
        <button 
          onClick={() => setActiveTab(Tab.STATS)}
          className="flex flex-col items-center justify-center w-full h-full relative"
        >
           <div className={cn(
            "p-1.5 rounded-xl transition-colors duration-200",
            activeTab === Tab.STATS ? "text-[var(--tg-theme-button-color)]" : "text-[var(--tg-theme-hint-color)]"
          )}>
            <BarChart3 size={24} strokeWidth={activeTab === Tab.STATS ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-medium mt-1",
            activeTab === Tab.STATS ? "text-[var(--tg-theme-button-color)]" : "text-[var(--tg-theme-hint-color)]"
          )}>
            {t.statsTab}
          </span>
        </button>
      </nav>
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;