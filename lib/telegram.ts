

// Define a safe interface for the Telegram WebApp object
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        version: string;
        isVersionAtLeast: (version: string) => boolean;
        expand: () => void;
        ready: () => void;
        // Added methods
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        openTelegramLink: (url: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        requestWriteAccess: (callback?: (allowed: boolean) => void) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

// Mock data for development outside of Telegram
const MOCK_USER_ID = 123456789;

export const getTelegramUser = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  // Return mock user if not in Telegram environment (for dev)
  return {
    id: MOCK_USER_ID,
    first_name: "Test",
    username: "testuser",
    language_code: "en"
  };
};

export const initTelegramApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    
    // Apply theme params to CSS variables
    const theme = window.Telegram.WebApp.themeParams;
    const root = document.documentElement;
    
    if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
    if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
    if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
    if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
    if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
  }
};

export const hapticImpact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
};

export const hapticSuccess = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
};

export const hapticNotification = (type: 'error' | 'success' | 'warning') => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  }
};

export const hapticSelection = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.selectionChanged();
  }
};

export const isNotificationSupported = () => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return false;
  
  // requestWriteAccess is available from version 6.9
  // We explicitly check version string to avoid accessing the property which might trigger error on old clients
  return window.Telegram.WebApp.isVersionAtLeast('6.9');
};

export const requestNotificationPermission = (callback?: (allowed: boolean) => void) => {
  if (isNotificationSupported()) {
    try {
      window.Telegram.WebApp.requestWriteAccess((allowed) => {
        if (callback) callback(allowed);
      });
    } catch (e) {
      console.error("Error requesting write access:", e);
      if (callback) callback(false);
    }
  } else {
    // Only log if we are in an environment that has Telegram but version is old
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
       console.warn(`requestWriteAccess not supported (Version: ${window.Telegram.WebApp.version})`);
    }
    if (callback) callback(false);
  }
};
