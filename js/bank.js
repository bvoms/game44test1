// bank.js — исправленная и стабильная версия

import { supabase } from './config.js';

/* =====================
   BANK FUNCTIONS
===================== */

// Пополнение через TON
window.topUp = async (method) => {
  if (method === 'TON') {
    window.showNotification('TON пополнение пока в разработке', 'info');
  } else if (method === 'Stars') {
    window.showNotification('Stars пополнение пока в разработке', 'info');
  }
};

// Обмен TON на черепа
window.swapToSkulls = async () => {
  const player = window.player;
  if (!player) {
    window.showNotification('Ошибка: данные игрока не найдены', 'error');
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
    const newBalance = Number(user.balance) - amount;
    const newSkulls = Number(user.skulls) + skullsToAdd;

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
   PROFILE FUNCTIONS
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

// Сохранение профиля
window.saveProfile = async () => {
  const player = window.player;
  if (!player) return;

  const avatar = document.getElementById('edit-avatar')?.value || null;
  const stream = document.getElementById('edit-stream')?.value || null;
  const bio = document.getElementById('edit-bio')?.value || null;

  try {
    window.showLoader('Сохраняем...');

    await supabase
      .from('users')
      .update({
        avatar_url: avatar,
        stream_link: stream,
        bio
      })
      .eq('tg_id', player.tg_id);

    window.hideLoader();
    window.showNotification('Профиль обновлён', 'success');

    loadProfile(player);

  } catch (e) {
    window.hideLoader();
    window.showNotification('Ошибка сохранения', 'error');
  }
};

/* =====================
   MARKET FUNCTIONS
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
      container.innerHTML = '<div class="text-center text-slate-400">Товары скоро появятся</div>';
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

// Покупка
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

  } catch (e) {
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
