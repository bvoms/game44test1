import { sb } from './config.js';

// =====================
// AUTH CHECK ON LOAD
// =====================
document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = sessionStorage.getItem('admin_auth') === '1';

  if (isAdmin) {
    document.getElementById('admin-auth').style.display = 'none';
    document.getElementById('admin-panel').classList.remove('hidden');
  }
});

// =====================
// LOGIN
// =====================
function tryLogin() {
  const loginInput = document.getElementById('auth-login');
  const passInput = document.getElementById('auth-pass');
  const errorEl = document.getElementById('auth-error');

  const login = loginInput.value.trim();
  const pass = passInput.value.trim();

  if (login === 'game44' && pass === 'thewanga') {
    sessionStorage.setItem('admin_auth', '1');
    location.reload();
  } else {
    errorEl.classList.remove('hidden');
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

// =====================
// TASKS
// =====================
async function createTask() {
  const title = document.getElementById('task-title').value.trim();
  const reward = parseFloat(document.getElementById('task-reward').value);

  if (!title || isNaN(reward)) {
    alert('Заполните все поля');
    return;
  }

  await sb.from('tasks').insert({
    title,
    reward
  });

  alert('Задание создано');
}

// =====================
// EXPOSE TO HTML
// =====================
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
