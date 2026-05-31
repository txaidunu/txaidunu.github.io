// api/create-order.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables");
}

const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';

const TOKEN_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
};

const PRICES = {
  one: 100,
  two: 200
};

function generateReference() {
  return 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

async function getSolPrice() {
  try {
    const res = await fetch('https://price.jup.ag/v6/price?ids=SOL');
    const data = await res.json();
    return data.data.SOL.price;
  } catch (err) {
    console.error('Jupiter price error:', err);
    return 150; // fallback price
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packageType, paymentToken, address } = req.body;

    if (!packageType || !PRICES[packageType]) {
      return res.status(400).json({ error: 'Invalid package type' });
    }
    if (!['SOL', 'USDC', 'USDT'].includes(paymentToken)) {
      return res.status(400).json({ error: 'Invalid payment token' });
    }
    if (!address || !address.name || !address.address || !address.city || !address.state || !address.zip) {
      return res.status(400).json({ error: 'Missing shipping info' });
    }

    const usdAmount = PRICES[packageType];
    const reference = generateReference();

    let tokenAmount;
    let displayAmount;

    if (paymentToken === 'USDC' || paymentToken === 'USDT') {
      tokenAmount = usdAmount.toString();
      displayAmount = `${usdAmount} ${paymentToken}`;
    } else {
      const solPrice = await getSolPrice();
      const solAmount = (usdAmount / solPrice).toFixed(4);
      tokenAmount = solAmount;
      displayAmount = `${solAmount} SOL (~$${usdAmount} USD)`;
    }

    // Build Solana Pay URL
    let payUrl;
    if (paymentToken === 'SOL') {
      payUrl = `solana:${WALLET_ADDRESS}?amount=${tokenAmount}&label=Melatonin%20Melange&memo=${encodeURIComponent(reference)}`;
    } else {
      const mint = TOKEN_MINTS[paymentToken];
      payUrl = `solana:${WALLET_ADDRESS}?spl-token=${mint}&amount=${tokenAmount}&label=Melatonin%20Melange&memo=${encodeURIComponent(reference)}`;
    }

    // Save to Supabase using Service Role Key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: supabaseError } = await supabase
      .from('orders')
      .insert([{
        reference,
        package_type: packageType,
        usd_amount: usdAmount,
        token_amount: tokenAmount,
        payment_token: paymentToken,
        customer_name: address.name,
        street: address.address,
        city: address.city,
        state: address.state,
        zip: address.zip,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return res.status(500).json({ error: 'Failed to save order: ' + supabaseError.message });
    }

    return res.status(200).json({
      success: true,
      reference,
      orderId: reference,
      displayAmount,
      payUrl
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
