import type { VercelRequest, VercelResponse } from '@vercel/node';

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_APP_URL;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Telegram API Error (${method}):`, text);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Fetch error in ${method}:`, error);
  }
}

// Main Vercel Serverless Function Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Проверяем метод (Телеграм шлет только POST)
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is running');
  }

  try {
    // В Vercel Functions тело запроса уже распарсено в req.body
    const update = req.body;

    // --- 1. Handle /start Command ---
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      const firstName = update.message.from?.first_name || 'Friend';

      // Welcome Message
      const text = `👋 Hello, ${firstName}!\n\nWelcome to **HabitFlow** — your personal habit tracker.\n\nStart building better habits today! 🚀`;

      // Inline Keyboard (Rich Menu)
      const reply_markup = {
        inline_keyboard: [
          [
            // ВАЖНО: Используем правильную ссылку на сайт (не api/bot)
            { text: "🚀 Open HabitFlow", web_app: { url: WEB_APP_URL || 'https://habit-v2-0.vercel.app' } }
          ],
          [
            { text: "❓ How it works", callback_data: "help" }
          ],
          [
            { text: "👨‍💻 Support / Feedback", url: "https://t.me/volskov" } 
          ]
        ]
      };

      await telegramFetch('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup
      });
    }

    // --- 2. Handle Callback Queries (Button Clicks) ---
    if (update.callback_query) {
      const queryId = update.callback_query.id;
      const data = update.callback_query.data;
      const chatId = update.callback_query.message?.chat.id;

      if (data === 'help' && chatId) {
        // Guide Text in Russian
        const guideText = "🧩 **Как пользоваться HabitFlow:**\n\n1. Нажми кнопку **Открыть HabitFlow**.\n2. Добавь свои привычки (например, 'Бег' или 'Чтение').\n3. Заходи каждый день и отмечай выполнение.\n4. Следи за статистикой и не разрывай серию! 🔥";

        await telegramFetch('sendMessage', {
          chat_id: chatId,
          text: guideText,
          parse_mode: 'Markdown'
        });
      }

      // Important: Stop the button loading animation
      await telegramFetch('answerCallbackQuery', {
        callback_query_id: queryId
      });
    }

    // Vercel ждет ответ 200
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling bot update:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}