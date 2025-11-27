import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Обратите внимание: Vercel видит переменные как process.env, даже если это Vite проект
const APP_URL = process.env.VITE_APP_URL; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Проверяем, что это POST запрос (Телеграм всегда шлет POST)
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is running correctly');
  }

  try {
    const { body } = req;
    
    // Логируем для отладки в Vercel Logs
    console.log('Received update:', JSON.stringify(body));

    // 2. Проверяем, есть ли сообщение и текст
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      // 3. Если нажали /start
      if (text === '/start') {
        await sendMessage(chatId, "👋 Привет! Добро пожаловать в HabitFlow.\n\nНачни трекать свои привычки и достигать целей прямо сейчас!");
      } else {
        // Ответ на любой другой текст (опционально)
        // await sendMessage(chatId, "Нажми кнопку ниже, чтобы открыть приложение 👇");
      }
    }

    // Телеграм ждет статус 200, иначе будет слать повторы
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Вспомогательная функция отправки
async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: "🚀 Открыть HabitFlow", 
            web_app: { url: APP_URL } // Кнопка, открывающая Mini App
          }
        ]
      ]
    }
  };

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}