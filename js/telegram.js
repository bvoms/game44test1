import { TG_BOT_TOKEN, TG_CHAT_ID } from './config.js';

export async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.warn('TG send error:', e);
  }
}
