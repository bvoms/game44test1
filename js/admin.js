import { sb } from './config.js';

window.tryLogin = () => {
  const l = auth-login.value;
  const p = auth-pass.value;

  if (l === 'game44' && p === 'thewanga') {
    sessionStorage.setItem('admin', '1');
    location.reload();
  }
};

window.createTask = async () => {
  const title = task-title.value;
  const reward = parseFloat(task-reward.value);

  await sb.from('tasks').insert({ title, reward });
  alert('Создано');
};
window.tryLogin = tryLogin;
