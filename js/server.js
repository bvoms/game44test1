import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

async function sendMessage(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML'
    })
  });
}

// ===== игрок взял задание =====
app.post('/tg/task/accept', async (req, res) => {
  const { player, title } = req.body;
  await sendMessage(`🚀 <b>${player}</b> взял задание:\n${title}`);
  res.sendStatus(200);
});

// ===== игрок отправил на проверку =====
app.post('/tg/task/report', async (req, res) => {
  const { player, title } = req.body;
  await sendMessage(`📩 <b>${player}</b> выполнил задание:\n${title}`);
  res.sendStatus(200);
});

// ===== админ принял / отклонил =====
app.post('/tg/task/resolve', async (req, res) => {
  const { player, title, ok, reward } = req.body;

  if (ok) {
    await sendMessage(`✅ <b>${player}</b> справился с заданием:\n${title}\n+${reward}`);
  } else {
    await sendMessage(`❌ <b>${player}</b> не справился с заданием:\n${title}`);
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log('TG SERVER OK'));
