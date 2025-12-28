import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';

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
    let tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      // стабильный fallback (только для теста)
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
      }

      tgUser = {
        id: storedId,
        first_name: 'Guest'
      };
    }

    const tgId = tgUser.id.toString();
    const displayName =
      tgUser.username ||
      tgUser.first_name ||
      `id${tgUser.id}`;

    // ===== USER CHECK =====
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    // ===== REGISTRATION =====
    if (!user) {
      const modal = document.getElementById('reg-modal');
      modal.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        await supabase.from('users').insert({
          id: displayName,
          tg_id: tgId,
          auth_id: authId,
          faction,
          balance: 0,
          skulls: 0
        });

        // 🔥 ПОЛНОСТЬЮ УБИРАЕМ МОДАЛКУ
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
        document.body.style.overflow = 'auto';

        initApp({
          faction,
          balance: 0,
          skulls: 0,
          id: displayName
        });

        initRocket();
      };

      return;
    }

    // ===== USER EXISTS =====
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
  const factionEl = document.getElementById('ui-faction');
  const balanceEl = document.getElementById('ui-balance');
  const skullsEl = document.getElementById('ui-skulls');

  if (factionEl) {
    factionEl.innerText = `ИГРОК ${player.faction}`;
    factionEl.classList.remove('opacity-50');
  }

  if (balanceEl) {
    balanceEl.innerText = `${Number(player.balance || 0).toFixed(2)} TON`;
  }

  if (skullsEl) {
    skullsEl.innerText = `${player.skulls || 0} 💀`;
  }
}
