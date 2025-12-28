import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';
import { loadTasks } from './tasks.js';

// =====================
// APP START
// =====================
window.onload = async () => {
  try {
    // =====================
    // TELEGRAM INIT
    // =====================
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // =====================
    // SUPABASE AUTH (STABLE)
    // =====================
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      await supabase.auth.signInAnonymously();
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('Supabase auth failed');
    }

    // =====================
    // TELEGRAM USER
    // =====================
    let tgUser = tg?.initDataUnsafe?.user || null;

    // fallback (если не в TG)
    if (!tgUser) {
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
      }
      tgUser = { id: storedId };
    }

    const tgId = tgUser.id.toString();

    // имя (если пришло)
    let telegramName = null;
    if (tgUser.first_name && tgUser.first_name.trim().length > 0) {
      telegramName = tgUser.first_name.trim();
    }

    // =====================
    // CHECK USER IN DB
    // =====================
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // =====================
    // REGISTRATION FLOW
    // =====================
    if (!user) {
      const modal = document.getElementById('reg-modal');
      modal.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        const manualName =
          document.getElementById('manual-name')?.value?.trim();

        const finalName =
          telegramName ||
          manualName ||
          `Игрок ${tgId.slice(-4)}`;

        await supabase.from('users').insert({
          id: finalName,
          tg_id: tgId,
          faction,
          balance: 0,
          skulls: 0
        });

        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';

        const newPlayer = {
          id: finalName,
          tg_id: tgId,
          faction,
          balance: 0,
          skulls: 0
        };

        initApp(newPlayer);

        window.player = {
          tg_id: tgId,
          faction,
          id: finalName
        };

        loadTasks({
          tg_id: tgId,
          faction
        });

        initRocket();
      };

      return;
    }

    // =====================
    // EXISTING USER
    // =====================
    initApp(user);

    window.player = {
      tg_id: user.tg_id,
      faction: user.faction,
      id: user.id
    };

    loadTasks({
      tg_id: user.tg_id,
      faction: user.faction
    });

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
    balanceEl.innerText =
      `${Number(player.balance || 0).toFixed(2)} TON`;
  }

  if (skullsEl) {
    skullsEl.innerText =
      `${player.skulls || 0} 💀`;
  }

  if (profileTagEl && player.id) {
    profileTagEl.innerText = player.id;
  }
}
