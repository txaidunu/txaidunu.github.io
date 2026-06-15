// api/create-order.js - MINIMAL TEST VERSION
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Hardcoded Telegram - should always work
    const token = "8405157983:AAEUGnnvnrPMNq6pnfvmIFpXfyxgwGvqY_M";
    const chatId = "1519466250";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🛎️ TEST NOTIFICATION\nOrder placed at ${new Date().toLocaleTimeString()}\nThis should appear!`,
        parse_mode: 'HTML'
      })
    });

    return res.status(200).json({ success: true, message: "Order created" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
