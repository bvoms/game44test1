import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

window.onload = async () => {
  try {
    // 1️⃣ Анонимный вход в Supabase (обязательно)
    await supabase.auth.signInAnonymously();

    // 2️⃣ Получаем Telegram-пользователя
    const tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      alert('Открой приложение через Telegram');
      return;
    }

    const tgId = tgUser.id.toString();
    const tag = '@' + (tgUser.username || tgUser.id);

    // 3️⃣ Проверяем, есть ли пользователь в БД
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // 4️⃣ ЕСЛИ НЕТ — ПОКАЗЫВАЕМ ВЫБОР 44 / 93
    if (!user) {
      document.getElementById('reg-modal')?.classList.remove('hidden');
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

    // 5️⃣ ЕСЛИ ПОЛЬЗОВАТЕЛЬ ЕСТЬ — ЗАПУСКАЕМ ПРИЛОЖЕНИЕ
    initApp(user);
    initRocket();

  } catch (e) {
    console.error('APP INIT ERROR:', e);
    alert('Ошибка запуска приложения');
  }
};

// =====================
// INIT APP UI
// =====================
function initApp(player) {
  // фракция
  document.getElementById('ui-faction').innerText = `ИГРОК ${player.faction}`;

  // баланс
  document.getElementById('ui-balance').innerText =
    `${Number(player.balance || 0).toFixed(2)} TON`;

  document.getElementById('ui-skulls').innerText =
    `${player.skulls || 0} 💀`;

  // убираем "ЗАГРУЗКА..."
  document.getElementById('ui-faction').classList.remove('opacity-50');
}
