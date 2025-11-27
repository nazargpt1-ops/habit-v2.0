
import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval
// Handles cases where import.meta.env is undefined (which causes the runtime crash)
const getEnvVar = (key: string, legacyKey?: string): string => {
  let value = '';
  
  // 1. Try import.meta.env (Vite standard)
  try {
    // We strictly check if import.meta.env exists before accessing it to prevent TypeError
    // Cast import.meta to any because standard ImportMeta interface doesn't include env (needs vite/client types)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      value = String((import.meta as any).env[key]);
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not supported
  }

  // 2. Fallback to process.env (Node/Next.js/Webpack standard)
  if (!value) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        value = process.env[key] || (legacyKey ? process.env[legacyKey] : '') || '';
      }
    } catch (e) {
      // Ignore errors if process is not defined
    }
  }

  return value;
};

// Retrieve variables with Vite prefix first, then legacy Next.js prefix
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Only warn if we are in a browser environment to avoid noise
if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== 'undefined') {
  console.warn("Supabase is not configured. App will run in Mock Mode. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!supabase;
