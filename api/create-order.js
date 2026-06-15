// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.body;

    // Hardcoded Telegram for testing
    const TELEGRAM_BOT_TOKEN = "8405157983:AAEUGnnvnrPMNq6pnfvmIFpXfyxgwGvqY_M";
    const TELEGRAM_CHAT_ID = "1519466250";

    // Send Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: `🛎️ NEW ORDER TEST\n\nName: ${address?.name || 'Unknown'}\nTime: ${new Date().toLocaleTimeString()}\nThis is a hardcoded test.`,
        parse_mode: 'HTML'
      })
    });

    return res.status(200).json({ success: true, message: "Order created successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
