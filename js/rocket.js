import { supabase } from './config.js';

let rocketChannel = null;

export async function initRocket() {
  console.log('🚀 Rocket frontend init');

  // 1️⃣ первичная загрузка состояния
  const { data, error } = await supabase
    .from('rocket_state')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('❌ Rocket load error:', error);
    return;
  }

  if (data) {
    updateRocketUI(data);
  }

  // 2️⃣ realtime подписка
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
        updateRocketUI(payload.new);
      }
    )
    .subscribe();
}

function updateRocketUI(state) {
  const multiplierEl = document.getElementById('rocket-multiplier');
  const statusEl = document.getElementById('rocket-status-text');

  if (!multiplierEl || !statusEl) return;

  multiplierEl.innerText = `${Number(state.multiplier).toFixed(2)}x`;

  switch (state.status) {
    case 'waiting':
      statusEl.innerText = 'ОЖИДАНИЕ';
      statusEl.className = 'text-violet-400';
      break;

    case 'flying':
      statusEl.innerText = 'ПОЛЁТ';
      statusEl.className = 'text-emerald-400';
      break;

    case 'crashed':
      statusEl.innerText = 'CRASH';
      statusEl.className = 'text-rose-500';
      break;
  }
}
