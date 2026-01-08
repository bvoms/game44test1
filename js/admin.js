/* =====================
   SUPABASE
===================== */
// sb должен быть объявлен в admin.html через config.js

/* =====================
   TELEGRAM CONFIG
===================== */
const TG_BOT_TOKEN = '8321050426:AAH4fKadiex7i9NQnC7T2ZyjscRknQgFKlI';
const TG_CHAT_ID = '-1003693227904';
const playersFilterState = {
  search: '',
  faction: '',
  status: ''
};

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
    loadPlayers();
    loadAdminLogs();
    subscribePlayersRealtime();
     
     ['players-search', 'players-faction', 'players-status'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
  playersFilterState.search =
    document.getElementById('players-search')?.value.toLowerCase() || '';

  playersFilterState.faction =
    document.getElementById('players-faction')?.value || '';

  playersFilterState.status =
    document.getElementById('players-status')?.value || '';

  loadPlayers();
});
});
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
    loadPlayers();
    loadAdminLogs();
    subscribePlayersRealtime();
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
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const reward = Number(document.getElementById('task-reward').value);
  const duration = Number(document.getElementById('task-duration').value);

  const isTimed = document.getElementById('task-is-timed').checked;
  const availableUntilInput =
    document.getElementById('task-available-until').value;

  let available_until = null;

  if (isTimed) {
    if (!availableUntilInput) {
      alert('Укажи время доступности');
      return;
    }

    available_until = new Date(availableUntilInput).toISOString();
  }

  const { error } = await sb.from('tasks').insert({
    title,
    description,
    reward,
    duration_seconds: duration,
    available_until
  });

  if (error) {
    console.error(error);
    alert('Ошибка создания задания');
    return;
  }

  alert('Задание создано');
  location.reload();
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

  await sb
    .from('users')
    .update({
      balance: Number(user.balance || 0) + reward
    })
    .eq('tg_id', inst.player_tg_id);
}

// 🔔 TELEGRAM
sendTelegram(
  approve
    ? `✅ *ПОДТВЕРЖДЕНО*\n👤 ${inst.player_name}\n+${reward}`
    : `❌ *ОТКЛОНЕНО*\n👤 ${inst.player_name}`
);

// 🧾 ADMIN LOG — СТРОГО ПОСЛЕ ВСЕГО
await logAdmin(
  approve ? 'TASK_APPROVED' : 'TASK_REJECTED',
  inst.player_tg_id,
  approve ? `reward=${reward}` : ''
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
window.openPlayerModal = openPlayerModal;
window.closePlayerModal = closePlayerModal;
window.savePlayer = savePlayer;
window.toggleBlockFromModal = toggleBlockFromModal;

function highlight(text, query) {
  if (!query) return text;

  return text.replace(
    new RegExp(`(${query})`, 'gi'),
    '<span class="text-violet-400 font-black">$1</span>'
  );
}

async function loadPlayers() {
  const table = document.getElementById('players-table');
  if (!table) return;

  table.innerHTML = `
    <tr>
      <td colspan="6" class="p-6 text-center text-slate-400">
        Загрузка игроков...
      </td>
    </tr>
  `;

  const { search, faction, status } = playersFilterState;

  const { data: players, error } = await sb
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-rose-400">
          Ошибка загрузки игроков
        </td>
      </tr>
    `;
    console.error(error);
    return;
  }

  const filtered = players.filter(p => {
    const matchSearch =
      p.id.toLowerCase().includes(search) ||
      p.tg_id.toLowerCase().includes(search);

    const matchFaction = faction ? p.faction === faction : true;
    const matchStatus =
      status === 'blocked'
        ? p.is_blocked
        : status === 'active'
          ? !p.is_blocked
          : true;

    return matchSearch && matchFaction && matchStatus;
  });

  table.innerHTML = '';

  if (filtered.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-slate-500">
          Нет результатов
        </td>
      </tr>
    `;
    return;
  }
const countEl = document.getElementById('players-count');
if (countEl) countEl.textContent = filtered.length;
  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = `
  transition-all cursor-pointer
  ${p.is_blocked ? 'bg-rose-900/30 hover:bg-rose-900/50' : 'hover:bg-white/5'}
`;
    tr.onclick = () => openPlayerModal(p);

    tr.innerHTML = `
      <td class="p-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black overflow-hidden">
          ${p.avatar_url
            ? `<img src="${p.avatar_url}" class="w-full h-full object-cover">`
            : p.id?.[0] || 'U'}
        </div>
        <div>
          <div class="font-bold">
  ${highlight(p.id, search)}
</div>
<div class="text-xs text-slate-400">
  ${highlight(p.tg_id, search)}
</div>
        </div>
      </td>

      <td class="text-center">
        <span class="px-2 py-1 rounded-full text-xs font-black
          ${p.faction === '44'
            ? 'bg-violet-600/30 text-violet-300'
            : 'bg-emerald-600/30 text-emerald-300'}">
          ${p.faction}
        </span>
      </td>

      <td class="text-center font-mono">${Number(p.balance).toFixed(2)}</td>
      <td class="text-center">${p.skulls}</td>

      <td class="text-center">
        ${p.is_blocked
          ? `<span class="text-rose-400 font-bold">BLOCKED</span>`
          : `<span class="text-emerald-400 font-bold">ACTIVE</span>`}
      </td>

      <td class="text-right pr-3">
        <button
  onclick="event.stopPropagation(); toggleBlock('${p.tg_id}', ${p.is_blocked}, this)"
  class="px-3 py-1 rounded-lg text-xs font-black transition-all
  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
  ${p.is_blocked
    ? 'bg-emerald-600 hover:bg-emerald-500'
    : 'bg-rose-600 hover:bg-rose-500'}">
  ${p.is_blocked ? 'UNBLOCK' : 'BLOCK'}
</button>
      </td>
    `;

    table.appendChild(tr);
  });
}
async function toggleBlock(tgId, isBlocked, btn) {
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '...';

  await sb
    .from('users')
    .update({ is_blocked: !isBlocked })
    .eq('tg_id', tgId);

  await logAdmin(
    isBlocked ? 'UNBLOCK_USER' : 'BLOCK_USER',
    tgId
  );

  loadPlayers();
}


let playersChannel = null;

function subscribePlayersRealtime() {
  if (playersChannel) return;

  playersChannel = sb
    .channel('realtime-users')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users'
      },
      payload => {
        console.log('Realtime users update:', payload.eventType);
        loadPlayers();
      }
    )
    .subscribe();
}

let currentPlayer = null;

function openPlayerModal(player) {
  currentPlayer = player;

  document.getElementById('pm-id').textContent = player.id;
  document.getElementById('pm-tg').textContent = player.tg_id;
  document.getElementById('pm-faction').textContent = player.faction;
  document.getElementById('pm-status').textContent =
    player.is_blocked ? 'BLOCKED' : 'ACTIVE';

  document.getElementById('pm-balance').value = player.balance;
  document.getElementById('pm-skulls').value = player.skulls;

  const btn = document.getElementById('pm-block-btn');
  btn.textContent = player.is_blocked ? 'UNBLOCK' : 'BLOCK';
  btn.className =
    `flex-1 p-3 rounded font-black uppercase ${
      player.is_blocked ? 'bg-emerald-600' : 'bg-rose-600'
    }`;

 document.getElementById('player-modal').classList.remove('hidden');
loadPlayerTasks(player.tg_id);
}
async function loadPlayerTasks(tgId) {
  const container = document.getElementById('player-tasks');
  if (!container) return;

  container.innerHTML = `<div class="text-slate-500">Загрузка...</div>`;

  const { data, error } = await sb
    .from('task_instances')
    .select(`
      id,
      status,
      started_at,
      resolved_at,
      tasks (
        title,
        reward
      )
    `)
    .eq('player_tg_id', tgId)
    .order('started_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="text-rose-400">Ошибка загрузки</div>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-slate-500">Нет заданий</div>`;
    return;
  }

  container.innerHTML = '';

  data.forEach(t => {
    const statusColor =
      t.status === 'approved' ? 'text-emerald-400'
      : t.status === 'rejected' ? 'text-rose-400'
      : t.status === 'reported' ? 'text-amber-400'
      : 'text-slate-400';

    const el = document.createElement('div');
    el.className = 'bg-black/30 p-3 rounded-xl space-y-1';

    el.innerHTML = `
      <div class="font-bold">${t.tasks?.title || '—'}</div>
      <div class="flex justify-between text-xs">
        <span class="${statusColor} font-bold uppercase">
          ${t.status}
        </span>
        <span class="text-violet-300">
          ${t.tasks?.reward || 0} TON
        </span>
      </div>
      <div class="text-[10px] text-slate-500">
        ${new Date(t.started_at).toLocaleString()}
        ${t.resolved_at ? ` → ${new Date(t.resolved_at).toLocaleString()}` : ''}
      </div>
    `;

    container.appendChild(el);
  });
}

function closePlayerModal() {
  document.getElementById('player-modal').classList.add('hidden');
  currentPlayer = null;
}
async function savePlayer() {
  if (!currentPlayer) return;

  const balanceInput = document.getElementById('pm-balance');
  const skullsInput = document.getElementById('pm-skulls');

  const newBalance = parseFloat(balanceInput.value);
  const newSkulls = parseInt(skullsInput.value, 10);

  await sb
    .from('users')
    .update({
      balance: isNaN(newBalance) ? currentPlayer.balance : newBalance,
      skulls: isNaN(newSkulls) ? currentPlayer.skulls : newSkulls
    })
    .eq('tg_id', currentPlayer.tg_id);

  await logAdmin(
    'EDIT_PLAYER',
    currentPlayer.tg_id,
    `balance=${newBalance}, skulls=${newSkulls}`
  );

  closePlayerModal();
  loadPlayers();
}
async function toggleBlockFromModal() {
  if (!currentPlayer) return;

  const newStatus = !currentPlayer.is_blocked;

  await sb
    .from('users')
    .update({
      is_blocked: newStatus
    })
    .eq('tg_id', currentPlayer.tg_id);

  // обновляем локальное состояние
  currentPlayer.is_blocked = newStatus;

  await logAdmin(
    newStatus ? 'BLOCK_USER' : 'UNBLOCK_USER',
    currentPlayer.tg_id
  );

  closePlayerModal();
  loadPlayers();
}
async function logAdmin(action, target = null, details = '') {
  await sb.from('admin_logs').insert({
    action,
    target,
    details
  });
}
/* =====================
   ADMIN LOGS PAGINATION
===================== */

let adminLogsPage = 0;
const ADMIN_LOGS_LIMIT = 10;

async function loadAdminLogs() {
  const container = document.getElementById('admin-logs');
  const pageLabel = document.getElementById('admin-logs-page');
  if (!container) return;

  container.innerHTML = `<div class="text-slate-500">Загрузка...</div>`;

  const from = adminLogsPage * ADMIN_LOGS_LIMIT;
  const to = from + ADMIN_LOGS_LIMIT - 1;

  const { data, error } = await sb
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    container.innerHTML = `<div class="text-rose-400">Ошибка загрузки логов</div>`;
    return;
  }

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-slate-500">Нет данных</div>`;
    return;
  }

  data.forEach(log => {
    const el = document.createElement('div');
    el.className = 'bg-black/30 p-3 rounded-xl';

    el.innerHTML = `
      <div class="font-bold">${log.action}</div>
      <div class="text-xs text-slate-400">
        ${log.target || '—'} • ${new Date(log.created_at).toLocaleString()}
      </div>
      ${log.details ? `<div class="text-xs text-slate-300">${log.details}</div>` : ''}
    `;

    container.appendChild(el);
  });

  if (pageLabel) {
    pageLabel.textContent = `Страница ${adminLogsPage + 1}`;
  }
}

function nextAdminLogs() {
  adminLogsPage++;
  loadAdminLogs();
}

function prevAdminLogs() {
  if (adminLogsPage === 0) return;
  adminLogsPage--;
  loadAdminLogs();
}























