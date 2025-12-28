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
  const login = document.getElementById('auth-login')?.value?.trim();
  const pass = document.getElementById('auth-pass')?.value?.trim();
  const error = document.getElementById('auth-error');

  if (login === 'game44' && pass === 'thewanga') {
    sessionStorage.setItem('admin_auth', '1');
    showPanel();
    loadUsers();
    loadInstances();
  } else {
    error?.classList.remove('hidden');
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
// USERS (для личных заданий)
// =====================
async function loadUsers() {
  const select = document.getElementById('task-target');
  if (!select) return;

  select.innerHTML = `<option value="">Общее задание</option>`;

  const { data, error } = await sb.from('users').select('tg_id, id');
  if (error) return;

  data.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.tg_id;
    opt.textContent = u.id;
    select.appendChild(opt);
  });
}

// =====================
// CREATE TASK (SAFE)
// =====================
async function createTask() {
  const title = document.getElementById('task-title')?.value?.trim();
  const desc = document.getElementById('task-desc')?.value?.trim();
  const rewardVal = document.getElementById('task-reward')?.value;
  const faction = document.getElementById('task-faction')?.value || null;
  const target = document.getElementById('task-target')?.value || null;

  // ⛑️ duration optional
  const durationInput = document.getElementById('task-duration');
  const duration = durationInput
    ? parseInt(durationInput.value, 10)
    : 120; // дефолт 120 минут

  const reward = parseFloat(rewardVal);

  if (!title || isNaN(reward)) {
    alert('Заполни название и награду');
    return;
  }

  const { error } = await sb.from('tasks').insert({
    title,
    description: desc || null,
    reward,
    duration_minutes: duration,
    faction,
    target
  });

  if (error) {
    console.error(error);
    alert('Ошибка создания задания');
    return;
  }

  alert('Задание создано');

  // очистка
  if (document.getElementById('task-title'))
    document.getElementById('task-title').value = '';
  if (document.getElementById('task-desc'))
    document.getElementById('task-desc').value = '';
  if (document.getElementById('task-reward'))
    document.getElementById('task-reward').value = '';
  if (document.getElementById('task-duration'))
    document.getElementById('task-duration').value = '';
}

// =====================
// LOAD TASK INSTANCES
// =====================
async function loadInstances() {
  const container = document.getElementById('instances-container');
  if (!container) return;

  container.innerHTML = 'Загрузка...';

  const { data, error } = await sb
    .from('task_instances')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    container.innerHTML = 'Ошибка загрузки';
    return;
  }

  if (data.length === 0) {
    container.innerHTML = 'Пока нет активных заданий';
    return;
  }

  container.innerHTML = '';

  data.forEach(inst => {
    const el = document.createElement('div');
    el.className = 'p-3 rounded-xl bg-black/30 space-y-1';

    el.innerHTML = `
      <div class="font-bold">${inst.player_name}</div>
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
// RESOLVE INSTANCE
// =====================
async function resolveInstance(instanceId, approve) {
  const { data: inst } = await sb
    .from('task_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (!inst) return;

  await sb.from('task_instances').update({
    status: approve ? 'approved' : 'rejected',
    resolved_at: new Date().toISOString()
  }).eq('id', instanceId);

  if (approve) {
    const { data: task } = await sb
      .from('tasks')
      .select('reward')
      .eq('id', inst.task_id)
      .single();

    const { data: user } = await sb
      .from('users')
      .select('balance')
      .eq('tg_id', inst.player_tg_id)
      .single();

    const newBalance =
      Number(user.balance || 0) + Number(task.reward || 0);

    await sb.from('users')
      .update({ balance: newBalance })
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
