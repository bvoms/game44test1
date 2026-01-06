// js/ui.js - Улучшенная версия с анимациями

const views = [
  'tasks',
  'links',   // ✅ новая вкладка
  'bank',
  'market',
  'profile'
];

function switchTab(tab) {
  if (!views.includes(tab)) {
    console.error('Invalid tab:', tab);
    return;
  }

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const nav = document.getElementById(`nav-${v}`);

    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.classList.add('hidden'), 150);
    }

    if (nav) {
      nav.classList.remove('text-violet-400');
      nav.classList.add('text-violet-400/50');
    }
  });

  setTimeout(() => {
    const activeView = document.getElementById(`view-${tab}`);
    if (activeView) {
      activeView.classList.remove('hidden');
      activeView.style.opacity = '0';
      activeView.style.transform = 'translateY(10px)';
      activeView.offsetHeight;
      activeView.style.transition = 'all 0.3s ease-out';
      activeView.style.opacity = '1';
      activeView.style.transform = 'translateY(0)';
    }

    const activeNav = document.getElementById(`nav-${tab}`);
    if (activeNav) {
      activeNav.classList.remove('text-violet-400/50');
      activeNav.classList.add('text-violet-400');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }, 150);

  try {
    localStorage.setItem('lastActiveTab', tab);
  } catch {}
}
    // Обновляем активную навигацию
    const activeNav = document.getElementById(`nav-${tab}`);
    if (activeNav) {
      activeNav.classList.remove('text-violet-400/50');
      activeNav.classList.add('text-violet-400');
      
      // Добавляем тактильную обратную связь (вибрация)
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  , 150);

  // Сохраняем текущий таб в localStorage
  try {
    localStorage.setItem('lastActiveTab', tab);
  } catch (e) {
    console.warn('localStorage не доступен:', e);
  }
}

// Функция для обновления баланса с анимацией
function updateBalance(newBalance) {
  const balanceEl = document.getElementById('ui-balance');
  const profileBalanceEl = document.getElementById('profile-balance');
  
  if (balanceEl) {
    balanceEl.classList.add('balance-increase');
    balanceEl.textContent = `${Number(newBalance).toFixed(2)} TON`;
    
    setTimeout(() => {
      balanceEl.classList.remove('balance-increase');
    }, 500);
  }
  
  if (profileBalanceEl) {
    profileBalanceEl.textContent = Number(newBalance).toFixed(2);
  }
}

// Функция для обновления черепов с анимацией
function updateSkulls(newSkulls) {
  const skullsEl = document.getElementById('ui-skulls');
  const profileSkullsEl = document.getElementById('profile-skulls');
  
  if (skullsEl) {
    skullsEl.classList.add('balance-increase');
    skullsEl.textContent = `${newSkulls} 💀`;
    
    setTimeout(() => {
      skullsEl.classList.remove('balance-increase');
    }, 500);
  }
  
  if (profileSkullsEl) {
    profileSkullsEl.textContent = newSkulls;
  }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-4 rounded-2xl glass slide-up max-w-sm`;
  
  const colors = {
    success: 'border-emerald-500/50 bg-emerald-900/20',
    error: 'border-rose-500/50 bg-rose-900/20',
    info: 'border-violet-500/50 bg-violet-900/20',
    warning: 'border-amber-500/50 bg-amber-900/20'
  };
  
  notification.className += ` ${colors[type] || colors.info}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-2xl">${icons[type] || icons.info}</span>
      <p class="font-bold text-sm">${message}</p>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Вибрация для Telegram
  if (window.Telegram?.WebApp?.HapticFeedback) {
    const hapticType = type === 'error' ? 'error' : 'success';
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(hapticType);
  }
  
  // Удаляем через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Функция для показа лоадера
function showLoader(message = 'Загрузка...') {
  const loader = document.createElement('div');
  loader.id = 'app-loader';
  loader.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center';
  loader.innerHTML = `
    <div class="glass p-8 rounded-3xl text-center space-y-4">
      <div class="spinner mx-auto"></div>
      <p class="font-bold text-violet-300">${message}</p>
    </div>
  `;
  document.body.appendChild(loader);
}

// Функция для скрытия лоадера
function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
}

// Функция для форматирования времени
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Экспорт функций в глобальную область
window.switchTab = switchTab;
window.updateBalance = updateBalance;
window.updateSkulls = updateSkulls;
window.showNotification = showNotification;
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.formatTime = formatTime;

document.addEventListener('DOMContentLoaded', () => {
  let lastTab = 'tasks';

  try {
    const saved = localStorage.getItem('lastActiveTab');
    if (saved && views.includes(saved)) lastTab = saved;
  } catch {}

  switchTab(lastTab);

  window.openTelegramLink = (url) => {
    if (window.Telegram?.WebApp) {
      Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    }
  });

  console.log('✅ UI система инициализирована');
});





