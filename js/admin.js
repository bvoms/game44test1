// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('admin_auth') === '1') {
    showPanel();
    loadUsers();
  }
});

// ===== AUTH =====
function tryLogin() {
  const l = auth-login.value.trim();
  const p = auth-pass.value.trim();

  if (l === 'game44' && p === 'thewanga') {
    sessionStorage.setItem('admin_auth', '1');
    showPanel();
    loadUsers();
  } else {
    document.getElementById('auth-error').classList.remove('hidden');
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

// ===== USERS =====
async function loadUsers() {
  const select = document.getElementById('task-target');
  select.innerHTML = `<option value="">Общее задание</option>`;

  const { data: users } = await sb.from('users').select('tg_id, id');

  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.tg_id;
    opt.textContent = u.id;
    select.appendChild(opt);
  });
}

// ===== TASKS =====
async function createTask() {
  const title = task-title.value.trim();
  const description = task-desc.value.trim();
  const reward = parseFloat(task-reward.value);
  const faction = task-faction.value || null;
  const target = task-target.value || null;

  if (!title || isNaN(reward)) {
    alert('Заполни обязательные поля');
    return;
  }

  await sb.from('tasks').insert({
    title,
    description,
    reward,
    faction,
    target
  });

  alert('Задание создано');

  task-title.value = '';
  task-desc.value = '';
  task-reward.value = '';
}

// ===== EXPOSE =====
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
