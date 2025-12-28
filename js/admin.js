// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('admin_auth') === '1') {
    showPanel();
    loadUsers();
    loadInstances();
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
    loadUsers();
    loadInstances();
  } else {
    error.classList.remove('hidden');
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

  const { data } = await sb.from('users').select('tg_id, id');

  data.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.tg_id;
    opt.textContent = u.id;
    select.appendChild(opt);
  });
}

// =====================
// CREATE TASK
// =====================
async function createTask() {
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const reward = parseFloat(document.getElementById('task-reward').value);
  const faction = document.getElementById('task-faction').value || null;
  const target = document.getElementById('task-target').value || null;

  if (!title || isNaN(reward)) {
    alert('Заполни название и награду');
    return;
  }

  await sb.from('tasks').insert({
    title,
    description: desc,
    reward,
    faction,
    target
  });

  alert('Задание создано');
}

// =====================
// LOAD INSTANCES
// =====================
async function loadInstances() {
  const container = document.getElementById('instances-container');
  container.innerHTML = 'Загрузка...';

  const { data, error } = await sb
    .from('task_instances')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    container.innerHTML = 'Ошибка загрузки';
    return;
  }

  container.innerHTML = '';

  data.forEach(inst => {
    const el = document.createElement('div');
    el.className = 'p-3 rounded-xl bg-black/30 space-y-1';

    el.innerHTML = `
      <div><b>${inst.player_name}</b></div>
      <div class="text-xs">Статус: ${inst.status}</div>
      ${
        inst.status === 'reported'
          ? `
        <div class="flex gap-2 pt-2">
          <button
            onclick="resolveInstance('${inst.id}', true)"
            class="bg-emerald-600 px-3 py-1 rounded text-xs font-bold"
          >
            Принять
          </button>
          <button
            onclick="resolveInstance('${inst.id}', false)"
            class="bg-rose-600 px-3 py-1 rounded text-xs font-bold"
          >
            Отклонить
          </button>
        </div>
      `
          : ''
      }
    `;

    container.appendChild(el);
  });
}

// =====================
// RESOLVE
// =====================
async function resolveInstance(id, approve) {
  const { data: inst } = await sb
    .from('task_instances')
    .select('*')
    .eq('id', id)
    .single();

  if (!inst) return;

  const newStatus = approve ? 'approved' : 'rejected';

  await sb.from('task_instances').update({
    status: newStatus,
    resolved_at: new Date().toISOString()
  }).eq('id', id);

  if (approve) {
    const { data: task } = await sb
      .from('tasks')
      .select('reward')
      .eq('id', inst.task_id)
      .single();

    await sb.from('users')
      .update({
        balance: sb.literal(`balance + ${task.reward}`)
      })
      .eq('tg_id', inst.player_tg_id);
  }

  loadInstances();
}

// =====================
// EXPOSE
// =====================
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
window.resolveInstance = resolveInstance;
