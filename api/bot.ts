import type { VercelRequest, VercelResponse } from '@vercel/node';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_APP_URL;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Dictionary (Словарь) ---
const TRANSLATIONS = {
  en: {
    welcome: (name: string) => `👋 Hello, ${name}!\n\nWelcome to **HabitFlow** — your personal habit tracker.\n\nStart building better habits today! 🚀`,
    btn_open: "🚀 Open HabitFlow",
    btn_help: "❓ How it works",
    btn_support: "👨‍💻 Support / Feedback",
    help_text: "🧩 **How to use HabitFlow:**\n\n1. Click **Open HabitFlow**.\n2. Add your habits (e.g. 'Running', 'Reading').\n3. Check in daily to track progress.\n4. Watch your stats and keep the streak alive! 🔥"
  },
  ru: {
    welcome: (name: string) => `👋 Привет, ${name}!\n\nДобро пожаловать в **HabitFlow** — твой личный трекер привычек.\n\nНачни менять свою жизнь уже сегодня! 🚀`,
    btn_open: "🚀 Открыть HabitFlow",
    btn_help: "❓ Как это работает",
    btn_support: "👨‍💻 Поддержка / Автор",
    help_text: "🧩 **Как пользоваться HabitFlow:**\n\n1. Нажми кнопку **Открыть HabitFlow**.\n2. Добавь свои привычки (например, 'Бег' или 'Чтение').\n3. Заходи каждый день и отмечай выполнение.\n4. Следи за статистикой и не разрывай серию! 🔥"
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
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is running');
  }

  try {
    const update = req.body;

    // --- 1. Handle /start Command ---
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      const firstName = user?.first_name || 'Friend';
      
      // Determine language
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      // Inline Keyboard
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

    // --- 2. Handle Callback Queries ---
    if (update.callback_query) {
      const queryId = update.callback_query.id;
      const data = update.callback_query.data;
      const chatId = update.callback_query.message?.chat.id;
      const user = update.callback_query.from;

      // Determine language for callback too
      const lang = getLanguage(user?.language_code);
      const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

      if (data === 'help' && chatId) {
        await telegramFetch('sendMessage', {
          chat_id: chatId,
          text: t.help_text,
          parse_mode: 'Markdown'
        });
      }

      await telegramFetch('answerCallbackQuery', { callback_query_id: queryId });
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling bot update:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}