
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
    enableReminder: "Enable Reminder",
    colorHealth: "Health",
    colorWork: "Work",
    colorSocial: "Social",
    colorGrowth: "Growth",
    colorMind: "Mind",
    colorEnergy: "Energy",
    setFor: "Set for",
    remindAt: "Remind at",
    category: "Category",

    // New I18n Keys
    ready_to_start: "Ready to start?",
    one_step: "One step at a time",
    weekly_focus: "Weekly Focus",
    consistency_score: "Your consistency score",
    last_7_days: "Last 7 Days",
    habits_section_title: "Habits",
    done_count: "Done",
    create_habit_btn: "Create New Habit",
    edit_habit: "Edit Habit",
    habit_title_label: "Habit Title",
    placeholder_title: "e.g. Read Books",
    priority_label: "Priority",
    priority_low: "Low",
    priority_medium: "Medium",
    priority_high: "High",
    category_label: "Category",
    enable_reminder: "Enable Reminder",
    get_notified: "Get notified daily",
    remind_at: "Remind at",
    save_habit: "Save Habit",
    save_changes: "Save Changes",
    delete_habit: "Delete Habit",
    confirm: "Confirm",
    selected_date: "Selected",
    
    // Progress States
    progress_perfect: "Crushed it! 🎉",
    progress_perfect_sub: "You completed all habits",
    progress_keep_going: "Keep the momentum!",
    progress_keep_going_sub: "One step at a time",

    // Categories
    cat_health: "Health",
    cat_social: "Social",
    cat_growth: "Growth",
    cat_mind: "Mind",
    cat_work: "Work",
    cat_energy: "Energy",

    // Days
    day_mon: "Mon",
    day_tue: "Tue",
    day_wed: "Wed",
    day_thu: "Thu",
    day_fri: "Fri",
    day_sat: "Sat",
    day_sun: "Sun",

    // Stats & Profile
    streak_label: "Current Streak",
    days_in_row: "Days in a row",
    total_label: "Total Completed",
    habits_done: "Habits done",
    profile_stats: "Profile & Stats",
    profile_subtitle: "Your journey at a glance",
    activity_history: "Activity History",
    last_365: "Last 365 Days",
    less: "Less",
    more: "More",
    challenges_title: "Challenges",
    global_challenge: "Global Challenge",
    consistency_master: "Consistency Master",
    challenge_desc: "Complete 50 habits this month to unlock the badge",
    view_progress: "View Progress",
    new_badge: "New",

    // Achievements
    achievements_title: "Achievements",
    badge_first_step_title: "First Step",
    badge_first_step_desc: "Complete your first habit",
    badge_week_streak_title: "On Fire",
    badge_week_streak_desc: "Reach a 7-day streak",
    badge_level_5_title: "Pro",
    badge_level_5_desc: "Reach Level 5",
    badge_early_bird_title: "Early Bird",
    badge_early_bird_desc: "Complete a habit before 8 AM",
    badge_locked: "Locked",

    // Quick Start Presets
    quick_start_title: "Quick Start",
    quick_start_desc: "Choose a template to begin",
    preset_diction: "Work on Diction",
    preset_exercise: "20 min Exercise",
    preset_read: "Read 10 pages",
    preset_water: "Drink Water",
    preset_meditation: "Meditation",
    preset_no_sugar: "No Sugar"
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
    enableReminder: "Включить напоминание",
    colorHealth: "Здоровье",
    colorWork: "Работа",
    colorSocial: "Общение",
    colorGrowth: "Рост",
    colorMind: "Осознанность",
    colorEnergy: "Энергия",
    setFor: "Повторять",
    remindAt: "Время",
    category: "Категория",

    // New I18n Keys
    ready_to_start: "Готовы начать?",
    one_step: "Шаг за шагом к цели",
    weekly_focus: "Активность недели",
    consistency_score: "Ваш уровень постоянства",
    last_7_days: "За 7 дней",
    habits_section_title: "Привычки",
    done_count: "Выполнено",
    create_habit_btn: "Создать привычку",
    edit_habit: "Редактировать",
    habit_title_label: "Название",
    placeholder_title: "Напр. Чтение книг",
    priority_label: "Приоритет",
    priority_low: "Низкий",
    priority_medium: "Средний",
    priority_high: "Высокий",
    category_label: "Категория",
    enable_reminder: "Напоминание",
    get_notified: "Уведомлять ежедневно",
    remind_at: "Время",
    save_habit: "Создать",
    save_changes: "Сохранить",
    delete_habit: "Удалить привычку",
    confirm: "Подтвердить",
    selected_date: "Выбрано",

    // Progress States
    progress_perfect: "Отлично! 🎉",
    progress_perfect_sub: "Все привычки выполнены",
    progress_keep_going: "Так держать!",
    progress_keep_going_sub: "Продолжайте в том же духе",

    // Categories
    cat_health: "Здоровье",
    cat_social: "Общение",
    cat_growth: "Саморазвитие",
    cat_mind: "Интеллект",
    cat_work: "Работа",
    cat_energy: "Энергия",
    
    // Days
    day_mon: "Пн",
    day_tue: "Вт",
    day_wed: "Ср",
    day_thu: "Чт",
    day_fri: "Пт",
    day_sat: "Сб",
    day_sun: "Вс",

    // Stats & Profile
    streak_label: "Текущая серия",
    days_in_row: "дней подряд",
    total_label: "Всего выполнено",
    habits_done: "привычек",
    profile_stats: "Профиль",
    profile_subtitle: "Ваш прогресс",
    activity_history: "История активности",
    last_365: "За год",
    less: "Меньше",
    more: "Больше",
    challenges_title: "Вызовы",
    global_challenge: "Глобальный вызов",
    consistency_master: "Мастер дисциплины",
    challenge_desc: "Выполни 50 привычек в этом месяце",
    view_progress: "Смотреть прогресс",
    new_badge: "Новое",

    // Achievements
    achievements_title: "Достижения",
    badge_first_step_title: "Первый шаг",
    badge_first_step_desc: "Выполни первую привычку",
    badge_week_streak_title: "В ударе",
    badge_week_streak_desc: "Стрик 7 дней подряд",
    badge_level_5_title: "Профи",
    badge_level_5_desc: "Достигни 5 уровня",
    badge_early_bird_title: "Ранняя пташка",
    badge_early_bird_desc: "Выполни привычку до 8 утра",
    badge_locked: "Закрыто",

    // Quick Start Presets
    quick_start_title: "Быстрый старт",
    quick_start_desc: "Выберите шаблон для начала",
    preset_diction: "Работа над дикцией",
    preset_exercise: "Зарядка 20 мин",
    preset_read: "Чтение 10 страниц",
    preset_water: "Пить воду",
    preset_meditation: "Медитация",
    preset_no_sugar: "Без сахара"
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
