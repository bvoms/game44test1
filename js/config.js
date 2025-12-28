// js/config.js

// ==========================
// SUPABASE
// ==========================
export const SUPABASE_URL = 'https://xzzaoniuzvcxqfugvfzh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YAn708jttD0b0vAGLPreog_ZnCvFhAH';

// ❗ SDK УЖЕ В window.supabase
// ❗ ИМЕННО ТАК берём createClient
const { createClient } = window.supabase;

if (!createClient) {
  throw new Error('Supabase SDK not loaded. Check script order in index.html');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

// ==========================
// TELEGRAM WEBAPP
// ==========================
export const tg = window.Telegram?.WebApp;
