
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const sendMessage = async (chatId: number, text: string, keyboard?: any) => {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not defined in environment variables");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API Error:', errorData);
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};
