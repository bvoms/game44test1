// ==========================
// SUPABASE CONFIG
// ==========================
export const SUPABASE_URL = 'https://xzzaoniuzvcxqfugvfzh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YAn708jttD0b0vAGLPreog_ZnCvFhAH';

// supabase-js v2 (через CDN)
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================
// TELEGRAM WEBAPP
// ==========================
export const tg = window.Telegram?.WebApp;

// ==========================
// TELEGRAM BOT (уведомления)
// ⚠️ временно на фронте
// ==========================
export const TG_BOT_TOKEN = '8321050426:AAH4fKadiex7i9NQnC7T2ZyjscRknQgFKlI';
export const TG_CHAT_ID  = '-1003693227904';
