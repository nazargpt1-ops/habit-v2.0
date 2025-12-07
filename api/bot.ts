
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_APP_URL; 
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Initialize Supabase
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
    done_success: "Great job! Habit marked as done. 🔥",
    done_error: "Could not mark as done.",
    done_label: "✅ Completed!"
  },
  ru: {
    welcome: (name: string) => `👋 Привет, ${name}!\n\nДобро пожаловать в **HabitFlow** — твой личный трекер привычек.\n\nНачни менять свою жизнь уже сегодня! 🚀`,
    btn_open: "🚀 Открыть HabitFlow",
    btn_help: "❓ Как это работает",
    btn_support: "👨‍💻 Поддержка / Автор",
    help_text: "🧩 **Как пользоваться HabitFlow:**\n\n1. Нажми кнопку **Открыть HabitFlow**.\n2. Добавь свои привычки.\n3. Отмечай выполнение.\n4. Не разрывай серию! 🔥",
    done_success: "Отлично! Привычка выполнена. 🔥",
    done_error: "Ошибка записи.",
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

    // --- 1. /start Command ---
    if (update.message && update.message.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      const firstName = user?.first_name || 'Friend';
      
      // Update notifications_enabled when user starts the bot
      await supabase.from('users').update({ notifications_enabled: true }).eq('telegram_id', chatId);

      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      // 1.1. Parse referral code ("ref_123")
      // Message text: "/start ref_12345"
      const textParts = update.message.text.split(' ');
      let startParam = '';
      if (textParts.length > 1) {
        startParam = textParts[1]; // "ref_12345"
      }

      // 1.2. Construct Smart URL
      // If referral exists, append it as ?start_param=...
      let appUrl = WEB_APP_URL || 'https://habitflow-app.ru';
      if (startParam) {
        // Handle existing query params if present
        const separator = appUrl.includes('?') ? '&' : '?';
        appUrl += `${separator}start_param=${startParam}`;
      }

      const reply_markup = {
        inline_keyboard: [
          [
            // Now passing the link with the tail!
            { text: t.btn_open, web_app: { url: appUrl } }
          ],
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

    // --- 2. Callback (Buttons) ---
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
      else if (data.startsWith('done_') && chatId) {
         const habitId = data.replace('done_', '');
         const today = new Date().toISOString().split('T')[0];
         const { error } = await supabase.from('completions').insert({
            habit_id: habitId, user_id: user.id, date: today, completed_at: new Date().toISOString()
         });
         
         let replyText = t.done_success;
         if (error && error.code !== '23505') replyText = t.done_error;

         await telegramFetch('answerCallbackQuery', { callback_query_id: queryId, text: replyText });
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
