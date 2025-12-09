import useSWR from 'swr';
import { 
  fetchHabitsWithCompletions, 
  toggleHabitCompletion, 
  HabitWithCompletion 
} from '../services/habitService'; // Убедись, что тут старый добрый сервис с apiFetch!

import { formatDateKey } from '../lib/utils';

export function useHabits(date: Date) {
  // Ключ кэша зависит от даты. Если дата меняется, SWR грузит новые данные.
  const dateKey = formatDateKey(date);
  
  const { data: habits, error, isLoading, mutate } = useSWR(
    ['habits', dateKey], // Уникальный ключ
    () => fetchHabitsWithCompletions(date), // Функция-загрузчик (идет на твой API)
    {
      revalidateOnFocus: true, // Обновлять при возвращении в вкладку
      dedupingInterval: 5000, // Не долбить сервер чаще чем раз в 5 сек
    }
  );

  // Оптимистичное переключение
  const toggle = async (habitId: string, isCompleted: boolean, note?: string) => {
    if (!habits) return;

    // 1. Создаем "фейковые" новые данные для мгновенного отображения
    const optimisticHabits = habits.map((h) => {
      if (h.id === habitId) {
        // Если ставим галочку
        if (isCompleted) {
            return { 
                ...h, 
                completed_today: true,
                completions: [{ id: 'temp-id', date: dateKey, completed: true }] // Фейковое выполнение
            };
        } 
        // Если снимаем галочку
        else {
            return { ...h, completed_today: false, completions: [] };
        }
      }
      return h;
    });

    // 2. МГНОВЕННО обновляем UI (без ожидания сервера)
    // false в конце означает "не делай ревалидацию прямо сейчас"
    mutate(optimisticHabits, false);

    try {
      // 3. Отправляем реальный запрос на твой Vercel API
      await toggleHabitCompletion(habitId, date, isCompleted, undefined, note);
      
      // 4. После успеха тихо обновляем данные с сервера (чтобы получить реальные ID и монеты)
      mutate(); 
    } catch (err) {
      console.error("Ошибка при переключении:", err);
      // Если ошибка — откатываем изменения обратно
      mutate(); // Это вернет старые данные с сервера
    }
  };

  return {
    habits: habits || [],
    isLoading,
    isError: error,
    toggle,
    mutate // на случай если нужно обновить вручную
  };
}
