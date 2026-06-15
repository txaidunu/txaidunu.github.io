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

    // Save order
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('orders').insert([{
      reference: 'TEST-' + Date.now(),
      customer_name: address?.name || 'Unknown',
      status: 'pending'
    }]);

    // === TELEGRAM TEST ===
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    let telegramStatus = "NOT SENT";

    if (token && chatId) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🧪 TEST ALERT\nOrder received at ${new Date().toLocaleTimeString()}\nName: ${address?.name || 'N/A'}`,
            parse_mode: 'HTML'
          })
        });
        const data = await response.json();
        telegramStatus = data.ok ? "✅ SENT SUCCESSFULLY" : "❌ API ERROR";
      } catch (e) {
        telegramStatus = "❌ FETCH FAILED";
      }
    } else {
      telegramStatus = "❌ Missing env variables";
    }

    return res.status(200).json({ 
      success: true, 
      message: "Order created",
      telegramStatus 
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
