import { supabase } from './config.js';

let currentLeaderboard = 'tasks';

export async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center text-slate-500">Загрузка...</div>';

  try {
    let leaderboardData = [];

    if (currentLeaderboard === 'tasks') {
      // Лидеры по количеству выполненных заданий
      const { data, error } = await supabase
        .from('task_instances')
        .select(`
          player_tg_id,
          player_name,
          users!task_instances_player_tg_id_fkey (
            avatar_url,
            faction
          )
        `)
        .eq('status', 'approved');

      if (error) throw error;

      const grouped = {};
      data.forEach(inst => {
        const key = inst.player_tg_id;
        if (!grouped[key]) {
          grouped[key] = {
            tg_id: inst.player_tg_id,
            name: inst.player_name,
            avatar_url: inst.users?.avatar_url,
            faction: inst.users?.faction,
            count: 0
          };
        }
        grouped[key].count++;
      });

      leaderboardData = Object.values(grouped)
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);

    } else {
      // Лидеры по общей сумме наград
      const { data, error } = await supabase
        .from('task_instances')
        .select(`
          player_tg_id,
          player_name,
          tasks (reward),
          users!task_instances_player_tg_id_fkey (
            avatar_url,
            faction
          )
        `)
        .eq('status', 'approved');

      if (error) throw error;

      const grouped = {};
      data.forEach(inst => {
        const key = inst.player_tg_id;
        if (!grouped[key]) {
          grouped[key] = {
            tg_id: inst.player_tg_id,
            name: inst.player_name,
            avatar_url: inst.users?.avatar_url,
            faction: inst.users?.faction,
            total: 0
          };
        }
        grouped[key].total += Number(inst.tasks?.reward || 0);
      });

      leaderboardData = Object.values(grouped)
        .sort((a, b) => b.total - a.total)
        .slice(0, 100);
    }

    container.innerHTML = '';

    if (leaderboardData.length === 0) {
      container.innerHTML = '<div class="text-center text-slate-500">Пока нет данных</div>';
      return;
    }

    leaderboardData.forEach((player, index) => {
      const el = document.createElement('div');
      el.className = `flex items-center gap-3 p-3 rounded-xl ${
        index < 3 ? 'bg-violet-900/30 border border-violet-500/30' : 'bg-black/20'
      }`;

      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

      el.innerHTML = `
        <div class="text-xl font-black w-8 text-center">${medal}</div>
        
        <div class="w-10 h-10 rounded-xl bg-violet-600 overflow-hidden flex-shrink-0">
          ${player.avatar_url
            ? `<img src="${player.avatar_url}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full flex items-center justify-center font-black">${player.name[0]}</div>`
          }
        </div>
        
        <div class="flex-1">
          <div class="font-bold">${player.name}</div>
          <div class="text-xs text-slate-400">
            <span class="px-1.5 py-0.5 rounded ${
              player.faction === '44' ? 'bg-violet-900/50 text-violet-300' : 'bg-emerald-900/50 text-emerald-300'
            }">
              ${player.faction}
            </span>
          </div>
        </div>
        
        <div class="text-right">
          <div class="font-black text-violet-300">
            ${currentLeaderboard === 'tasks' 
              ? `${player.count} 🎯` 
              : `${player.total.toFixed(2)} TON`
            }
          </div>
        </div>
      `;

      container.appendChild(el);
    });

  } catch (e) {
    console.error('Leaderboard error:', e);
    container.innerHTML = '<div class="text-center text-rose-400">Ошибка загрузки</div>';
  }
}

window.switchLeaderboard = (type) => {
  currentLeaderboard = type;

  const tasksBtn = document.getElementById('lb-tasks-btn');
  const rewardsBtn = document.getElementById('lb-rewards-btn');

  if (type === 'tasks') {
    tasksBtn?.classList.add('bg-violet-600');
    tasksBtn?.classList.remove('bg-slate-700');
    rewardsBtn?.classList.add('bg-slate-700');
    rewardsBtn?.classList.remove('bg-violet-600');
  } else {
    rewardsBtn?.classList.add('bg-violet-600');
    rewardsBtn?.classList.remove('bg-slate-700');
    tasksBtn?.classList.add('bg-slate-700');
    tasksBtn?.classList.remove('bg-violet-600');
  }

  loadLeaderboard();
};
