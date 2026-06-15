// api/create-order.js
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.body;

    // Send Telegram (hard test)
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🛎️ ORDER CREATED SUCCESSFULLY\n\nName: ${address?.name || 'Unknown'}\nTime: ${new Date().toLocaleTimeString()}`,
          parse_mode: 'HTML'
        })
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Order created successfully" 
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
