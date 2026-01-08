
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
  fetch(url, { method: 'POST', mode: 'no-cors', body: data })
    .catch(e => console.warn('TG send error:', e));
}

/* =====================
   STATE
===================== */
let activeInstance = null;
let realtimeChannel = null;
let timerInterval = null;

/* =====================
   TIMER MANAGEMENT
===================== */
function startTimer(deadline) {
  // Очищаем предыдущий таймер
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const timerEl = document.getElementById('active-timer');
  if (!timerEl) return;

  timerInterval = setInterval(() => {
    const now = new Date().getTime();
    const end = new Date(deadline).getTime();
    const diff = end - now;

    if (diff <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = '00:00:00';
      timerEl.classList.remove('timer-active');
      timerEl.classList.add('text-rose-500');
      return;
    }

    const seconds = Math.floor(diff / 1000);
    timerEl.textContent = window.formatTime(seconds);
    
    // Мигание когда осталось меньше минуты
    if (seconds < 60) {
      timerEl.classList.add('timer-active', 'text-rose-400');
    } else {
      timerEl.classList.remove('timer-active', 'text-rose-400');
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getAvailabilityLabel(availableUntil) {
  if (!availableUntil) {
    return {
      text: '♾ Постоянное',
      class: 'bg-slate-800/60 text-slate-300'
    };
  }

  const now = Date.now();
  const end = new Date(availableUntil).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return null; // уже недоступно
  }

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 60) {
    return {
      text: `🔥 Осталось ${minutes} мин`,
      class: 'bg-rose-900/60 text-rose-300'
    };
  }

  if (hours < 24) {
    return {
      text: `⏳ Осталось ${hours}ч ${minutes % 60}м`,
      class: 'bg-amber-900/60 text-amber-300'
    };
  }

  const date = new Date(availableUntil);
  return {
    text: `📅 До ${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0,5)}`,
    class: 'bg-violet-900/60 text-violet-300'
  };
}

/* =====================
   LOAD TASKS
===================== */
export async function loadTasks(player) {
  if (!player || !player.tg_id) {
    console.error('Player data missing');
    return;
  }

  const container = document.getElementById('tasks-container');
  const activeZone = document.getElementById('active-zone');
  
  if (!container) {
    console.error('Tasks container not found');
    return;
  }

  try {
    // 1️⃣ Проверяем активное / на проверке задание
    const { data: inst, error: instError } = await supabase
      .from('task_instances')
      .select('*')
      .eq('player_tg_id', player.tg_id)
      .in('status', ['active', 'reported'])
      .maybeSingle();

    if (instError) {
      console.error('Error loading active task:', instError);
    }

    if (inst) {
      activeInstance = inst;
      subscribe(inst.id);
      await renderActive(inst);
      return;
    }

    // Скрываем зону активного задания
    if (activeZone) {
      activeZone.classList.add('hidden');
    }

    // 2️⃣ Получаем историю выполненных заданий
    const { data: history, error: histError } = await supabase
      .from('task_instances')
      .select('task_id')
      .eq('player_tg_id', player.tg_id);

    if (histError) {
      console.error('Error loading history:', histError);
    }

    const doneTaskIds = new Set(
      (history || []).map(i => i.task_id)
    );

    // 3️⃣ Загружаем доступные задания
    const now = new Date().toISOString();

const { data: tasks, error: tasksError } = await supabase
  .from('tasks')
  .select('*')
  .or(
    `available_until.is.null,available_until.gt.${now}`
  )
  .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error loading tasks:', tasksError);
      container.innerHTML = `
        <div class="glass p-6 rounded-2xl text-center text-rose-400">
          <p class="font-bold">❌ Ошибка загрузки заданий</p>
          <button onclick="location.reload()" class="mt-4 bg-violet-600 px-4 py-2 rounded-xl text-white">
            Обновить
          </button>
        </div>
      `;
      return;
    }

    // Фильтруем задания
    const availableTasks = (tasks || []).filter(t => {
  if (t.available_until && new Date(t.available_until).getTime() <= Date.now()) {
    return false; // задание протухло
  }

  return (
    (!t.faction || t.faction === player.faction) &&
    (!t.target || t.target === player.tg_id) &&
    !doneTaskIds.has(t.id)
  );
});

    // Отображаем задания
    container.innerHTML = '';

    if (availableTasks.length === 0) {
      container.innerHTML = `
        <div class="glass p-8 rounded-3xl text-center space-y-4">
          <div class="text-5xl">🎉</div>
          <h3 class="text-lg font-black text-violet-300">Все задания выполнены!</h3>
          <p class="text-sm text-slate-400">Скоро появятся новые</p>
        </div>
      `;
      return;
    }

    availableTasks.forEach((task, index) => {
      const el = document.createElement('div');
      el.className = 'glass p-5 rounded-2xl space-y-3 task-card fade-in';
      el.style.animationDelay = `${index * 0.1}s`;
      
      const factionBadge = task.faction 
        ? `<span class="text-[8px] px-2 py-1 rounded-full ${task.faction === '44' ? 'bg-violet-900/50 text-violet-300' : 'bg-emerald-900/50 text-emerald-300'} font-bold uppercase">
             ИГРОК ${task.faction}
           </span>`
        : '';
      
      const duration = task.duration_minutes || 120;
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const timeStr = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
      const availability = getAvailabilityLabel(task.available_until);
      el.innerHTML = `
<div class="flex justify-between items-start gap-2">
  <h3 class="font-black text-white leading-tight flex-1">${task.title}</h3>
  <div class="flex flex-col gap-1 items-end">
    ${factionBadge}
    ${
      availability
        ? `<span class="text-[9px] px-2 py-1 rounded-full font-bold ${availability.class}">
             ${availability.text}
           </span>`
        : ''
    }
  </div>
</div>
        
        ${task.description ? `
          <p class="text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
            ${task.description}
          </p>
        ` : ''}
        
        <div class="flex justify-between items-center pt-2 border-t border-purple-500/10">
          <div class="space-y-1">
            <p class="text-emerald-400 font-black text-lg">+${task.reward} TON</p>
            <p class="text-[10px] text-violet-400/70 uppercase font-bold">
              ⏱️ ${timeStr}
            </p>
          </div>
          <button 
            onclick="acceptTask('${task.id}', '${task.title.replace(/'/g, "\\'")}', ${duration})"
            class="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-black px-6 py-3 rounded-xl uppercase shadow-lg hover:shadow-violet-500/50 transition-all active:scale-95">
            Взять
          </button>
        </div>
      `;
      
      container.appendChild(el);
    });

  } catch (e) {
    console.error('❌ Load tasks error:', e);
    container.innerHTML = `
      <div class="glass p-6 rounded-2xl text-center text-rose-400">
        <p class="font-bold">Ошибка: ${e.message}</p>
      </div>
    `;
  }
}

/* =====================
   ACCEPT TASK
===================== */
window.acceptTask = async (taskId, title, duration) => {
  const player = window.player;
  
  if (!player || !player.tg_id) {
    window.showNotification('Ошибка: данные игрока не найдены', 'error');
    return;
  }

  try {
  // 🔒 Проверяем доступность задания
  const { data: task } = await supabase
    .from('tasks')
    .select('available_until')
    .eq('id', taskId)
    .single();

  if (
    task?.available_until &&
    new Date(task.available_until) < new Date()
  ) {
    window.showNotification(
      '⏳ Задание больше недоступно',
      'error'
    );
    return;
  }
    window.showLoader('Принимаем задание...');

    const deadline = new Date(Date.now() + duration * 60000).toISOString();

    const { data: inst, error } = await supabase
      .from('task_instances')
      .insert({
        task_id: taskId,
        player_tg_id: player.tg_id,
        player_name: player.id,
        deadline,
        status: 'active'
      })
      .select()
      .single();

    window.hideLoader();

    if (error) {
      console.error('Accept task error:', error);
      window.showNotification('Ошибка принятия задания', 'error');
      return;
    }

    sendTelegram(`🟣 *ПРИНЯТО*\n👤 ${player.id}\n🎯 ${title}`);

    activeInstance = inst;
    subscribe(inst.id);
    await renderActive(inst);
    
    window.showNotification('Задание принято!', 'success');

  } catch (e) {
    console.error('Accept task error:', e);
    window.hideLoader();
    window.showNotification('Ошибка: ' + e.message, 'error');
  }
};

/* =====================
   REALTIME SUBSCRIPTION
===================== */
function subscribe(id) {
  // Отписываемся от предыдущего канала
  unsubscribe();

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
        console.log('Task update:', payload.new);
        
        if (payload.new.status === 'approved') {
          window.showNotification('✅ Задание одобрено!', 'success');
          stopTimer();
          activeInstance = null;
          unsubscribe();
          loadTasks(window.player);
        } else if (payload.new.status === 'rejected') {
          window.showNotification('❌ Задание отклонено', 'error');
          stopTimer();
          activeInstance = null;
          unsubscribe();
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
   RENDER ACTIVE TASK
===================== */
async function renderActive(inst) {
  const activeZone = document.getElementById('active-zone');
  const tasksContainer = document.getElementById('tasks-container');

  if (!activeZone) return;

  // Получаем данные задания
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', inst.task_id)
    .single();

  if (!task) {
    console.error('Task not found');
    return;
  }

  // Показываем зону активного задания
  activeZone.classList.remove('hidden');
  
  document.getElementById('active-title').textContent = task.title;
  document.getElementById('active-desc').textContent = task.description || 'Выполните задание';
  document.getElementById('active-reward').textContent = `+${task.reward} TON`;

  if (inst.status === 'reported') {
    // Задание на проверке
    activeZone.innerHTML = `
      <div class="glass p-6 rounded-3xl text-center space-y-4 bg-gradient-to-br from-amber-900/20 to-transparent border-amber-500/30">
        <div class="text-5xl">⏳</div>
        <h3 class="text-xl font-black uppercase">На проверке</h3>
        <p class="text-sm text-slate-300">Ожидайте решения администратора</p>
        <div class="status-badge status-waiting mx-auto">
          <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          Проверяется
        </div>
      </div>
    `;
    tasksContainer.innerHTML = '';
  } else {
    // Задание активно
    startTimer(inst.deadline);
    tasksContainer.innerHTML = '';
  }
}

/* =====================
   SUBMIT MISSION
===================== */
window.submitMission = async () => {
  if (!activeInstance) {
    window.showNotification('Нет активного задания', 'error');
    return;
  }

  try {
    window.showLoader('Отправляем на проверку...');

    const { data: inst, error } = await supabase
      .from('task_instances')
      .update({
        status: 'reported',
        reported_at: new Date().toISOString()
      })
      .eq('id', activeInstance.id)
      .select()
      .single();

    window.hideLoader();

    if (error) {
      console.error('Submit error:', error);
      window.showNotification('Ошибка отправки', 'error');
      return;
    }

    const player = window.player;
    sendTelegram(`📩 *ВЫПОЛНЕНО*\n👤 ${player.id}\n🎯 Задание отправлено на проверку`);

    stopTimer();
    activeInstance = inst;
    await renderActive(inst);
    
    window.showNotification('Задание отправлено на проверку!', 'success');

  } catch (e) {
    console.error('Submit error:', e);
    window.hideLoader();
    window.showNotification('Ошибка: ' + e.message, 'error');
  }
};

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
  stopTimer();
  unsubscribe();
});



