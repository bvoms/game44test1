// js/tasks.js
import { supabase } from './config.js';

let currentInstance = null;
let timerInterval = null;

export async function loadTasks(player) {
  const container = document.getElementById('tasks-container');
  container.innerHTML = 'Загрузка заданий...';

  // 1️⃣ проверяем, нет ли уже активного задания
  const { data: active } = await supabase
    .from('task_instances')
    .select('*')
    .eq('player_tg_id', player.tg_id)
    .eq('status', 'active')
    .maybeSingle();

  if (active) {
    showActiveTask(active);
    return;
  }

  // 2️⃣ грузим доступные задания
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = 'Ошибка загрузки заданий';
    return;
  }

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
        Награда: ${task.reward} · ${task.duration_minutes} мин
      </p>
      <button
        class="bg-violet-600 px-4 py-2 rounded-xl text-xs font-black uppercase"
        onclick="acceptTask('${task.id}', ${task.duration_minutes})"
      >
        Взять
      </button>
    `;

    container.appendChild(el);
  });
}

// =====================
// TAKE TASK
// =====================
window.acceptTask = async (taskId, durationMinutes) => {
  const player = window.player;

  const deadline = new Date(Date.now() + durationMinutes * 60000).toISOString();

  const { data, error } = await supabase
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
    console.error(error);
    return;
  }

  showActiveTask(data);
};

// =====================
// ACTIVE TASK UI
// =====================
function showActiveTask(instance) {
  currentInstance = instance;

  const container = document.getElementById('tasks-container');
  container.innerHTML = `
    <div class="glass p-6 rounded-3xl space-y-4">
      <h3 class="text-lg font-black uppercase">Задание в работе</h3>
      <p class="text-xs text-violet-300">Осталось времени:</p>
      <div id="task-timer" class="text-2xl font-black">--:--</div>

      <button
        class="bg-emerald-600 p-4 rounded-xl font-black uppercase"
        onclick="reportTaskDone()"
      >
        Я выполнил
      </button>
    </div>
  `;

  startTimer(instance.deadline);
}

// =====================
// TIMER
// =====================
function startTimer(deadline) {
  clearInterval(timerInterval);

  function tick() {
    const diff = new Date(deadline) - new Date();

    if (diff <= 0) {
      clearInterval(timerInterval);
      document.getElementById('task-timer').innerText = 'ВРЕМЯ ВЫШЛО';
      return;
    }

    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    document.getElementById('task-timer').innerText =
      `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

// =====================
// REPORT DONE
// =====================
window.reportTaskDone = async () => {
  if (!currentInstance) return;

  await supabase
    .from('task_instances')
    .update({
      status: 'reported',
      reported_at: new Date().toISOString()
    })
    .eq('id', currentInstance.id);

  alert('Отчёт отправлен администратору');
};
