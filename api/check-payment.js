// api/check-payment.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Telegram credentials missing");
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
    if (!data.ok) console.error('Telegram error:', data);
  } catch (err) {
    console.error('Telegram send failed:', err);
  }
}

async function checkSolanaPayment(reference) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [WALLET_ADDRESS, { limit: 20 }]
      })
    });
    const data = await response.json();
    const signatures = data.result || [];

    for (const sig of signatures) {
      if (sig.memo && sig.memo.includes(reference)) {
        return { paid: true, signature: sig.signature };
      }
    }
    return { paid: false };
  } catch (err) {
    console.error('Solana RPC error:', err);
    return { paid: false };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check existing order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (existingOrder && existingOrder.status === 'paid') {
      return res.status(200).json({ paid: true, alreadyConfirmed: true });
    }

    // Check blockchain
    const payment = await checkSolanaPayment(reference);

    if (payment.paid) {
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          tx_signature: payment.signature
        })
        .eq('reference', reference);

      // Send Telegram notification
      if (existingOrder) {
        const packageLabel = existingOrder.package_type === 'one' ? '1 Lunar Cycle — $100' : '2 Lunar Cycles — $200';
        const tokenInfo = `${existingOrder.token_amount} ${existingOrder.payment_token}`;

        const message = 
          `🚀 <b>NEW PAID ORDER!</b>\n\n` +
          `📦 <b>Package:</b> ${packageLabel}\n` +
          `💰 <b>Paid:</b> ${tokenInfo}\n` +
          `👤 <b>Name:</b> ${existingOrder.customer_name}\n` +
          `📍 <b>Address:</b> ${existingOrder.street}, ${existingOrder.city}, ${existingOrder.state} ${existingOrder.zip}\n` +
          `🔑 <b>Order ID:</b> ${reference}\n` +
          `✅ <b>Payment confirmed on Solana!</b>`;

        await sendTelegram(message);
      }

      return res.status(200).json({ paid: true, signature: payment.signature });
    }

    return res.status(200).json({ paid: false });

  } catch (err) {
    console.error('Check payment error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
