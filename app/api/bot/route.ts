
import { NextResponse } from 'next/server';
import { sendMessage } from '../../../lib/telegramBot';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // Check if the update contains a message with text
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Handle the /start command
      if (text === '/start') {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app-url.vercel.app';

        const welcomeMessage = "Welcome to HabitFlow! 🚀\nTrack your habits and stay consistent.";
        
        // Inline Keyboard with "Open App" button
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "Start Tracking",
                web_app: { url: appUrl }
              }
            ]
          ]
        };

        await sendMessage(chatId, welcomeMessage, keyboard);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
