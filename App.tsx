import React, { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Statistics } from './pages/Statistics';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { initTelegramApp, getTelegramUser } from './lib/telegram';
import { Tab, Priority } from './types';
import { LayoutGrid, BarChart3, Plus } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AddHabitModal } from './components/AddHabitModal';
import { createHabit } from './services/habitService';

// Inner component to use Language Context
const AppContent = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HABITS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    initTelegramApp();
  }, []);

  const handleSaveHabit = async (title: string, priority: Priority, color: string, category: string, reminderTime?: string, reminderDate?: string, reminderDays?: string[]) => {
    const user = getTelegramUser();
    await createHabit(user.id, title, priority, color, category, reminderTime, reminderDate, reminderDays);
    setLastUpdated(Date.now()); // Trigger refresh in Dashboard
    setIsModalOpen(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] transition-colors duration-300 relative overflow-hidden">
      
      {/* View Container */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === Tab.HABITS ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === Tab.HABITS ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {activeTab === Tab.HABITS ? (
              <Dashboard lastUpdated={lastUpdated} />
            ) : (
              <Statistics />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Glass Dock Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="px-8 py-3 bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/50 flex items-center gap-12">
          
          {/* Habits Tab */}
          <button 
            onClick={() => setActiveTab(Tab.HABITS)}
            className="flex flex-col items-center justify-center relative group"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              activeTab === Tab.HABITS ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
            )}>
              <LayoutGrid size={26} strokeWidth={activeTab === Tab.HABITS ? 2.5 : 2} />
            </div>
            {activeTab === Tab.HABITS && (
              <motion.div 
                layoutId="dot"
                className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" 
              />
            )}
          </button>
          
          {/* Add Button (Center) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg shadow-black/20 border-4 border-white/20 -mt-6 transform transition-transform"
          >
            <Plus size={28} strokeWidth={3} />
          </motion.button>
          
          {/* Stats Tab */}
          <button 
            onClick={() => setActiveTab(Tab.STATS)}
            className="flex flex-col items-center justify-center relative group"
          >
             <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              activeTab === Tab.STATS ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
            )}>
              <BarChart3 size={26} strokeWidth={activeTab === Tab.STATS ? 2.5 : 2} />
            </div>
             {activeTab === Tab.STATS && (
              <motion.div 
                layoutId="dot"
                className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" 
              />
            )}
          </button>

        </div>
      </div>

      {/* Global Add Modal */}
      <AddHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveHabit} 
      />

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