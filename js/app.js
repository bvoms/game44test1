import { supabase } from './config.js';
import { initRocket } from './rocket.js';

window.onload = async () => {
  try {
    // 🔐 обязательная анонимная авторизация
    await supabase.auth.signInAnonymously();

    console.log('✅ Supabase anon auth OK');

    // 🚀 инициализация ракеты
    initRocket();

  } catch (e) {
    console.error('❌ App init error:', e);
  }
};
