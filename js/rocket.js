// rocket.js - Улучшенная версия с визуалом

import { supabase } from './config.js';

let rocketChannel = null;
let currentMultiplier = 1.00;
let isFlying = false;
let animationFrame = null;

export async function initRocket() {
  console.log('🚀 Rocket frontend init');

  try {
    // 1️⃣ Первичная загрузка состояния
    const { data, error } = await supabase
      .from('rocket_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('❌ Rocket load error:', error);
      
      // Показываем placeholder если таблица не существует
      const rocketView = document.getElementById('view-rocket');
      if (rocketView) {
        const placeholder = document.createElement('div');
        placeholder.className = 'glass p-8 rounded-3xl text-center space-y-4';
        placeholder.innerHTML = `
          <div class="text-5xl">🚧</div>
          <h3 class="text-xl font-black">Rocket игра</h3>
          <p class="text-sm text-slate-400">Скоро запустится!</p>
        `;
        rocketView.querySelector('.glass')?.replaceWith(placeholder);
      }
      return;
    }

    if (data) {
      updateRocketUI(data);
    } else {
      // Создаём начальное состояние если его нет
      const { error: insertError } = await supabase
        .from('rocket_state')
        .insert({
          id: 1,
          status: 'waiting',
          multiplier: 1.00
        });
      
      if (insertError) {
        console.error('Error creating initial state:', insertError);
      }
    }

    // 2️⃣ Realtime подписка
    subscribeToRocket();

    // 3️⃣ Загружаем историю
    loadRocketHistory();

  } catch (e) {
    console.error('Rocket init error:', e);
  }
}

// Подписка на изменения
function subscribeToRocket() {
  // Отписываемся от предыдущего канала
  if (rocketChannel) {
    supabase.removeChannel(rocketChannel);
  }

  rocketChannel = supabase
    .channel('rocket_state_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rocket_state'
      },
      payload => {
        console.log('Rocket update:', payload.new);
        updateRocketUI(payload.new);
      }
    )
    .subscribe();

  console.log('✅ Subscribed to rocket updates');
}

// Обновление UI
function updateRocketUI(state) {
  if (!state) return;

  const multiplierEl = document.getElementById('rocket-multiplier');
  const statusEl = document.getElementById('rocket-status-text');
  const mainBtn = document.getElementById('rocket-main-btn');
  const potentialEl = document.getElementById('rocket-potential');
  const rocketContainer = document.getElementById('rocket-container');

  currentMultiplier = Number(state.multiplier || 1.00);

  // Обновляем множитель
  if (multiplierEl) {
    multiplierEl.textContent = `${currentMultiplier.toFixed(2)}x`;
  }

  // Обновляем статус и анимацию
  switch (state.status) {
    case 'waiting':
      if (statusEl) {
        statusEl.textContent = 'ОЖИДАНИЕ';
        statusEl.className = 'absolute top-16 text-xs font-black uppercase tracking-[0.3em] text-violet-400';
      }
      
      if (mainBtn) {
        mainBtn.textContent = 'ВЗЛЁТ';
        mainBtn.className = 'w-full bg-violet-600 p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-violet-500';
        mainBtn.disabled = false;
      }
      
      if (rocketContainer) {
        rocketContainer.classList.remove('animate-rocket', 'rocket-launch', 'rocket-crash');
      }
      
      if (potentialEl) {
        potentialEl.classList.add('hidden');
      }
      
      isFlying = false;
      stopMultiplierAnimation();
      break;

    case 'flying':
      if (statusEl) {
        statusEl.textContent = 'ПОЛЁТ';
        statusEl.className = 'absolute top-16 text-xs font-black uppercase tracking-[0.3em] text-emerald-400';
      }
      
      if (mainBtn) {
        mainBtn.textContent = 'ЗАБРАТЬ';
        mainBtn.className = 'w-full bg-emerald-600 p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-emerald-500';
        mainBtn.disabled = false;
      }
      
      if (rocketContainer) {
        rocketContainer.classList.add('animate-rocket');
        rocketContainer.classList.remove('rocket-launch', 'rocket-crash');
      }
      
      if (potentialEl) {
        updatePotentialProfit();
        potentialEl.classList.remove('hidden');
      }
      
      isFlying = true;
      startMultiplierAnimation();
      break;

    case 'crashed':
      if (statusEl) {
        statusEl.textContent = 'CRASH';
        statusEl.className = 'absolute top-16 text-xs font-black uppercase tracking-[0.3em] text-rose-500';
      }
      
      if (mainBtn) {
        mainBtn.textContent = 'CRASHED';
        mainBtn.className = 'w-full bg-rose-600 p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl opacity-50';
        mainBtn.disabled = true;
      }
      
      if (rocketContainer) {
        rocketContainer.classList.remove('animate-rocket');
        rocketContainer.classList.add('rocket-crash');
        
        // Возвращаем на место через 1 секунду
        setTimeout(() => {
          rocketContainer.classList.remove('rocket-crash');
        }, 1000);
      }
      
      if (potentialEl) {
        potentialEl.classList.add('hidden');
      }
      
      isFlying = false;
      stopMultiplierAnimation();
      
      // Показываем уведомление
      if (window.showNotification) {
        window.showNotification(`💥 Crash на ${currentMultiplier.toFixed(2)}x`, 'error');
      }
      
      // Автоматически возвращаемся в waiting через 3 секунды
      setTimeout(async () => {
        await resetRocket();
      }, 3000);
      break;
  }
}

// Анимация роста множителя
function startMultiplierAnimation() {
  stopMultiplierAnimation();
  
  animationFrame = setInterval(() => {
    if (isFlying) {
      // Небольшая случайная вариация для реалистичности
      const variation = (Math.random() - 0.5) * 0.05;
      currentMultiplier += 0.01 + variation;
      
      const multiplierEl = document.getElementById('rocket-multiplier');
      if (multiplierEl) {
        multiplierEl.textContent = `${currentMultiplier.toFixed(2)}x`;
        
        // Меняем цвет в зависимости от множителя
        if (currentMultiplier < 2) {
          multiplierEl.className = 'absolute top-0 text-5xl font-black italic tracking-tighter text-white';
        } else if (currentMultiplier < 5) {
          multiplierEl.className = 'absolute top-0 text-5xl font-black italic tracking-tighter text-emerald-400';
        } else {
          multiplierEl.className = 'absolute top-0 text-5xl font-black italic tracking-tighter text-amber-400';
        }
      }
      
      updatePotentialProfit();
    }
  }, 100);
}

function stopMultiplierAnimation() {
  if (animationFrame) {
    clearInterval(animationFrame);
    animationFrame = null;
  }
}

// Обновление потенциальной прибыли
function updatePotentialProfit() {
  const betInput = document.getElementById('bet-amount');
  const potentialEl = document.getElementById('rocket-potential');
  
  if (!betInput || !potentialEl) return;
  
  const bet = parseFloat(betInput.value || 0);
  if (bet > 0) {
    const profit = (bet * currentMultiplier) - bet;
    potentialEl.textContent = `Прибыль: +${profit.toFixed(2)} TON`;
  }
}

// Загрузка истории
async function loadRocketHistory() {
  const historyContainer = document.getElementById('rocket-history');
  if (!historyContainer) return;

  try {
    const { data: history, error } = await supabase
      .from('rocket_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('History load error:', error);
      return;
    }

    historyContainer.innerHTML = '';

    if (!history || history.length === 0) {
      historyContainer.innerHTML = `
        <div class="text-xs text-slate-500 text-center px-4">
          История игр появится здесь
        </div>
      `;
      return;
    }

    history.forEach(record => {
      const mult = Number(record.multiplier || 1.00);
      const colorClass = mult < 2 ? 'text-slate-400' : mult < 5 ? 'text-emerald-400' : 'text-amber-400';
      
      const el = document.createElement('div');
      el.className = `flex-shrink-0 px-4 py-2 rounded-xl bg-black/40 border border-white/10 ${colorClass} font-black text-sm`;
      el.textContent = `${mult.toFixed(2)}x`;
      
      historyContainer.appendChild(el);
    });

  } catch (e) {
    console.error('Load history error:', e);
  }
}

// Сброс ракеты в waiting
async function resetRocket() {
  try {
    const { error } = await supabase
      .from('rocket_state')
      .update({
        status: 'waiting',
        multiplier: 1.00
      })
      .eq('id', 1);

    if (error) {
      console.error('Reset error:', error);
    }
  } catch (e) {
    console.error('Reset rocket error:', e);
  }
}

// Загрузка ставок игроков (placeholder)
async function loadLiveBets() {
  const container = document.getElementById('live-bets');
  if (!container) return;

  container.innerHTML = `
    <div class="glass p-4 rounded-2xl text-center text-sm text-slate-400">
      Ставки игроков появятся во время игры
    </div>
  `;
}

// Вызываем при инициализации
setTimeout(loadLiveBets, 1000);

// Очистка при выгрузке
window.addEventListener('beforeunload', () => {
  stopMultiplierAnimation();
  if (rocketChannel) {
    supabase.removeChannel(rocketChannel);
  }
});

console.log('✅ Rocket.js loaded');
