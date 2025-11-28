
// Server-side route handler for Telegram Bot Webhook
// Environment variables required: TELEGRAM_BOT_TOKEN, VITE_APP_URL

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

export async function POST(req: Request) {
  try {
    const update = await req.json();

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
            { text: "🚀 Open HabitFlow", web_app: { url: WEB_APP_URL || 'https://google.com' } }
          ],
          [
            { text: "❓ How it works", callback_data: "help" }
          ],
          [
            { text: "👨‍💻 Support / Feedback", url: "https://t.me/volskov" } // TODO: Replace YOUR_USERNAME
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

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error handling bot update:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
