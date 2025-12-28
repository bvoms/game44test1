// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('admin_auth') === '1') {
    showPanel();
    loadUsers();
  }
});

// =====================
// AUTH
// =====================
function tryLogin() {
  const loginInput = document.getElementById('auth-login');
  const passInput = document.getElementById('auth-pass');
  const errorEl = document.getElementById('auth-error');

  const login = loginInput.value.trim();
  const pass = passInput.value.trim();

  if (login === 'game44' && pass === 'thewanga') {
    sessionStorage.setItem('admin_auth', '1');
    showPanel();
    loadUsers();
  } else {
    errorEl.classList.remove('hidden');
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

function showPanel() {
  document.getElementById('admin-auth').style.display = 'none';
  document.getElementById('admin-panel').classList.remove('hidden');
}

// =====================
// USERS
// =====================
async function loadUsers() {
  const select = document.getElementById('task-target');
  select.innerHTML = `<option value="">Общее задание</option>`;

  const { data: users, error } = await sb
    .from('users')
    .select('tg_id, id');

  if (error) {
    console.error(error);
    alert('Ошибка загрузки пользователей');
    return;
  }

  users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user.tg_id;
    opt.textContent = user.id;
    select.appendChild(opt);
  });
}

// =====================
// TASKS
// =====================
async function createTask() {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const reward = parseFloat(document.getElementById('task-reward').value);
  const faction = document.getElementById('task-faction').value || null;
  const target = document.getElementById('task-target').value || null;

  if (!title || isNaN(reward)) {
    alert('Заполни название и награду');
    return;
  }

  const { error } = await sb.from('tasks').insert({
    title,
    description,
    reward,
    faction,
    target
  });

  if (error) {
    console.error(error);
    alert('Ошибка создания задания');
    return;
  }

  alert('Задание создано');

  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-reward').value = '';
}

// =====================
// EXPOSE
// =====================
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
