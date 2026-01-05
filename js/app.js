// app.js - Улучшенная версия

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

    // Показываем лоадер
    window.showLoader('Инициализация...');

    // =====================
    // TELEGRAM INIT
    // =====================
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Настройка цветов под тему Telegram
      if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
      }
      
      // Настройка header color
      if (tg.setHeaderColor) {
        tg.setHeaderColor('#0f0716');
      }
      
      // Настройка background color
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#0f0716');
      }

      console.log('✅ Telegram WebApp initialized');
    }

    // =====================
    // SUPABASE AUTH (STABLE)
    // =====================
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      console.log('Creating anonymous session...');
      await supabase.auth.signInAnonymously();
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      throw new Error('Supabase auth failed: ' + (authError?.message || 'Unknown error'));
    }

    console.log('✅ Supabase authenticated');

    // =====================
    // TELEGRAM USER
    // =====================
    let tgUser = tg?.initDataUnsafe?.user || null;

    // Fallback для тестирования вне Telegram
    if (!tgUser) {
      let storedId = localStorage.getItem('fallback_tg_id');
      if (!storedId) {
        storedId = 'test_' + Math.floor(Math.random() * 999999);
        localStorage.setItem('fallback_tg_id', storedId);
        console.warn('⚠️ Using fallback TG ID:', storedId);
      }
      tgUser = { 
        id: storedId,
        first_name: 'Test User'
      };
    }

    const tgId = tgUser.id.toString();

    // Имя пользователя
    let telegramName = null;
    if (tgUser.first_name && tgUser.first_name.trim().length > 0) {
      telegramName = tgUser.first_name.trim();
    }

    console.log('👤 User TG ID:', tgId);

    // =====================
    // CHECK USER IN DB
    // =====================
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .maybeSingle();

    if (userError) {
      console.error('Error checking user:', userError);
    }

    // =====================
    // REGISTRATION FLOW
    // =====================
    if (!user) {
      window.hideLoader();
      
      const modal = document.getElementById('reg-modal');
      if (modal) {
        modal.classList.remove('hidden');
        
        // Добавляем анимацию появления
        setTimeout(() => {
          modal.style.opacity = '0';
          modal.style.transition = 'opacity 0.3s ease-out';
          modal.offsetHeight; // trigger reflow
          modal.style.opacity = '1';
        }, 10);
      }

      window.completeRegistration = async (faction) => {
        const manualName = document.getElementById('manual-name')?.value?.trim();

        const finalName = manualName || telegramName || `Игрок ${tgId.slice(-4)}`;

        try {
          window.showLoader('Регистрация...');

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: finalName,
              tg_id: tgId,
              faction,
              balance: 0,
              skulls: 0,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error('Ошибка регистрации: ' + insertError.message);
          }

          if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
              modal.style.display = 'none';
              modal.style.pointerEvents = 'none';
            }, 300);
          }

          const newPlayer = {
            id: finalName,
            tg_id: tgId,
            faction,
            balance: 0,
            skulls: 0
          };

          window.player = {
            tg_id: tgId,
            faction,
            id: finalName
          };

          initApp(newPlayer);
          await loadInitialData(newPlayer);

          window.hideLoader();
          window.showNotification(`Добро пожаловать, ${finalName}!`, 'success');

        } catch (e) {
          console.error('Registration error:', e);
          window.hideLoader();
          window.showNotification('Ошибка регистрации: ' + e.message, 'error');
        }
      };

      return;
    }

    // =====================
    // EXISTING USER
    // =====================
    console.log('✅ User found:', user.id);

    window.player = {
      tg_id: user.tg_id,
      faction: user.faction,
      id: user.id
    };

    initApp(user);
    await loadInitialData(user);

    window.hideLoader();
    
    // Показываем приветствие
    if (tg?.initDataUnsafe?.user) {
      setTimeout(() => {
        window.showNotification(`С возвращением, ${user.id}!`, 'info');
      }, 500);
    }

  } catch (e) {
    console.error('❌ APP INIT ERROR:', e);
    window.hideLoader();
    
    // Показываем ошибку пользователю
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6';
    errorDiv.innerHTML = `
      <div class="glass p-8 rounded-3xl max-w-sm space-y-4 text-center">
        <div class="text-5xl">❌</div>
        <h2 class="text-xl font-black text-rose-400">Ошибка запуска</h2>
        <p class="text-sm text-slate-300">${e.message}</p>
        <button onclick="location.reload()" class="w-full bg-violet-600 p-4 rounded-xl font-black uppercase">
          Перезагрузить
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
};

// =====================
// INIT APP UI
// =====================
function initApp(player) {
  console.log('🎨 Initializing UI...');

  try {
    const factionEl = document.getElementById('ui-faction');
    const balanceEl = document.getElementById('ui-balance');
    const skullsEl = document.getElementById('ui-skulls');
    const profileTagEl = document.getElementById('profile-tag');
    const headerImg = document.getElementById('header-img');
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (factionEl) {
      const factionColor = player.faction === '44' ? 'text-violet-300' : 'text-emerald-300';
      factionEl.innerHTML = `<span class="${factionColor}">ИГРОК ${player.faction}</span>`;
    }

    if (balanceEl) {
      balanceEl.textContent = `${Number(player.balance || 0).toFixed(2)} TON`;
    }

    if (skullsEl) {
      skullsEl.textContent = `${player.skulls || 0} 💀`;
    }

    if (profileTagEl && player.id) {
      profileTagEl.textContent = player.id;
    }

    // Аватар в header
    if (player.avatar_url && headerImg) {
      headerImg.src = player.avatar_url;
      headerImg.onerror = () => {
        headerImg.classList.add('hidden');
        if (headerPlaceholder) {
          headerPlaceholder.classList.remove('hidden');
          headerPlaceholder.textContent = (player.id || 'G')[0].toUpperCase();
        }
      };
      headerImg.classList.remove('hidden');
      if (headerPlaceholder) headerPlaceholder.classList.add('hidden');
    } else if (headerPlaceholder) {
      headerPlaceholder.textContent = (player.id || 'G')[0].toUpperCase();
    }

    console.log('✅ UI initialized');

  } catch (e) {
    console.error('UI init error:', e);
  }
}

// =====================
// LOAD INITIAL DATA
// =====================
async function loadInitialData(player) {
  console.log('📊 Loading initial data...');

  try {
    // Загружаем все данные параллельно
    await Promise.all([
      loadTasks(player).catch(e => console.error('Tasks load error:', e)),
      loadProfile(player).catch(e => console.error('Profile load error:', e)),
      loadMarket().catch(e => console.error('Market load error:', e)),
      initRocket().catch(e => console.error('Rocket init error:', e))
    ]);

    console.log('✅ Initial data loaded');

    // Подписываемся на изменения баланса
    subscribeToUserUpdates(player.tg_id);

  } catch (e) {
    console.error('Initial data load error:', e);
  }
}

// =====================
// REALTIME USER UPDATES
// =====================
function subscribeToUserUpdates(tgId) {
  const channel = supabase
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
        console.log('User updated:', payload.new);
        
        const newData = payload.new;
        
        // Обновляем UI
        if (newData.balance !== undefined) {
          window.updateBalance(newData.balance);
        }
        
        if (newData.skulls !== undefined) {
          window.updateSkulls(newData.skulls);
        }
      }
    )
    .subscribe();

  console.log('✅ Subscribed to user updates');
}

// =====================
// ERROR HANDLER
// =====================
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('✅ App.js loaded');
