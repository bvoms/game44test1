// js/ui.js

const views = [
  'tasks',
  'rocket',
  'bank',
  'market',
  'profile'
];

function switchTab(tab) {
  // скрываем все view
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');

    const nav = document.getElementById(`nav-${v}`);
    if (nav) nav.classList.remove('text-violet-400');
    if (nav) nav.classList.add('text-violet-400/50');
  });

  // показываем нужный
  const activeView = document.getElementById(`view-${tab}`);
  if (activeView) activeView.classList.remove('hidden');

  const activeNav = document.getElementById(`nav-${tab}`);
  if (activeNav) {
    activeNav.classList.remove('text-violet-400/50');
    activeNav.classList.add('text-violet-400');
  }
}

// 🔥 КЛЮЧЕВОЕ
window.switchTab = switchTab;

// по умолчанию открываем tasks
document.addEventListener('DOMContentLoaded', () => {
  switchTab('tasks');
});
