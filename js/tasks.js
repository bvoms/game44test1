import { sb } from './config.js';
import { sendTelegram } from './telegram.js';
import { player } from './app.js';

export async function initTasks() {
  const { data } = await sb.from('tasks').select('*');

  const container = document.getElementById('tasks-container');
  container.innerHTML = '';

  data
    .filter(t => t.faction === player.faction || t.target === player.id)
    .forEach(t => {
      const div = document.createElement('div');
      div.className = 'glass p-4 rounded-xl flex justify-between';

      div.innerHTML = `
        <div>
          <h4 class="font-bold">${t.title}</h4>
          <p class="text-xs">${t.reward} TON</p>
        </div>
        <button class="btn" data-id="${t.id}">Принять</button>
      `;

      div.querySelector('button').onclick = () => acceptTask(t);
      container.appendChild(div);
    });
}

async function acceptTask(task) {
  localStorage.setItem(`active_${player.id}`, JSON.stringify(task));
  sendTelegram(`🟣 ${player.id} принял задание: ${task.title}`);
}
