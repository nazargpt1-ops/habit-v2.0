
import { getCurrentUserId } from '../services/habitService';

/**
 * Checks if the user has started the bot by querying the backend.
 * Returns true if notifications are enabled, false otherwise.
 */
export const checkBotStarted = async (): Promise<boolean> => {
  const userId = getCurrentUserId();
  
  // If it's a test user/environment without real ID, return false (or true depending on dev needs)
  if (!userId || userId === 99999999) return false;

  try {
    const response = await fetch(`/api/check-bot-status?id=${userId}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!data.enabled;
  } catch (e) {
    console.error("Failed to check bot status:", e);
    return false;
  }
};

/**
 * Updates the user's bot status to started manually.
 * Primarily used if we detect the start via other means.
 */
export const markBotAsStarted = async (): Promise<boolean> => {
  const userId = getCurrentUserId();
  
  try {
    const response = await fetch(`/api/mark-bot-started`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: userId })
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Dispatches a custom event to force the bot subscription banner to appear.
 */
export const showBotBanner = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-bot-banner'));
  }
};
