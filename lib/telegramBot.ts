// This utility was used for server-side Telegram Bot API calls.
// Since migrating to Vite (client-side), direct access to process.env.TELEGRAM_BOT_TOKEN is unsafe and removed.
// Move this logic to a secure backend or Edge Function.

export const sendMessage = async (chatId: number, text: string, keyboard?: any) => {
  console.warn("sendMessage called on client-side. This function is disabled for security.");
};
