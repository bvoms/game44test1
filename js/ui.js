/* =====================
   VIEWS
===================== */
const views = [
  'tasks',
  'links',
  'bank',
  'leaderboard',
  'profile'
];

/* =====================
   TAB SWITCHER
===================== */
function switchTab(tab) {
  if (!views.includes(tab)) {
    console.error('Invalid tab:', tab);
    return;
  }

  // hide all
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

  // show active
  setTimeout(() => {
    const activeView = document.getElementById(`view-${tab}`);
    const activeNav = document.getElementById(`nav-${tab}`);

    if (activeView) {
      activeView.classList.remove('hidden');
      activeView.style.opacity = '0';
      activeView.style.transform = 'translateY(10px)';
      activeView.offsetHeight;
      activeView.style.transition = 'all 0.3s ease-out';
      activeView.style.opacity = '1';
      activeView.style.transform = 'translateY(0)';
    }

    if (activeNav) {
      activeNav.classList.remove('text-violet-400/50');
      activeNav.classList.add('text-violet-400');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }

    // Load data when switching to leaderboard
    if (tab === 'leaderboard' && window.loadLeaderboard) {
      window.loadLeaderboard();
    }
  }, 150);

  try {
    localStorage.setItem('lastActiveTab', tab);
  } catch {}
}

/* =====================
   BALANCE UI
===================== */
function updateBalance(newBalance) {
  const header = document.getElementById('ui-balance');
  const profile = document.getElementById('profile-balance');

  if (header) {
    header.textContent = `${Number(newBalance).toFixed(2)} TON`;
  }

  if (profile) {
    profile.textContent = Number(newBalance).toFixed(2);
  }
}

function updateSkulls(newSkulls) {
  const header = document.getElementById('ui-skulls');
  const profile = document.getElementById('profile-skulls');

  if (header) {
    header.textContent = `${newSkulls} 💀`;
  }

  if (profile) {
    profile.textContent = newSkulls;
  }
}

/* =====================
   NOTIFICATIONS
===================== */
function showNotification(message, type = 'info') {
  const box = document.createElement('div');

  const colors = {
    success: 'border-emerald-500/50 bg-emerald-900/20',
    error: 'border-rose-500/50 bg-rose-900/20',
    info: 'border-violet-500/50 bg-violet-900/20',
    warning: 'border-amber-500/50 bg-amber-900/20'
  };

  box.className = `
    fixed top-20 left-1/2 -translate-x-1/2 z-[60]
    px-6 py-4 rounded-2xl glass max-w-sm
    border ${colors[type] || colors.info}
  `;

  box.innerHTML = `<p class="font-bold text-sm text-center">${message}</p>`;
  document.body.appendChild(box);

  if (window.Telegram?.WebApp?.HapticFeedback) {
    Telegram.WebApp.HapticFeedback.notificationOccurred(
      type === 'error' ? 'error' : 'success'
    );
  }

  setTimeout(() => {
    box.style.opacity = '0';
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/* =====================
   LOADER
===================== */
function showLoader(text = 'Загрузка...') {
  if (document.getElementById('app-loader')) return;

  const el = document.createElement('div');
  el.id = 'app-loader';
  el.className =
    'fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center';

  el.innerHTML = `
    <div class="glass p-8 rounded-3xl text-center space-y-3">
      <div class="spinner mx-auto"></div>
      <p class="font-bold text-violet-300">${text}</p>
    </div>
  `;

  document.body.appendChild(el);
}

function hideLoader() {
  const el = document.getElementById('app-loader');
  if (!el) return;

  el.style.opacity = '0';
  setTimeout(() => el.remove(), 300);
}

/* =====================
   HELPERS
===================== */
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* =====================
   TELEGRAM LINKS
===================== */
window.openTelegramLink = (url) => {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
};

/* =====================
   EXPORT TO WINDOW
===================== */
window.switchTab = switchTab;
window.updateBalance = updateBalance;
window.updateSkulls = updateSkulls;
window.showNotification = showNotification;
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.formatTime = formatTime;

/* =====================
   INIT
===================== */
document.addEventListener('DOMContentLoaded', () => {
  let startTab = 'tasks';

  try {
    const saved = localStorage.getItem('lastActiveTab');
    if (saved && views.includes(saved)) {
      startTab = saved;
    }
  } catch {}

  switchTab(startTab);

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      el.style.transition =
        'opacity 0.3s ease-out, transform 0.3s ease-out';
    }
  });

  console.log('✅ UI система инициализирована');
});
