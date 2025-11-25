
export interface User {
  telegram_id: number;
  username: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Habit {
  id: string;
  user_id: number;
  title: string;
  category: string;
  color: string;
  icon?: string;
  priority: Priority;
  reminder_time?: string; // "09:00"
  reminder_date?: string; // "2023-11-26"
  reminder_days?: string[]; // ["Mon", "Wed"]
  is_archived: boolean;
  created_at?: string;
}

export interface Completion {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  note?: string;
  completed_at: string;
}

export interface HabitWithCompletion extends Habit {
  completed: boolean;
  completionId?: string; // ID of the completion record if exists
  currentStreak?: number;
  todayNote?: string;
}

export enum Tab {
  HABITS = 'habits',
  STATS = 'stats',
  CHALLENGES = 'challenges'
}

export type Language = 'en' | 'ru';

export interface Translations {
  greeting: string;
  today: string;
  weeklyStats: string;
  completionRate: string;
  totalHabits: string;
  noHabits: string;
  createHabit: string;
  markDone: string;
  loading: string;
  error: string;
  habitsTab: string;
  statsTab: string;
  challengesTab: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
  priority: string;
  high: string;
  medium: string;
  low: string;
  habitTitle: string;
  save: string;
  cancel: string;
  newHabitTitle: string;
  streak: string;
  bestStreak: string;
  history: string;
  notes: string;
  addNote: string;
  reminder: string;
  everyday: string;
  swipeHint: string;
  theme: string;
  // New additions for Redesigned Add Screen
  enableReminder: string;
  colorHealth: string;
  colorWork: string;
  colorSocial: string;
  colorGrowth: string;
  colorMind: string;
  colorEnergy: string;
  setFor: string;
  remindAt: string;
  category: string;
}