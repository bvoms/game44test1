import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

// =====================
// APP START
// =====================
window.onload = async () => {
  try {
    // ===== TELEGRAM INIT =====
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // ===== SUPABASE AUTH =====
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await supabase.auth.signInAnonymously();
    }

    const { data: authData } = await supabase.auth.getUser();
    const authId = authData.user.id;

    // ===== TELEGRAM USER =====
    let tgUser = tg?.initDataUnsafe?.user || null;

    // fallback tg id (для теста вне TG)
    if (!tgUser) {
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
      }

      tgUser = {
        id: storedId
      };
    }

    const tgId = tgUser.id.toString();

    // ===== ИМЯ ИЗ TELEGRAM (ЕСЛИ ПРИШЛО) =====
    let telegramName = null;

    if (tgUser.first_name && tgUser.first_name.trim().length > 0) {
      telegramName = tgUser.first_name.trim();
    }

    // ===== ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ =====
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // ===== РЕГИСТРАЦИЯ =====
    if (!user) {
      const modal = document.getElementById('reg-modal');
      modal.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        // имя, введённое вручную
        const manualNameInput = document.getElementById('manual-name');
        const manualName = manualNameInput?.value?.trim();

        const finalName =
          telegramName ||
          manualName ||
          `Игрок ${tgId.slice(-4)}`;

        await supabase.from('users').insert({
          id: finalName,
          tg_id: tgId,
          auth_id: authId,
          faction,
          balance: 0,
          skulls: 0
        });

        // полностью убираем модалку
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
        document.body.style.overflow = 'auto';

        initApp({
          id: finalName,
          faction,
          balance: 0,
          skulls: 0
        });

        initRocket();
      };

      return;
    }

    // ===== ПОЛЬЗОВАТЕЛЬ СУЩЕСТВУЕТ =====
    initApp(user);
    initRocket();

  } catch (e) {
    console.error('❌ APP INIT ERROR:', e);
    alert('Ошибка запуска приложения. Смотри консоль.');
  }
};

// =====================
// UI INIT
// =====================
function initApp(player) {
  const factionEl = document.getElementById('ui-faction');
  const balanceEl = document.getElementById('ui-balance');
  const skullsEl = document.getElementById('ui-skulls');
  const profileTagEl = document.getElementById('profile-tag');

  if (factionEl) {
    factionEl.innerText = `ИГРОК ${player.faction}`;
  }

  if (balanceEl) {
    balanceEl.innerText = `${Number(player.balance || 0).toFixed(2)} TON`;
  }

  if (skullsEl) {
    skullsEl.innerText = `${player.skulls || 0} 💀`;
  }

  if (profileTagEl && player.id) {
    profileTagEl.innerText = player.id;
  }
}
