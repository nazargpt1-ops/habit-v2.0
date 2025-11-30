import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_APP_URL;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Инициализация Supabase (для записи выполнения привычки)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Dictionary (Словарь) ---
const TRANSLATIONS = {
  en: {
    welcome: (name: string) => `👋 Hello, ${name}!\n\nWelcome to **HabitFlow** — your personal habit tracker.\n\nStart building better habits today! 🚀`,
    btn_open: "🚀 Open HabitFlow",
    btn_help: "❓ How it works",
    btn_support: "👨‍💻 Support / Feedback",
    help_text: "🧩 **How to use HabitFlow:**\n\n1. Click **Open HabitFlow**.\n2. Add your habits (e.g. 'Running', 'Reading').\n3. Check in daily to track progress.\n4. Watch your stats and keep the streak alive! 🔥",
    done_success: "Great job! Habit marked as done. 🔥",
    done_error: "Could not mark as done (maybe already completed today).",
    done_label: "✅ Completed!"
  },
  ru: {
    welcome: (name: string) => `👋 Привет, ${name}!\n\nДобро пожаловать в **HabitFlow** — твой личный трекер привычек.\n\nНачни менять свою жизнь уже сегодня! 🚀`,
    btn_open: "🚀 Открыть HabitFlow",
    btn_help: "❓ Как это работает",
    btn_support: "👨‍💻 Поддержка / Автор",
    help_text: "🧩 **Как пользоваться HabitFlow:**\n\n1. Нажми кнопку **Открыть HabitFlow**.\n2. Добавь свои привычки (например, 'Бег' или 'Чтение').\n3. Заходи каждый день и отмечай выполнение.\n4. Следи за статистикой и не разрывай серию! 🔥",
    done_success: "Отлично! Привычка выполнена. 🔥",
    done_error: "Ошибка записи (возможно, уже выполнено сегодня).",
    done_label: "✅ Выполнено!"
  }
};

/**
 * Helper to detect language
 */
function getLanguage(code?: string) {
  if (code && (code === 'ru' || code.startsWith('ru-'))) {
    return 'ru';
  }
  return 'en'; // Default to English
}

/**
 * Helper to interact with Telegram API
 */
async function telegramFetch(method: string, body: any) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is missing');
    return;
  }
  
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  } catch (error) {
    console.error(`Fetch error in ${method}:`, error);
  }
}

// Main Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Телеграм шлет только POST
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is running');
  }

  try {
    const update = req.body;

    // --- 1. Обработка команды /start ---
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      const firstName = user?.first_name || 'Friend';
      
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      const reply_markup = {
        inline_keyboard: [
          [
            { text: t.btn_open, web_app: { url: WEB_APP_URL || 'https://habit-v2-0.vercel.app' } }
          ],
          [
            { text: t.btn_help, callback_data: "help" }
          ],
          [
            { text: t.btn_support, url: "https://t.me/volskov" } 
          ]
        ]
      };

      await telegramFetch('sendMessage', {
        chat_id: chatId,
        text: t.welcome(firstName),
        parse_mode: 'Markdown',
        reply_markup
      });
    }

    // --- 2. Обработка нажатий на кнопки (Callback) ---
    if (update.callback_query) {
      const queryId = update.callback_query.id;
      const data = update.callback_query.data;
      const chatId = update.callback_query.message?.chat.id;
      const user = update.callback_query.from;
      
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      // А) Если нажали кнопку "Помощь"
      if (data === 'help' && chatId) {
        await telegramFetch('sendMessage', {
          chat_id: chatId,
          text: t.help_text,
          parse_mode: 'Markdown'
        });
        // Убираем часики с кнопки
        await telegramFetch('answerCallbackQuery', { callback_query_id: queryId });
      }

      // Б) Если нажали кнопку "✅ Готово" из уведомления
      else if (data.startsWith('done_') && chatId) {
        const habitId = data.replace('done_', '');
        const today = new Date().toISOString().split('T')[0];

        // 1. Пытаемся записать в Supabase
        const { error } = await supabase.from('completions').insert({
          habit_id: habitId,
          user_id: user.id, // Telegram ID
          date: today,
          completed_at: new Date().toISOString()
        });

        // 2. Формируем ответ (Toast notification)
        let replyText = t.done_success;
        if (error) {
          console.error('Supabase insert error:', error);
          // Игнорируем ошибку дубликата (если юзер нажал дважды)
          if (error.code !== '23505') { 
             replyText = t.done_error;
          }
        }

        // 3. Показываем всплывающее уведомление в ТГ
        await telegramFetch('answerCallbackQuery', { 
          callback_query_id: queryId,
          text: replyText
        });

        // 4. Редактируем сообщение: убираем кнопку и добавляем текст "Выполнено"
        // Чтобы пользователь не мог нажать второй раз
        const originalText = update.callback_query.message.text;
        await telegramFetch('editMessageText', {
          chat_id: chatId,
          message_id: update.callback_query.message.message_id,
          text: `${originalText}\n\n${t.done_label}`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] } // Пустая клавиатура убирает кнопки
        });
      }
      
      // На всякий случай отвечаем на любые другие callback'и, чтобы не крутилось
      else {
        await telegramFetch('answerCallbackQuery', { callback_query_id: queryId });
      }
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling bot update:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
