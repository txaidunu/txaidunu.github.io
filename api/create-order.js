async function createOrder() {
  const debug = document.getElementById("debug");
  debug.innerText = "";

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const zip = document.getElementById("zip").value.trim();

  if (!name || !address || !city || !state || !zip) {
    return debug.innerText = "Please fill all shipping fields.";
  }

  try {
    debug.innerText = "Creating order...";
    
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageType: selectedPackage,
        paymentToken: selectedToken,
        address: { name, address, city, state, zip },
        price: 188
      })
    });

    const data = await res.json();

    if (!res.ok) {
      debug.innerText = "Order error: " + (data.error || JSON.stringify(data));
      return;
    }

    debug.innerText = "Order created successfully!";

    // Show clear instructions instead of relying only on solana: link
    document.getElementById("amount").innerHTML = `
      Send <strong>${data.displayAmount}</strong><br>
      to wallet: <code>${WALLET_ADDRESS}</code><br><br>
      <small>Reference: ${data.reference}</small>
    `;

    document.getElementById("paylink").href = data.payUrl;
    document.getElementById("paylink").innerText = "Open in Phantom Wallet";
    document.getElementById("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(data.payUrl);
    document.getElementById("payment").style.display = "block";

    checkPayment(data.reference);
  } catch (err) {
    debug.innerText = "Checkout error: " + err.message;
  }
}
