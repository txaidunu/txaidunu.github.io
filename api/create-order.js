// api/create-order.js
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
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packageType, paymentToken, address, price = 188 } = req.body || {};

    if (!packageType || !paymentToken || !address?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reference = 'MEL-' + Math.random().toString(36).substring(2, 15).toUpperCase();

    let payUrl = '';
    let displayAmount = '';

    if (paymentToken === 'SOL') {
      const SOL_PRICE = 155;
      const solAmount = (price / SOL_PRICE).toFixed(4);
      payUrl = `solana:${WALLET_ADDRESS}?amount=${solAmount}&reference=${reference}`;
      displayAmount = `${solAmount} SOL ($${price})`;
    } else if (paymentToken === 'USDC') {
      payUrl = `solana:${WALLET_ADDRESS}?amount=${price}&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=${reference}`;
      displayAmount = `$${price} USDC`;
    } else if (paymentToken === 'USDT') {
      payUrl = `solana:${WALLET_ADDRESS}?amount=${price}&spl-token=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB&reference=${reference}`;
      displayAmount = `$${price} USDT`;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.from('orders').insert({
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

    await sendTelegram(`🛒 New Order ${reference} - ${displayAmount}`);

    res.status(200).json({
      reference,
      displayAmount,
      payUrl
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
