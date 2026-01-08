// bank.js — полная стабильная версия с TON Connect
import { supabase } from './config.js';

/* =====================
   TON CONNECT
===================== */

let tonConnectUI = null;

function getTonConnect() {
  if (typeof window === 'undefined' || !window.TON_CONNECT_UI) {
    return null;
  }

  if (!tonConnectUI) {
    tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
      manifestUrl: `${location.origin}/tonconnect-manifest.json`
    });
  }

  return tonConnectUI;
}

export function getConnectedWallet() {
  return tonConnectUI ? tonConnectUI.wallet : null;
}

export async function connectWallet() {
  const ton = getTonConnect();
  if (!ton) {
    window.showNotification('TON Connect недоступен', 'error');
    return;
  }

  try {
    await ton.connectWallet();
  } catch (e) {
    console.error('TON Connect error:', e);
    window.showNotification('Не удалось подключить кошелёк', 'error');
  }
}

export async function disconnectWallet() {
  if (tonConnectUI) {
    await tonConnectUI.disconnect();
  }
}

/* =====================
   BANK FUNCTIONS
===================== */

// Пополнение
window.topUp = async (method) => {
  if (method === 'Stars') {
    window.showNotification('Stars пополнение пока в разработке', 'info');
    return;
  }

  if (method !== 'TON') return;

  const ton = getTonConnect();
  if (!ton) {
    window.showNotification('TON Connect недоступен', 'error');
    return;
  }

  try {
    await ton.connectWallet();
    window.showNotification('Кошелёк подключён', 'success');
  } catch (e) {
    console.error(e);
    window.showNotification('Ошибка подключения кошелька', 'error');
  }
};

/* =====================
   SWAP TON → SKULLS
===================== */

window.swapToSkulls = async () => {
  const player = window.player;
  if (!player) {
    window.showNotification('Ошибка: игрок не найден', 'error');
    return;
  }

  const input = document.getElementById('swap-amount');
  const amount = parseFloat(input?.value || 0);

  if (isNaN(amount) || amount <= 0) {
    window.showNotification('Введите корректную сумму', 'warning');
    return;
  }

  try {
    window.showLoader('Обмениваем...');

    const { data: user } = await supabase
      .from('users')
      .select('balance, skulls')
      .eq('tg_id', player.tg_id)
      .single();

    if (!user || user.balance < amount) {
      throw new Error('Недостаточно TON');
    }

    const skullsToAdd = Math.floor(amount * 100);
    const newBalance = user.balance - amount;
    const newSkulls = user.skulls + skullsToAdd;

    await supabase
      .from('users')
      .update({
        balance: newBalance,
        skulls: newSkulls
      })
      .eq('tg_id', player.tg_id);

    window.updateBalance?.(newBalance);
    window.updateSkulls?.(newSkulls);

    input.value = '';
    window.hideLoader();
    window.showNotification(`Получено ${skullsToAdd} 💀`, 'success');

  } catch (e) {
    window.hideLoader();
    console.error(e);
    window.showNotification(e.message, 'error');
  }
};

/* =====================
   PROFILE
===================== */

export async function loadProfile(player) {
  if (!player?.tg_id) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', player.tg_id)
      .single();

    if (!user) return;

    document.getElementById('profile-tag').textContent = user.id;
    document.getElementById('profile-balance').textContent =
      Number(user.balance || 0).toFixed(2);
    document.getElementById('profile-skulls').textContent =
      user.skulls || 0;

    const img = document.getElementById('profile-img');
    const placeholder = document.getElementById('profile-placeholder');

    if (user.avatar_url && img) {
      img.src = user.avatar_url;
      img.classList.remove('hidden');
      placeholder?.classList.add('hidden');
    } else if (placeholder) {
      placeholder.textContent = (user.id || 'U')[0];
    }

    document.getElementById('edit-avatar').value = user.avatar_url || '';
    document.getElementById('edit-stream').value = user.stream_link || '';
    document.getElementById('edit-bio').value = user.bio || '';

  } catch (e) {
    console.error('loadProfile error:', e);
  }
}

/* =====================
   MARKET
===================== */

export async function loadMarket() {
  const container = document.getElementById('market-items');
  if (!container) return;

  try {
    const { data: items } = await supabase
      .from('market_items')
      .select('*')
      .order('price', { ascending: true });

    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML =
        '<div class="text-center text-slate-400">Товары скоро появятся</div>';
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'glass p-4 rounded-2xl space-y-3';

      el.innerHTML = `
        <div class="text-4xl">${item.icon || '🎁'}</div>
        <div class="font-black text-sm">${item.name}</div>
        <div class="text-xs text-slate-400">${item.description || ''}</div>
        <div class="flex justify-between items-center">
          <span class="text-rose-400 font-black">${item.price} 💀</span>
          <button onclick="buyMarketItem('${item.id}', '${item.name}', ${item.price})"
            class="bg-violet-600 px-3 py-2 rounded text-xs font-black">
            Купить
          </button>
        </div>
      `;

      container.appendChild(el);
    });

  } catch (e) {
    console.error('loadMarket error:', e);
  }
}

window.buyMarketItem = async (itemId, name, price) => {
  const player = window.player;
  if (!player) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('skulls')
      .eq('tg_id', player.tg_id)
      .single();

    if (!user || user.skulls < price) {
      window.showNotification('Недостаточно 💀', 'error');
      return;
    }

    const newSkulls = user.skulls - price;

    await supabase
      .from('users')
      .update({ skulls: newSkulls })
      .eq('tg_id', player.tg_id);

    window.updateSkulls?.(newSkulls);
    window.showNotification(`Куплено: ${name}`, 'success');

  } catch {
    window.showNotification('Ошибка покупки', 'error');
  }
};

/* =====================
   ROCKET HELPERS
===================== */

window.setBet = (amount) => {
  const input = document.getElementById('bet-amount');
  if (input) input.value = amount;
};

window.handleRocketAction = () => {
  window.showNotification('Rocket игра пока в разработке', 'info');
};

window.saveProfile = async () => {
  const player = window.player;
  if (!player) return;

  const fileInput = document.getElementById('edit-avatar-file');
  const stream = document.getElementById('edit-stream')?.value || null;
  const bio = document.getElementById('edit-bio')?.value || null;

  try {
    window.showLoader('Сохраняем профиль...');

    let avatarUrl; // ⚠️ ВАЖНО: undefined, не null

    // 1️⃣ ЕСЛИ ВЫБРАЛИ ФАЙЛ
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];

      // 🔒 ЛИМИТ 10 МБ
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error('Максимальный размер файла — 10 МБ');
      }

      // 🔒 ТОЛЬКО ИЗОБРАЖЕНИЯ
      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения');
      }

      const ext = file.name.split('.').pop();
      const filePath = `${player.tg_id}.${ext}`; // ❗ БЕЗ avatars/

      // 2️⃣ ЗАГРУЖАЕМ В STORAGE
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // 3️⃣ ПОЛУЧАЕМ PUBLIC URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      avatarUrl = data.publicUrl;
    }

    // 4️⃣ ГОТОВИМ ОБНОВЛЕНИЕ USERS
    const updateData = {
      stream_link: stream,
      bio
    };

    // ❗ avatar_url обновляем ТОЛЬКО если реально загрузили файл
    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    // 5️⃣ ПИШЕМ В БАЗУ
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('tg_id', player.tg_id);

    if (error) throw error;

    // 6️⃣ ОБНОВЛЯЕМ UI
    if (avatarUrl) {
      window.player.avatar_url = avatarUrl;

      const img = document.getElementById('profile-img');
      const placeholder = document.getElementById('profile-placeholder');

      if (img) {
        img.src = avatarUrl + '?v=' + Date.now(); // cache bust
        img.classList.remove('hidden');
        placeholder?.classList.add('hidden');
      }
    }

    window.hideLoader();
    window.showNotification('Профиль обновлён', 'success');

  } catch (e) {
    console.error(e);
    window.hideLoader();
    window.showNotification(e.message || 'Ошибка сохранения профиля', 'error');
  }
};
