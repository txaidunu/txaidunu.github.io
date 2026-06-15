// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log("🔧 Telegram Config Check:", {
  hasToken: !!TELEGRAM_BOT_TOKEN,
  hasChatId: !!TELEGRAM_CHAT_ID,
  chatId: TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID.substring(0,4) + "..." : null
});

const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';

const PRICES = { one: 1 };

async function getSolPrice() {
  try {
    const res = await fetch('https://price.jup.ag/v6/price?ids=SOL');
    const data = await res.json();
    return data.data.SOL.price;
  } catch {
    return 145;
  }
}

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ Telegram credentials missing in Vercel");
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    console.log("📨 Telegram API Response:", data);
  } catch (err) {
    console.error("❌ Telegram send failed:", err.message);
  }
}

module.exports = async function handler(req, res) {
  // ... (CORS and validation same as before)

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packageType = 'one', paymentToken = 'SOL', address } = req.body;

    const usdAmount = PRICES[packageType];
    const reference = 'MM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const solPrice = await getSolPrice();
    const tokenAmount = (usdAmount / solPrice).toFixed(6);
    const displayAmount = `${tokenAmount} SOL ($${usdAmount} test)`;

    const payUrl = `solana:\( {WALLET_ADDRESS}?amount= \){tokenAmount}&label=Melatonin%20M%C3%A9lange&memo=${encodeURIComponent(reference)}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('orders').insert([{ ... }]);   // your insert code

    const message = `🛎️ <b>NEW TEST ORDER</b>\nAmount: ${displayAmount}\nName: ${address.name}\nOrder ID: ${reference}`;

    await sendTelegram(message);

    return res.status(200).json({ success: true, reference, displayAmount, payUrl });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
