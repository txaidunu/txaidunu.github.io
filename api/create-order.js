\// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Telegram error:', err);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packageType, paymentToken, address, price = 188 } = req.body || {};

    if (!packageType || !paymentToken || !address || !address.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reference = 'MEL-' + Math.random().toString(36).substring(2, 15).toUpperCase();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('orders')
      .insert({
        reference,
        package_type: packageType,
        payment_token: paymentToken,
        token_amount: price,
        customer_name: address.name,
        street: address.address,
        city: address.city,
        state: address.state,
        zip: address.zip,
        status: 'pending'
      });

    if (error) throw error;

    await sendTelegram(
      `🛒 <b>New Order Received!</b>\n\n` +
      `🔑 Reference: <code>${reference}</code>\n` +
      `📦 Package: ${packageType}\n` +
      `💰 $${price}\n` +
      `👤 ${address.name}`
    );

    const payUrl = `solana:${WALLET_ADDRESS}?amount=${price}&reference=${reference}`;

    res.status(200).json({
      reference,
      displayAmount: `$${price}`,
      payUrl
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ 
      error: err.message || 'Internal server error',
      details: err.toString()
    });
  }
};
