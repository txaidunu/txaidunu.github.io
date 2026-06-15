// api/create-order.js
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.body || {};

    // Hardcoded Telegram Test (bypassing env variables for now)
    const token = "8405157983:AAEUGnnvnrPMNq6pnfvmIFpXfyxgwGvqY_M";
    const chatId = "1519466250";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🛎️ NEW ORDER RECEIVED!\n\n👤 Name: ${address?.name || 'Unknown'}\nTime: ${new Date().toLocaleTimeString()}\nThis is a direct test from create-order.js`,
        parse_mode: 'HTML'
      })
    });

    return res.status(200).json({ 
      success: true, 
      message: "Order created successfully" 
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
