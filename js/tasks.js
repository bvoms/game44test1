import { supabase } from './config.js';

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
  fetch(url, { method: 'POST', mode: 'no-cors', body: data });
}

/* =====================
   STATE
===================== */
let activeInstance = null;
let realtimeChannel = null;
let silentCheckTimer = null;

/* =====================
   INIT / LOAD
===================== */
export async function loadTasks(player) {
  const container = document.getElementById('tasks-container');

  // 🔹 всегда проверяем актуальный инстанс
  const { data: inst } = await supabase
    .from('task_instances')
    .select('*')
    .eq('player_tg_id', player.tg_id)
    .in('status', ['active', 'reported'])
    .maybeSingle();

  // === есть активное / на проверке ===
  if (inst) {
    activeInstance = inst;
    subscribe(inst.id);
    renderActive(inst);
    startSilentCheck(player);
    return;
  }

  // === если раньше было задание, а теперь нет ===
  activeInstance = null;
  stopSilentCheck();
  unsubscribe();

  // === показываем доступные задания ===
  const { data: tasks } = await supabase.from('tasks').select('*');

  container.innerHTML = '';

  tasks
    .filter(t =>
      (!t.faction || t.faction === player.faction) &&
      (!t.target || t.target === player.tg_id)
    )
    .forEach(task => {
      const el = document.createElement('div');
      el.className = 'glass p-4 rounded-2xl space-y-2';
      el.innerHTML = `
        <h3 class="font-black">${task.title}</h3>
        <p class="text-xs">${task.description || ''}</p>
        <button class="bg-violet-600 px-4 py-2 rounded-xl"
          onclick="acceptTask('${task.id}', '${task.title}', ${task.duration_minutes})">
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

  const { data: inst } = await supabase
    .from('task_instances')
    .insert({
      task_id: taskId,
      player_tg_id: player.tg_id,
      player_name: player.id,
      deadline
    })
    .select()
    .single();

  sendTelegram(`🟣 *ПРИНЯТО*\n👤 ${player.id}\n🎯 ${title}`);

  activeInstance = inst;
  subscribe(inst.id);
  renderActive(inst);
  startSilentCheck(player);
};

/* =====================
   REALTIME
===================== */
function subscribe(id) {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('task_instance_' + id)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'task_instances',
        filter: `id=eq.${id}`
      },
      payload => {
        if (payload.new.status === 'approved' || payload.new.status === 'rejected') {
          loadTasks(window.player);
        }
      }
    )
    .subscribe();
}

function unsubscribe() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

/* =====================
   SILENT FALLBACK CHECK
===================== */
function startSilentCheck(player) {
  if (silentCheckTimer) return;

  silentCheckTimer = setInterval(async () => {
    if (!activeInstance) return;

    const { data } = await supabase
      .from('task_instances')
      .select('status')
      .eq('id', activeInstance.id)
      .single();

    if (data && (data.status === 'approved' || data.status === 'rejected')) {
      loadTasks(player);
    }
  }, 6000);
}

function stopSilentCheck() {
  if (silentCheckTimer) {
    clearInterval(silentCheckTimer);
    silentCheckTimer = null;
  }
}

/* =====================
   RENDER
===================== */
function renderActive(inst) {
  const container = document.getElementById('tasks-container');

  if (inst.status === 'reported') {
    container.innerHTML = `
      <div class="glass p-4 rounded-2xl text-center">
        Задание на проверке
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="glass p-6 rounded-3xl text-center space-y-4">
      <h3 class="font-black">Задание в работе</h3>
      <button class="bg-emerald-600 p-4 rounded-xl"
        onclick="reportTask('${inst.id}')">
        Я выполнил
      </button>
    </div>
  `;
}

/* =====================
   REPORT DONE
===================== */
window.reportTask = async (id) => {
  const player = window.player;

  const { data: inst } = await supabase
    .from('task_instances')
    .update({
      status: 'reported',
      reported_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  sendTelegram(`📩 *ВЫПОЛНЕНО*\n👤 ${player.id}`);

  renderActive(inst);
};
