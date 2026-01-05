// bank.js и profile.js - функционал для Bank и Profile

import { supabase } from './config.js';

/* =====================
   BANK FUNCTIONS
===================== */

// Пополнение через TON
window.topUp = async (method) => {
  if (method === 'TON') {
    window.showNotification('TON пополнение пока в разработке', 'info');
    // TODO: Интеграция с TON Connect
  } else if (method === 'Stars') {
    window.showNotification('Stars пополнение пока в разработке', 'info');
    // TODO: Интеграция с Telegram Stars
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

    // Получаем текущий баланс
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('balance, skulls')
      .eq('tg_id', player.tg_id)
      .single();

    if (fetchError || !user) {
      throw new Error('Не удалось получить данные пользователя');
    }

    if (user.balance < amount) {
      window.hideLoader();
      window.showNotification('Недостаточно TON на балансе', 'error');
      return;
    }

    const skullsToAdd = Math.floor(amount * 100);
    const newBalance = Number(user.balance) - amount;
    const newSkulls = Number(user.skulls) + skullsToAdd;

    // Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance: newBalance,
        skulls: newSkulls
      })
      .eq('tg_id', player.tg_id);

    window.hideLoader();

    if (updateError) {
      throw new Error('Ошибка обновления баланса');
    }

    // Обновляем UI
    window.updateBalance(newBalance);
    window.updateSkulls(newSkulls);

    input.value = '';
    window.showNotification(`Получено ${skullsToAdd} 💀`, 'success');

  } catch (e) {
    console.error('Swap error:', e);
    window.hideLoader();
    window.showNotification('Ошибка обмена: ' + e.message, 'error');
  }
};

/* =====================
   PROFILE FUNCTIONS
===================== */

// Загрузка профиля
export async function loadProfile(player) {
  if (!player || !player.tg_id) return;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', player.tg_id)
      .single();

    if (error || !user) {
      console.error('Error loading profile:', error);
      return;
    }

    // Обновляем данные профиля
    const profileTag = document.getElementById('profile-tag');
    const profileBalance = document.getElementById('profile-balance');
    const profileSkulls = document.getElementById('profile-skulls');
    const profileImg = document.getElementById('profile-img');
    const profilePlaceholder = document.getElementById('profile-placeholder');

    if (profileTag) {
      profileTag.textContent = user.id || '@user';
    }

    if (profileBalance) {
      profileBalance.textContent = Number(user.balance || 0).toFixed(2);
    }

    if (profileSkulls) {
      profileSkulls.textContent = user.skulls || 0;
    }

    // Аватар
    if (user.avatar_url && profileImg) {
      profileImg.src = user.avatar_url;
      profileImg.classList.remove('hidden');
      if (profilePlaceholder) profilePlaceholder.classList.add('hidden');
    } else if (profilePlaceholder) {
      profilePlaceholder.textContent = (user.id || 'U')[0].toUpperCase();
    }

    // Заполняем поля редактирования
    const editAvatar = document.getElementById('edit-avatar');
    const editStream = document.getElementById('edit-stream');
    const editBio = document.getElementById('edit-bio');

    if (editAvatar) editAvatar.value = user.avatar_url || '';
    if (editStream) editStream.value = user.stream_link || '';
    if (editBio) editBio.value = user.bio || '';

  } catch (e) {
    console.error('Load profile error:', e);
  }
}

// Сохранение профиля
window.saveProfile = async () => {
  const player = window.player;
  if (!player) {
    window.showNotification('Ошибка: данные игрока не найдены', 'error');
    return;
  }

  const avatarUrl = document.getElementById('edit-avatar')?.value?.trim() || null;
  const streamLink = document.getElementById('edit-stream')?.value?.trim() || null;
  const bio = document.getElementById('edit-bio')?.value?.trim() || null;

  try {
    window.showLoader('Сохраняем...');

    const { error } = await supabase
      .from('users')
      .update({
        avatar_url: avatarUrl,
        stream_link: streamLink,
        bio: bio
      })
      .eq('tg_id', player.tg_id);

    window.hideLoader();

    if (error) {
      throw new Error('Ошибка сохранения');
    }

    // Обновляем аватар в header
    const headerImg = document.getElementById('header-img');
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (avatarUrl && headerImg) {
      headerImg.src = avatarUrl;
      headerImg.classList.remove('hidden');
      if (headerPlaceholder) headerPlaceholder.classList.add('hidden');
    }

    // Обновляем аватар в профиле
    const profileImg = document.getElementById('profile-img');
    const profilePlaceholder = document.getElementById('profile-placeholder');

    if (avatarUrl && profileImg) {
      profileImg.src = avatarUrl;
      profileImg.classList.remove('hidden');
      if (profilePlaceholder) profilePlaceholder.classList.add('hidden');
    }

    window.showNotification('Профиль обновлён!', 'success');

  } catch (e) {
    console.error('Save profile error:', e);
    window.hideLoader();
    window.showNotification('Ошибка: ' + e.message, 'error');
  }
};

/* =====================
   MARKET FUNCTIONS
===================== */

// Загрузка товаров маркета
export async function loadMarket() {
  const container = document.getElementById('market-items');
  if (!container) return;

  try {
    const { data: items, error } = await supabase
      .from('market_items')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Error loading market:', error);
      container.innerHTML = `
        <div class="col-span-2 glass p-6 rounded-2xl text-center text-rose-400">
          <p class="font-bold">Ошибка загрузки маркета</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 glass p-8 rounded-3xl text-center space-y-4">
          <div class="text-5xl">🏪</div>
          <p class="text-slate-400">Товары скоро появятся</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'glass p-4 rounded-2xl space-y-3 hover:border-violet-400 transition-all cursor-pointer fade-in';
      el.style.animationDelay = `${index * 0.1}s`;
      
      el.innerHTML = `
        <div class="aspect-square bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-xl flex items-center justify-center text-4xl">
          ${item.icon || '🎁'}
        </div>
        <div>
          <h3 class="font-black text-sm">${item.name}</h3>
          <p class="text-[10px] text-slate-400">${item.description || ''}</p>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-purple-500/10">
          <span class="text-rose-400 font-black">${item.price} 💀</span>
          <button 
            onclick="buyMarketItem('${item.id}', '${item.name}', ${item.price})"
            class="bg-violet-600 text-white text-[9px] font-black px-4 py-2 rounded-lg uppercase">
            Купить
          </button>
        </div>
      `;
      
      container.appendChild(el);
    });

  } catch (e) {
    console.error('Load market error:', e);
  }
}

// Покупка товара
window.buyMarketItem = async (itemId, itemName, price) => {
  const player = window.player;
  if (!player) {
    window.showNotification('Ошибка: данные игрока не найдены', 'error');
    return;
  }

  try {
    window.showLoader('Покупаем...');

    // Получаем текущий баланс черепов
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('skulls')
      .eq('tg_id', player.tg_id)
      .single();

    if (fetchError || !user) {
      throw new Error('Не удалось получить данные пользователя');
    }

    if (user.skulls < price) {
      window.hideLoader();
      window.showNotification('Недостаточно черепов 💀', 'error');
      return;
    }

    const newSkulls = Number(user.skulls) - price;

    // Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({ skulls: newSkulls })
      .eq('tg_id', player.tg_id);

    window.hideLoader();

    if (updateError) {
      throw new Error('Ошибка покупки');
    }

    // Обновляем UI
    window.updateSkulls(newSkulls);
    window.showNotification(`Куплено: ${itemName}! 🎉`, 'success');

  } catch (e) {
    console.error('Buy item error:', e);
    window.hideLoader();
    window.showNotification('Ошибка: ' + e.message, 'error');
  }
};

/* =====================
   SET BET (для Rocket)
===================== */
window.setBet = (amount) => {
  const input = document.getElementById('bet-amount');
  if (input) {
    input.value = amount;
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  }
};

/* =====================
   ROCKET ACTION PLACEHOLDER
===================== */
window.handleRocketAction = () => {
  window.showNotification('Rocket игра пока в разработке', 'info');
};

// Экспорт
export { loadProfile, loadMarket };
