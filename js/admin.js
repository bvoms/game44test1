/* =====================
   SUPABASE
===================== */
// sb должен быть объявлен в admin.html через config.js

/* =====================
   TELEGRAM CONFIG
===================== */
const TG_BOT_TOKEN = '8321050426:AAH4fKadiex7i9NQnC7T2ZyjscRknQgFKlI';
const TG_CHAT_ID = '-1003693227904';

function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  const data = new URLSearchParams({
    chat_id: TG_CHAT_ID,
    text,
    parse_mode: 'Markdown'
  });

  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    body: data
  });
}

/* =====================
   INIT
===================== */
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('admin_auth') === '1') {
    showPanel();
    loadUsers();
    loadInstances();
  }
});

/* =====================
   AUTH
===================== */
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

/* =====================
   LOAD USERS (для личных заданий)
===================== */
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

/* =====================
   CREATE TASK
===================== */
async function createTask() {
  const title = document.getElementById('task-title')?.value?.trim();
  const desc = document.getElementById('task-desc')?.value?.trim() || null;
  const reward = parseFloat(document.getElementById('task-reward')?.value);
  const faction = document.getElementById('task-faction')?.value || null;
  const target = document.getElementById('task-target')?.value || null;

  const durationInput = document.getElementById('task-duration');
  const duration = durationInput ? parseInt(durationInput.value, 10) : 120;

  if (!title || isNaN(reward)) {
    alert('Заполни название и награду');
    return;
  }

  const { error } = await sb.from('tasks').insert({
    title,
    description: desc,
    reward,
    duration_minutes: duration,
    faction,
    target
  });

  if (error) {
    alert('Ошибка создания задания');
    console.error(error);
    return;
  }

  alert('Задание создано');

  document.getElementById('task-title').value = '';
  if (document.getElementById('task-desc')) document.getElementById('task-desc').value = '';
  document.getElementById('task-reward').value = '';
  if (document.getElementById('task-duration')) document.getElementById('task-duration').value = '';
}

/* =====================
   LOAD TASK INSTANCES
===================== */
async function loadInstances() {
  const container = document.getElementById('instances-container');
  if (!container) return;

  const { data, error } = await sb
    .from('task_instances')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    container.innerHTML = 'Ошибка загрузки';
    return;
  }

  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = 'Пока нет заданий';
    return;
  }

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
            class="bg-emerald-600 px-3 py-1 rounded text-xs font-bold"
            onclick="resolveInstance('${inst.id}', true)"
          >
            Принять
          </button>
          <button
            class="bg-rose-600 px-3 py-1 rounded text-xs font-bold"
            onclick="resolveInstance('${inst.id}', false)"
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

/* =====================
   RESOLVE INSTANCE
===================== */
async function resolveInstance(instanceId, approve) {
  const { data: inst } = await sb
    .from('task_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (!inst) return;

  const status = approve ? 'approved' : 'rejected';

  await sb.from('task_instances')
    .update({
      status,
      resolved_at: new Date().toISOString()
    })
    .eq('id', instanceId);

  let reward = 0;

  if (approve) {
    const { data: task } = await sb
      .from('tasks')
      .select('reward')
      .eq('id', inst.task_id)
      .single();

    reward = Number(task.reward || 0);

    const { data: user } = await sb
      .from('users')
      .select('balance')
      .eq('tg_id', inst.player_tg_id)
      .single();

    await sb.from('users')
      .update({ balance: Number(user.balance || 0) + reward })
      .eq('tg_id', inst.player_tg_id);
  }

  // 🔔 TELEGRAM
  sendTelegram(
    approve
      ? `✅ *ПОДТВЕРЖДЕНО*\n👤 ${inst.player_name}\n+${reward}`
      : `❌ *ОТКЛОНЕНО*\n👤 ${inst.player_name}`
  );

  loadInstances();
}

/* =====================
   EXPOSE
===================== */
window.tryLogin = tryLogin;
window.logout = logout;
window.createTask = createTask;
window.resolveInstance = resolveInstance;
