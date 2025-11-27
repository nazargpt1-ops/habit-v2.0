
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
  // Legacy color keys (keeping for compatibility if needed, though strictly replacing usage)
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

  // New I18n Keys
  ready_to_start: string;
  one_step: string;
  weekly_focus: string;
  consistency_score: string;
  last_7_days: string;
  habits_section_title: string;
  done_count: string;
  create_habit_btn: string; // distinct from header
  edit_habit: string;
  habit_title_label: string;
  placeholder_title: string;
  priority_label: string;
  priority_low: string;
  priority_medium: string;
  priority_high: string;
  category_label: string;
  enable_reminder: string; // lowercase alias
  get_notified: string;
  remind_at: string; // lowercase alias
  save_habit: string;
  save_changes: string;
  delete_habit: string;
  confirm: string;
  selected_date: string;

  // Progress States
  progress_perfect: string;
  progress_perfect_sub: string;
  progress_keep_going: string;
  progress_keep_going_sub: string;

  // Category Keys
  cat_health: string;
  cat_social: string;
  cat_growth: string;
  cat_mind: string;
  cat_work: string;
  cat_energy: string;
  
  // Day Keys
  day_mon: string;
  day_tue: string;
  day_wed: string;
  day_thu: string;
  day_fri: string;
  day_sat: string;
  day_sun: string;

  // Stats & Profile
  streak_label: string;
  days_in_row: string;
  total_label: string;
  habits_done: string;
  profile_stats: string;
  profile_subtitle: string;
  activity_history: string;
  last_365: string;
  less: string;
  more: string;
  challenges_title: string;
  global_challenge: string;
  consistency_master: string;
  challenge_desc: string;
  view_progress: string;
  new_badge: string;

  // Quick Start Presets
  quick_start_title: string;
  quick_start_desc: string;
  preset_diction: string;
  preset_exercise: string;
  preset_read: string;
  preset_water: string;
  preset_meditation: string;
  preset_no_sugar: string;
}
