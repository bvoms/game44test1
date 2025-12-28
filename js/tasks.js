// js/tasks.js
import { supabase } from './config.js';

export async function loadTasks(player) {
  const container = document.getElementById('tasks-container');
  container.innerHTML = 'Загрузка заданий...';

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
        Награда: ${task.reward} · Время: ${task.duration_minutes} мин
      </p>
    `;

    container.appendChild(el);
  });
}
