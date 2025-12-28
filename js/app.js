import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

window.onload = async () => {
  try {
    // 1️⃣ Supabase anon auth
    await supabase.auth.signInAnonymously();

    // 2️⃣ Telegram user или стабильный fallback
    let tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      // ⛑️ СТАБИЛЬНЫЙ fallback
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

    // 3️⃣ Проверка пользователя
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // 4️⃣ Регистрация
    if (!user) {
      const modal = document.getElementById('reg-modal');
      modal.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        const authUser = await supabase.auth.getUser();

        await supabase.from('users').insert({
          id: tag,
          tg_id: tgId,
          auth_id: authUser.data.user.id,
          faction,
          balance: 0,
          skulls: 0
        });

        // ❌ НЕ reload
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

    // 5️⃣ Пользователь существует
    initApp(user);
    initRocket();

  } catch (e) {
    console.error('❌ APP INIT ERROR:', e);
    alert('Ошибка запуска приложения');
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
