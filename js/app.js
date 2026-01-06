// app.js - Улучшенная версия (FIXED)

import { supabase, tg } from './config.js';
import { initRocket } from './rocket.js';
import { loadTasks } from './tasks.js';
import { loadProfile, loadMarket } from './bank.js';

// =====================
// APP START
// =====================
window.onload = async () => {
  try {
    console.log('🚀 Starting GAME44 APP...');

    window.showLoader('Инициализация...');

    // =====================
    // TELEGRAM INIT
    // =====================
    if (tg) {
      tg.ready();
      tg.expand();

      if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
      }

      tg.setHeaderColor?.('#0f0716');
      tg.setBackgroundColor?.('#0f0716');

      console.log('✅ Telegram WebApp initialized');
    }

    // =====================
    // SUPABASE AUTH
    // =====================
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await supabase.auth.signInAnonymously();
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('Supabase auth failed');
    }

    // =====================
    // TELEGRAM USER
    // =====================
    let tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
      }
      tgUser = { id: storedId, first_name: 'Test User' };
    }

    const tgId = tgUser.id.toString();
    const telegramName = tgUser.first_name?.trim() || null;

    // =====================
    // CHECK USER
    // =====================
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

// =====================
// BLOCK CHECK
// =====================
if (user?.is_blocked) {
  window.hideLoader();
  showBlockedScreen(user);
  return;
}

    // =====================
    // REGISTRATION
    // =====================
    if (!user) {
      window.hideLoader();

      const modal = document.getElementById('reg-modal');
      modal?.classList.remove('hidden');

      window.completeRegistration = async (faction) => {
        const manualName =
          document.getElementById('manual-name')?.value?.trim();

        const finalName =
          manualName || telegramName || `Игрок ${tgId.slice(-4)}`;

        window.showLoader('Регистрация...');

        await supabase.from('users').insert({
          id: finalName,
          tg_id: tgId,
          faction,
          balance: 0,
          skulls: 0,
          avatar_url: null,
          stream_link: null,
          bio: null
        });

        location.reload();
      };

      return;
    }

    // =====================
    // EXISTING USER
    // =====================
    const safeUser = {
      ...user,
      avatar_url: user.avatar_url || null,
      stream_link: user.stream_link || null,
      bio: user.bio || null
    };

    window.player = safeUser;

    initApp(safeUser);
    await loadInitialData(safeUser);

    window.hideLoader();

  } catch (e) {
    console.error('❌ APP INIT ERROR:', e);
    window.hideLoader();
    alert('Ошибка запуска приложения');
  }
};

// =====================
// INIT APP UI
// =====================
function initApp(player) {
  document.getElementById('ui-faction').innerText =
    `ИГРОК ${player.faction}`;

  document.getElementById('ui-balance').innerText =
    `${Number(player.balance || 0).toFixed(2)} TON`;

  document.getElementById('ui-skulls').innerText =
    `${player.skulls || 0} 💀`;

  document.getElementById('profile-tag').innerText =
    player.id;
}

// =====================
// LOAD INITIAL DATA
// =====================
async function loadInitialData(player) {
  console.log('📊 Loading initial data...');

  try {
    // ❗ ВАЖНО: UI init — НЕ в Promise.all
    await loadTasks(player);

    // Эти функции НЕ должны блокировать запуск
    loadProfile(player);
    loadMarket();
    initRocket();

    console.log('✅ Initial data loaded');

    subscribeToUserUpdates(player.tg_id);

  } catch (e) {
    console.error('Initial data load error:', e);
  }
}

// =====================
// REALTIME USER UPDATES
// =====================
function subscribeToUserUpdates(tgId) {
  supabase
    .channel('user_updates_' + tgId)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `tg_id=eq.${tgId}`
      },
      payload => {
  // 🔒 Если заблокировали — сразу выключаем апп
  if (payload.new.is_blocked) {
    showBlockedScreen(payload.new);
    return;
  }

  if (payload.new.balance !== undefined) {
    window.updateBalance?.(payload.new.balance);
  }

  if (payload.new.skulls !== undefined) {
    window.updateSkulls?.(payload.new.skulls);
  }
}
    )
    .subscribe();
}

// =====================
// BLOCKED SCREEN
// =====================
function showBlockedScreen(user) {
  document.body.innerHTML = `
    <div class="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div class="glass max-w-sm w-full p-8 rounded-3xl text-center space-y-4">
        <div class="text-5xl">⛔</div>
        <h1 class="text-xl font-black uppercase text-rose-400">
          Доступ ограничен
        </h1>
        <p class="text-sm text-slate-300">
          Ваш аккаунт временно заблокирован администратором.
        </p>
        <p class="text-xs text-slate-500">
          Если вы считаете это ошибкой — обратитесь к администрации.
        </p>
      </div>
    </div>
  `;
}

