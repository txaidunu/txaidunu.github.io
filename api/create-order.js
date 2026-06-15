// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';

const PRICES = {
  one: 188   // Change back to real price when ready
};

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
  } catch (err) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packageType = 'one', paymentToken = 'SOL', address } = req.body;

    const usdAmount = PRICES[packageType];
    const reference = 'MM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const solPrice = await getSolPrice();
    const tokenAmount = (usdAmount / solPrice).toFixed(6);
    const displayAmount = `${tokenAmount} SOL (~$${usdAmount})`;

    const payUrl = `solana:${WALLET_ADDRESS}?amount=${tokenAmount}&label=Melatonin%20M%C3%A9lange&memo=${encodeURIComponent(reference)}`;

    // Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('orders').insert([{
      reference,
      package_type: 'founders-batch-28',
      usd_amount: usdAmount,
      token_amount: tokenAmount,
      payment_token: paymentToken,
      customer_name: address.name,
      street: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      status: 'pending'
    }]);

    // Full Detailed Telegram Message
    const message = 
      `🛎️ <b>NEW ORDER RECEIVED!</b>\n\n` +
      `📦 <b>Package:</b> Founder's Batch (28 servings)\n` +
      `💰 <b>Amount:</b> ${displayAmount}\n\n` +
      `👤 <b>Name:</b> ${address.name}\n` +
      `📍 <b>Street:</b> ${address.address}\n` +
      `🏙️ <b>City:</b> ${address.city}\n` +
      `📍 <b>State/ZIP:</b> ${address.state} ${address.zip}\n\n` +
      `🔑 <b>Order ID:</b> <code>${reference}</code>\n` +
      `⏳ <b>Status:</b> Waiting for payment`;

    await sendTelegram(message);

    return res.status(200).json({
      success: true,
      reference,
      displayAmount,
      payUrl
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
