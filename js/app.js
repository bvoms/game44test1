import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

window.onload = async () => {
  try {
    // 1️⃣ Проверяем, есть ли уже сессия
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      await supabase.auth.signInAnonymously();
    }

    // 2️⃣ Теперь auth ID СТАБИЛЕН
    const { data: authData } = await supabase.auth.getUser();
    const authId = authData.user.id;

    // 3️⃣ Telegram user или стабильный fallback
    let tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
      }

      tgUser = {
        id: storedId,
        username: 'guest'
      };
    }

    const tgId = tgUser.id.toString();
    const tag = '@' + (tgUser.username || tgUser.id);

    // 4️⃣ ИЩЕМ пользователя ПО tg_id
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // 5️⃣ ЕСЛИ НЕТ — РЕГИСТРАЦИЯ
    if (!user) {
      const modal = document.getElementById('reg-modal');
      modal.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        await supabase.from('users').insert({
          id: tag,
          tg_id: tgId,
          auth_id: authId,
          faction,
          balance: 0,
          skulls: 0
        });

        modal.classList.add('hidden');
        initApp({
          faction,
          balance: 0,
          skulls: 0
        });
        initRocket();
      };

      return;
    }

    // 6️⃣ ПОЛЬЗОВАТЕЛЬ СУЩЕСТВУЕТ
    initApp(user);
    initRocket();

  } catch (e) {
    console.error('❌ APP INIT ERROR:', e);
    alert('Ошибка запуска приложения, смотри консоль');
  }
};

// =====================
// UI INIT
// =====================
function initApp(player) {
  document.getElementById('ui-faction').innerText =
    `ИГРОК ${player.faction}`;

  document.getElementById('ui-balance').innerText =
    `${Number(player.balance || 0).toFixed(2)} TON`;

  document.getElementById('ui-skulls').innerText =
    `${player.skulls || 0} 💀`;
}
