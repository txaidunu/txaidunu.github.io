module.exports = async function handler(req, res) {
  // IMPORTANT: Allow CORS and POST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packageType, paymentToken, address, price } = req.body;

    if (!packageType || !paymentToken || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reference = 'MEL-' + Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        reference,
        package_type: packageType,
        payment_token: paymentToken,
        token_amount: price || 188,
        customer_name: address.name,
        street: address.address,
        city: address.city,
        state: address.state,
        zip: address.zip,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Generate Solana pay URL (adjust this to match your Phantom flow)
    const payUrl = `solana:${WALLET_ADDRESS}?amount=${price || 188}&reference=${reference}`;

    await sendTelegram(`🛒 New Order!\nReference: ${reference}\nPackage: ${packageType}\nAmount: $${price || 188}`);

    res.status(200).json({
      success: true,
      reference,
      displayAmount: `$${price || 188} SOL`,
      payUrl
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
};
