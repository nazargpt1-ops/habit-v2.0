import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_APP_URL; // https://habitflow-app.ru
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Инициализация Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TRANSLATIONS = {
  en: {
    welcome: (name: string) => `👋 Hello, ${name}!\n\nWelcome to **HabitFlow** — your personal habit tracker.\n\nStart building better habits today! 🚀`,
    btn_open: "🚀 Open HabitFlow",
    btn_help: "❓ How it works",
    btn_support: "👨‍💻 Support / Feedback",
    help_text: "🧩 **How to use HabitFlow:**\n\n1. Click **Open HabitFlow**.\n2. Add your habits.\n3. Track daily.\n4. Keep the streak alive! 🔥",
    done_success: "Great job! Habit marked as done (+10 XP). 🔥",
    done_error: "Could not mark as done (maybe already completed).",
    done_label: "✅ Completed!"
  },
  ru: {
    welcome: (name: string) => `👋 Привет, ${name}!\n\nДобро пожаловать в **HabitFlow** — твой личный трекер привычек.\n\nНачни менять свою жизнь уже сегодня! 🚀`,
    btn_open: "🚀 Открыть HabitFlow",
    btn_help: "❓ Как это работает",
    btn_support: "👨‍💻 Поддержка / Автор",
    help_text: "🧩 **Как пользоваться HabitFlow:**\n\n1. Нажми кнопку **Открыть HabitFlow**.\n2. Добавь свои привычки.\n3. Отмечай выполнение.\n4. Не разрывай серию! 🔥",
    done_success: "Отлично! Привычка выполнена (+10 XP). 🔥",
    done_error: "Ошибка записи (возможно, уже выполнено).",
    done_label: "✅ Выполнено!"
  }
};

function getLanguage(code?: string) {
  if (code && (code === 'ru' || code.startsWith('ru-'))) return 'ru';
  return 'en';
}

async function telegramFetch(method: string, body: any) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`Fetch error in ${method}:`, error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).send('Bot running');

  try {
    const update = req.body;

    // --- 1. Команда /start ---
    if (update.message && update.message.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      const firstName = user?.first_name || 'Friend';
      
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      // 1.1. Ищем реферальный код ("ref_123")
      const textParts = update.message.text.split(' ');
      let startParam = '';
      if (textParts.length > 1) {
        startParam = textParts[1]; 
      }

      // 1.2. Формируем ссылку с хвостом
      let appUrl = WEB_APP_URL || 'https://habitflow-app.ru';
      if (startParam) {
        appUrl += `?start_param=${startParam}`;
      }

      const reply_markup = {
        inline_keyboard: [
          [{ text: t.btn_open, web_app: { url: appUrl } }],
          [{ text: t.btn_help, callback_data: "help" }],
          [{ text: t.btn_support, url: "https://t.me/volskov" }]
        ]
      };

      await telegramFetch('sendMessage', {
        chat_id: chatId,
        text: t.welcome(firstName),
        parse_mode: 'Markdown',
        reply_markup
      });
    }

    // --- 2. Callback (Кнопки) ---
    if (update.callback_query) {
      const queryId = update.callback_query.id;
      const data = update.callback_query.data;
      const chatId = update.callback_query.message?.chat.id;
      const user = update.callback_query.from;
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      if (data === 'help' && chatId) {
        await telegramFetch('sendMessage', {
          chat_id: chatId,
          text: t.help_text,
          parse_mode: 'Markdown'
        });
        await telegramFetch('answerCallbackQuery', { callback_query_id: queryId });
      }
      // Нажатие "Готово" в напоминании
      else if (data.startsWith('done_') && chatId) {
         const habitId = data.replace('done_', '');
         const today = new Date().toISOString().split('T')[0];
         
         // 1. Записываем выполнение
         const { error } = await supabase.from('completions').insert({
            habit_id: habitId, user_id: user.id, date: today, completed_at: new Date().toISOString()
         });
         
         let replyText = t.done_success;
         
         // 2. Начисляем XP (если успешно записали)
         if (!error) {
            const { data: uData } = await supabase.from('users').select('xp, level').eq('telegram_id', user.id).single();
            if (uData) {
                const newXp = (uData.xp || 0) + 10;
                const newLvl = Math.floor(newXp / 100) + 1;
                await supabase.from('users').update({ xp: newXp, level: newLvl }).eq('telegram_id', user.id);
            }
         } else if (error.code !== '23505') {
             replyText = t.done_error;
         }

         await telegramFetch('answerCallbackQuery', { callback_query_id: queryId, text: replyText });
         
         // Убираем кнопку
         const originalText = update.callback_query.message.text;
         await telegramFetch('editMessageText', {
            chat_id: chatId,
            message_id: update.callback_query.message.message_id,
            text: `${originalText}\n\n${t.done_label}`,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] }
         });
      }
      else {
        await telegramFetch('answerCallbackQuery', { callback_query_id: queryId });
      }
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Bot Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
