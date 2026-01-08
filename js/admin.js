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

let currentAdmin = null;

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
  const adminData = sessionStorage.getItem('admin_auth');
  if (adminData) {
    currentAdmin = JSON.parse(adminData);
    showPanel();
    loadUsers();
    loadInstances();
    loadPlayers();
    loadAdminLogs();
    loadAllTasks();
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
async function tryLogin() {
  const login = document.getElementById('auth-login')?.value?.trim();
  const pass = document.getElementById('auth-pass')?.value?.trim();
  const error = document.getElementById('auth-error');

  if (!login || !pass) {
    error?.classList.remove('hidden');
    return;
  }

  const { data: admin } = await window.sb
    .from('admins')
    .select('*')
    .eq('username', login)
    .eq('password_hash', pass)
    .maybeSingle();

  if (admin) {
    currentAdmin = admin;
    sessionStorage.setItem('admin_auth', JSON.stringify(admin));
    showPanel();
    loadUsers();
    loadInstances();
    loadPlayers();
    loadAdminLogs();
    loadAllTasks();
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
  
  const welcomeEl = document.getElementById('admin-welcome');
  if (welcomeEl && currentAdmin) {
    welcomeEl.textContent = `Привет, ${currentAdmin.display_name}`;
  }
}

/* =====================
   LOAD USERS (для личных заданий)
===================== */
async function loadUsers() {
  const select = document.getElementById('task-target');
  if (!select) return;

  select.innerHTML = `<option value="">Общее задание</option>`;

  const { data, error } = await window.sb.from('users').select('tg_id, id');
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
  const faction = document.getElementById('task-faction').value || null;
  const target = document.getElementById('task-target').value || null;

  const availableFrom = document.getElementById('task-available-from').value || null;
  const availableUntil = document.getElementById('task-available-until').value || null;

  if (!title || !reward || !duration) {
    alert('Заполните обязательные поля');
    return;
  }

  const { error } = await window.sb.from('tasks').insert({
    title,
    description,
    reward,
    duration_minutes: duration,
    faction,
    target,
    available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
    available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
    is_active: true
  });

  if (error) {
    console.error(error);
    alert('Ошибка создания задания');
    return;
  }

  await logAdmin('TASK_CREATED', null, title);

  alert('Задание создано');
  location.reload();
}

/* =====================
   LOAD ALL TASKS (admin panel)
===================== */
async function loadAllTasks() {
  const container = document.getElementById('all-tasks-container');
  if (!container) return;

  const { data: tasks, error } = await window.sb
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = 'Ошибка загрузки';
    return;
  }

  container.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    container.innerHTML = 'Пока нет заданий';
    return;
  }

  tasks.forEach(task => {
    const el = document.createElement('div');
    el.className = 'p-4 rounded-xl bg-black/30 space-y-2';

    const statusBadge = task.is_active
      ? '<span class="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">АКТИВНО</span>'
      : '<span class="text-xs bg-slate-700/50 text-slate-400 px-2 py-1 rounded">ОТКЛЮЧЕНО</span>';

    el.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-bold">${task.title}</div>
          <div class="text-xs text-slate-400">${task.description || '—'}</div>
        </div>
        ${statusBadge}
      </div>
      <div class="text-xs text-slate-500">
        Награда: ${task.reward} TON | Время: ${task.duration_minutes} мин
      </div>
      ${task.faction ? `<div class="text-xs">Фракция: ${task.faction}</div>` : ''}
      ${task.target ? `<div class="text-xs">Для: ${task.target}</div>` : ''}
      ${task.available_from ? `<div class="text-xs">С: ${new Date(task.available_from).toLocaleString()}</div>` : ''}
      ${task.available_until ? `<div class="text-xs">До: ${new Date(task.available_until).toLocaleString()}</div>` : ''}
      <div class="flex gap-2 pt-2">
        <button
          onclick="toggleTaskActive('${task.id}', ${!task.is_active})"
          class="px-3 py-1 rounded text-xs font-bold ${task.is_active ? 'bg-slate-600' : 'bg-emerald-600'}">
          ${task.is_active ? 'Отключить' : 'Включить'}
        </button>
        <button
          onclick="deleteTask('${task.id}')"
          class="px-3 py-1 rounded text-xs font-bold bg-rose-600">
          Удалить
        </button>
      </div>
    `;

    container.appendChild(el);
  });
}

window.toggleTaskActive = async (taskId, newStatus) => {
  await window.sb
    .from('tasks')
    .update({ is_active: newStatus })
    .eq('id', taskId);

  await logAdmin('TASK_TOGGLED', null, `task_id=${taskId}, active=${newStatus}`);
  loadAllTasks();
};

window.deleteTask = async (taskId) => {
  if (!confirm('Удалить задание?')) return;

  await window.sb
    .from('tasks')
    .delete()
    .eq('id', taskId);

  await logAdmin('TASK_DELETED', null, `task_id=${taskId}`);
  loadAllTasks();
};

/* =====================
   LOAD TASK INSTANCES
===================== */
async function loadInstances() {
  const container = document.getElementById('instances-container');
  if (!container) return;

  const { data, error } = await window.sb
    .from('task_instances')
    .select(`
      *,
      tasks (title, reward)
    `)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    container.innerHTML = '<div class="text-rose-400">Ошибка загрузки</div>';
    console.error('Load instances error:', error);
    return;
  }

  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<div class="text-slate-500">Пока нет заданий</div>';
    return;
  }

  data.forEach(inst => {
    const el = document.createElement('div');
    el.className = 'p-4 rounded-xl bg-black/30 space-y-3';

    // 🖼️ Обработка proof (изображения и видео)
    let proofHTML = '';
    
    if (inst.proof_url) {
      // Конвертируем Lightshot ссылки в прямые
      let imageUrl = inst.proof_url;
      
      if (imageUrl.includes('prnt.sc/')) {
        // Для Lightshot нужно использовать специальный формат
        const id = imageUrl.split('prnt.sc/')[1];
        imageUrl = https://prnt.sc/${id};
        
        proofHTML = `
          <div class="pt-2 space-y-2">
            <a href="${imageUrl}" target="_blank" class="text-violet-400 text-xs underline block">
              📷 Открыть скриншот Lightshot
            </a>
            <div class="text-[10px] text-slate-500">
              (Lightshot не поддерживает прямые ссылки на изображения)
            </div>
          </div>
        `;
      } else if (inst.proof_type === 'image') {
        // Обычные изображения
        proofHTML = `
          <div class="pt-2">
            <img 
              src="${imageUrl}" 
              class="w-full max-h-60 object-contain rounded-xl border border-white/10"
              onerror="this.parentElement.innerHTML='<p class=\\'text-rose-400 text-xs\\'>❌ Не удалось загрузить изображение</p>'"
            />
          </div>
        `;
      } else if (inst.proof_type === 'video') {
        // Видео
        proofHTML = `
          <div class="pt-2">
            <a href="${imageUrl}" target="_blank" class="text-violet-400 text-xs underline">
              🎥 Открыть видео
            </a>
          </div>
        `;
      } else {
        // Неизвестный тип
        proofHTML = `
          <div class="pt-2">
            <a href="${imageUrl}" target="_blank" class="text-violet-400 text-xs underline">
              🔗 Открыть ссылку
            </a>
          </div>
        `;
      }
    }

    // 🎨 Цвет статуса
    const statusColors = {
      active: 'text-blue-400',
      reported: 'text-amber-400',
      approved: 'text-emerald-400',
      rejected: 'text-rose-400',
      failed: 'text-slate-500'
    };

    const statusColor = statusColors[inst.status] || 'text-slate-400';

    el.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-bold text-white">${inst.player_name}</div>
          <div class="text-sm text-slate-300">${inst.tasks?.title || '—'}</div>
        </div>
        <div class="text-right">
          <div class="text-xs ${statusColor} font-bold uppercase">${inst.status}</div>
          <div class="text-xs text-slate-500">
            ${inst.tasks?.reward || 0} TON
          </div>
        </div>
      </div>

      <div class="text-[10px] text-slate-500">
        Начато: ${new Date(inst.started_at).toLocaleString('ru-RU')}
        ${inst.resolved_at ? <br>Решено: ${new Date(inst.resolved_at).toLocaleString('ru-RU')} : ''}
      </div>

      ${proofHTML}

      ${
        inst.status === 'reported'
          ? `
        <div class="flex gap-2 pt-3 border-t border-white/10">
          <button
            class="flex-1 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
            onclick="resolveInstance('${inst.id}', true)"
          >
            ✅ Принять
            </button>
          <button
            class="flex-1 bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
            onclick="resolveInstance('${inst.id}', false)"
          >
            ❌ Отклонить
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
  try {
    // 1️⃣ Получаем данные задания
    const { data: inst, error: fetchError } = await window.sb
      .from('task_instances')
      .select(`
        *,
        tasks (reward),
        users!task_instances_player_tg_id_fkey (id, stream_link)
      `)
      .eq('id', instanceId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      alert('Ошибка получения данных: ' + fetchError.message);
      return;
    }

    if (!inst) {
      alert('Задание не найдено');
      return;
    }

    console.log('📦 Instance data:', inst);

    const status = approve ? 'approved' : 'rejected';
    const reward = Number(inst.tasks?.reward || 0);

    // 2️⃣ Обновляем статус задания
    const { error: updateError } = await window.sb
      .from('task_instances')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: currentAdmin?.id || null
      })
      .eq('id', instanceId);

    if (updateError) {
      console.error('Update error:', updateError);
      alert('Ошибка обновления: ' + updateError.message);
      return;
    }

    console.log('✅ Instance updated to:', status);

    // 3️⃣ Если одобрено — начисляем награду
    if (approve) {
      const { error: balanceError } = await window.sb
        .from('users')
        .update({
          balance: window.sb.raw(`balance + ${reward}`)
        })
        .eq('tg_id', inst.player_tg_id);

      if (balanceError) {
        console.error('Balance error:', balanceError);
        alert('Ошибка начисления награды: ' + balanceError.message);
        return;
      }

      console.log('💰 Reward added:', reward);
    }

    // 4️⃣ Telegram уведомление
    const playerTag = inst.users?.stream_link
      ? [${inst.player_name}](${inst.users.stream_link})
      : inst.player_name;

    sendTelegram(
      approve
        ? ✅ *ПОДТВЕРЖДЕНО*\n👤 ${playerTag}\n💰 +${reward} TON
        : ❌ *ОТКЛОНЕНО*\n👤 ${playerTag}
    );

    // 5️⃣ Логируем действие
    await logAdmin(
      approve ? 'TASK_APPROVED' : 'TASK_REJECTED',
      inst.player_tg_id,
      approve ? reward=${reward} : ''
    );

    // 6️⃣ Перезагружаем данные
    alert(approve ? '✅ Задание одобрено!' : '❌ Задание отклонено');
    loadInstances();

  } catch (e) {
    console.error('❌ Resolve error:', e);
    alert('Критическая ошибка: ' + e.message);
  }
}

/* =====================
   PLAYERS
===================== */
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

  const { data: players, error } = await window.sb
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

  await window.sb
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

  playersChannel = window.sb
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

  const avatarImg = document.getElementById('pm-avatar');
  const avatarPlaceholder = document.getElementById('pm-avatar-placeholder');

  if (player.avatar_url && avatarImg) {
    avatarImg.src = player.avatar_url;
    avatarImg.classList.remove('hidden');
    avatarPlaceholder.classList.add('hidden');
  } else {
    avatarImg.classList.add('hidden');
    avatarPlaceholder.classList.remove('hidden');
    avatarPlaceholder.textContent = player.id[0] || 'U';
  }

  const btn = document.getElementById('pm-block-btn');
  btn.textContent = player.is_blocked ? 'UNBLOCK' : 'BLOCK';
  btn.className = `flex-1 p-3 rounded font-black uppercase ${
    player.is_blocked ? 'bg-emerald-600' : 'bg-rose-600'
  }`;

  document.getElementById('player-modal').classList.remove('hidden');
  loadPlayerTasks(player.tg_id);
}

async function loadPlayerTasks(tgId) {
  const container = document.getElementById('player-tasks');
  if (!container) return;

  container.innerHTML = `<div class="text-slate-500">Загрузка...</div>`;

  const { data, error } = await window.sb
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
      : t.status === 'failed' ? 'text-slate-500'
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

  await window.sb
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

  await window.sb
    .from('users')
    .update({
      is_blocked: newStatus
    })
    .eq('tg_id', currentPlayer.tg_id);

  currentPlayer.is_blocked = newStatus;

  await logAdmin(
    newStatus ? 'BLOCK_USER' : 'UNBLOCK_USER',
    currentPlayer.tg_id
  );

  closePlayerModal();
  loadPlayers();
}

async function logAdmin(action, target = null, details = '') {
  await window.sb.from('admin_logs').insert({
    admin_id: currentAdmin?.id || null,
    admin_username: currentAdmin?.username || 'system',
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

  const { data, error } = await window.sb
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
        ${log.admin_username || '—'} • ${log.target || '—'} • ${new Date(log.created_at).toLocaleString()}
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
window.nextAdminLogs = nextAdminLogs;
window.prevAdminLogs = prevAdminLogs;

