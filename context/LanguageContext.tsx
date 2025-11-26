
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Translations, Language } from '../types';

const dictionaries: Record<Language, Translations> = {
  en: {
    greeting: "Hello",
    today: "Today",
    weeklyStats: "Weekly Statistics",
    completionRate: "Completion Rate",
    totalHabits: "Total Habits",
    noHabits: "No habits found. Create one!",
    createHabit: "New Habit",
    markDone: "Done",
    loading: "Loading your habits...",
    error: "Something went wrong",
    habitsTab: "Habits",
    statsTab: "Stats",
    challengesTab: "Challenges",
    mon: "M",
    tue: "T",
    wed: "W",
    thu: "T",
    fri: "F",
    sat: "S",
    sun: "S",
    priority: "Priority",
    high: "High",
    medium: "Medium",
    low: "Low",
    habitTitle: "Habit Title",
    save: "Save Habit",
    cancel: "Cancel",
    newHabitTitle: "Create New Habit",
    streak: "Streak",
    bestStreak: "Best Streak",
    history: "History",
    notes: "Notes",
    addNote: "Add a note...",
    reminder: "Reminder",
    everyday: "Everyday",
    swipeHint: "Swipe right to complete",
    theme: "Theme",
    // New additions
    enableReminder: "Enable Reminder",
    colorHealth: "Health",
    colorWork: "Work",
    colorSocial: "Social",
    colorGrowth: "Growth",
    colorMind: "Mind",
    colorEnergy: "Energy",
    setFor: "Set for",
    remindAt: "Remind at",
    category: "Category"
  },
  ru: {
    greeting: "Привет",
    today: "Сегодня",
    weeklyStats: "Статистика недели",
    completionRate: "Завершено",
    totalHabits: "Всего привычек",
    noHabits: "Привычек пока нет. Создайте новую!",
    createHabit: "Новая привычка",
    markDone: "Готово",
    loading: "Загрузка привычек...",
    error: "Что-то пошло не так",
    habitsTab: "Привычки",
    statsTab: "Статистика",
    challengesTab: "Вызовы",
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
    sun: "Вс",
    priority: "Приоритет",
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
    habitTitle: "Название",
    save: "Сохранить",
    cancel: "Отмена",
    newHabitTitle: "Создать привычку",
    streak: "Стрик",
    bestStreak: "Рекорд",
    history: "История",
    notes: "Заметки",
    addNote: "Добавить заметку...",
    reminder: "Напоминание",
    everyday: "Каждый день",
    swipeHint: "Свайп вправо для выполнения",
    theme: "Тема",
    // New additions
    enableReminder: "Включить напоминание",
    colorHealth: "Здоровье",
    colorWork: "Работа",
    colorSocial: "Общение",
    colorGrowth: "Рост",
    colorMind: "Осознанность",
    colorEnergy: "Энергия",
    setFor: "Повторять",
    remindAt: "Время",
    category: "Категория"
  }
};

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Try to get from local storage first
    const saved = localStorage.getItem('habitflow-lang') as Language;
    if (saved && (saved === 'en' || saved === 'ru')) {
      setLanguage(saved);
    } else {
      // Try to detect from Telegram
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
        const tgLang = window.Telegram.WebApp.initDataUnsafe.user.language_code;
        if (tgLang.startsWith('ru')) setLanguage('ru');
      }
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('habitflow-lang', lang);
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ru' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, t: dictionaries[language], setLanguage: changeLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
