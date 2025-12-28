import { supabase } from './config.js';

/* =====================
   TELEGRAM CONFIG
===================== */
const TG_BOT_TOKEN = '8321050426:AAH4fKadiex7i9NQnC7T2ZyjscRknQgFKlI';
const TG_CHAT_ID = '-1003693227904';

/* =====================
   TELEGRAM SEND (CORS SAFE)
===================== */
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
   AUTO REFRESH
===================== */
setInterval(() => {
  if (window.player) {
    loadTasks(window.player);
  }
}, 4000);

/* =====================
   LOAD TASKS
===================== */
export async function loadTasks(player) {
  const container = document.getElementById('tasks-container');
  container.innerHTML = 'Загрузка...';

  // Проверяем активное / отправленное задание
  const { data: inst } = await supabase
    .from('task_instances')
    .select('*')
    .eq('player_tg_id', player.tg_id)
    .in('status', ['active', 'reported'])
    .maybeSingle();

  // Если задание выполняется
  if (inst) {
    if (inst.status === 'active') {
      showActiveTask(inst);
    } else {
      container.innerHTML = `
        <div class="glass p-4 rounded-2xl text-center text-violet-400">
          Задание отправлено на проверку
        </div>
      `;
    }
    return;
  }

  // Грузим доступные задания
  const { data: tasks } = await supabase.from('tasks').select('*');

  const available = tasks.filter(t => {
    const factionOk = !t.faction || t.faction === player.faction;
    const targetOk = !t.target || t.target === player.tg_id;
    return factionOk && targetOk;
  });

  if (available.length === 0) {
    container.innerHTML = 'Нет доступных заданий';
    return;
  }

  container.innerHTML = '';

  available.forEach(task => {
    const el = document.createElement('div');
    el.className = 'glass p-4 rounded-2xl space-y-2';

    el.innerHTML = `
      <h3 class="font-black">${task.title}</h3>
      <p class="text-xs">${task.description || ''}</p>
      <p class="text-xs text-violet-400">
        ${task.reward} · ${task.duration_minutes} мин
      </p>
      <button
        class="bg-violet-600 px-4 py-2 rounded-xl text-xs font-black uppercase"
        onclick="acceptTask('${task.id}', '${task.title}', ${task.duration_minutes})"
      >
        Взять
      </button>
    `;

    container.appendChild(el);
  });
}

/* =====================
   ACCEPT TASK
===================== */
window.acceptTask = async (taskId, title, duration) => {
  const player = window.player;
  const deadline = new Date(Date.now() + duration * 60000).toISOString();

  const { data: inst, error } = await supabase
    .from('task_instances')
    .insert({
      task_id: taskId,
      player_tg_id: player.tg_id,
      player_name: player.id,
      deadline
    })
    .select()
    .single();

  if (error) {
    alert('Не удалось взять задание');
    return;
  }

  sendTelegram(
    `🟣 *ПРИНЯТО*\n` +
    `👤 ${player.id}\n` +
    `🎯 ${title}`
  );

  showActiveTask(inst);
};

/* =====================
   ACTIVE TASK UI
===================== */
function showActiveTask(inst) {
  const container = document.getElementById('tasks-container');

  container.innerHTML = `
    <div class="glass p-6 rounded-3xl space-y-4 text-center">
      <h3 class="font-black uppercase">Задание в работе</h3>
      <div id="task-timer" class="text-2xl font-black"></div>
      <button
        class="bg-emerald-600 p-4 rounded-xl font-black uppercase"
        onclick="reportTask('${inst.id}')"
      >
        Я выполнил
      </button>
    </div>
  `;

  startTimer(inst.deadline);
}

/* =====================
   TIMER
===================== */
function startTimer(deadline) {
  function tick() {
    const diff = new Date(deadline) - new Date();

    if (diff <= 0) {
      document.getElementById('task-timer').innerText = 'ВРЕМЯ ВЫШЛО';
      return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('task-timer').innerText =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  tick();
  setInterval(tick, 1000);
}

/* =====================
   REPORT TASK DONE
===================== */
window.reportTask = async (instanceId) => {
  const player = window.player;

  const { data: inst } = await supabase
    .from('task_instances')
    .update({
      status: 'reported',
      reported_at: new Date().toISOString()
    })
    .eq('id', instanceId)
    .select()
    .single();

  sendTelegram(
    `📩 *ВЫПОЛНЕНО*\n` +
    `👤 ${player.id}\n` +
    `🆔 ${inst.task_id}`
  );

  loadTasks(player);
};
