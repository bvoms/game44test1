// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('admin_auth') === '1') {
    showPanel();
  }
});

// =====================
// AUTH
// =====================
function tryLogin() {
  const login = document.getElementById('auth-login').value.trim();
  const pass = document.getElementById('auth-pass').value.trim();
  const error = document.getElementById('auth-error');

  if (login === 'game44' && pass === 'thewanga') {
    sessionStorage.setItem('admin_auth', '1');
    showPanel();
  } else {
    error.classList.remove('hidden');
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

// =====================
// UI
// =====================
function showPanel() {
  document.getElementById('admin-auth').style.display = 'none';
  document.getElementById('admin-panel').classList.remove('hidden');
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

  await window.sb.from('tasks').insert({
    title,
    reward
  });

  alert('Задание создано');
}

// =====================
// EXPOSE
// =====================
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
