// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.body;

    // Save to Supabase (basic)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from('orders').insert([{
      reference: 'TEST-' + Date.now(),
      customer_name: address?.name || 'Test User',
      status: 'pending'
    }]);

    // Simple Telegram Test
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🧪 TEST MESSAGE\nNew order received at ${new Date().toLocaleTimeString()}`,
          parse_mode: 'HTML'
        })
      });
    }

    return res.status(200).json({ success: true, message: "Test order created" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
