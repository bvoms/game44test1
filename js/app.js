import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

window.onload = async () => {
  try {
    // 1️⃣ Supabase anon auth
    await supabase.auth.signInAnonymously();

    // 2️⃣ Получаем Telegram user (или fallback)
    let tgUser = tg?.initDataUnsafe?.user;

    // ⛑️ fallback — КРИТИЧНО
    if (!tgUser) {
      tgUser = {
        id: 'test_' + Math.floor(Math.random() * 99999),
        username: 'guest'
      };
      console.warn('⚠️ Telegram user not found, using fallback');
    }

    const tgId = tgUser.id.toString();
    const tag = '@' + (tgUser.username || tgUser.id);

    // 3️⃣ Проверка пользователя в БД
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // 4️⃣ Если пользователя НЕТ — показываем выбор
    if (!user) {
      const modal = document.getElementById('reg-modal');
      if (!modal) {
        alert('❌ reg-modal не найден в HTML');
        return;
      }

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

        location.reload();
      };

      return;
    }

    // 5️⃣ Пользователь есть — запускаем приложение
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
  document.getElementById('ui-faction').innerText = `ИГРОК ${player.faction}`;
  document.getElementById('ui-balance').innerText =
    `${Number(player.balance || 0).toFixed(2)} TON`;
  document.getElementById('ui-skulls').innerText =
    `${player.skulls || 0} 💀`;
}
