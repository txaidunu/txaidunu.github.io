<script>
  let selectedPackage = null;
  let selectedToken = null;
  const WALLET_ADDRESS = 'H115kTVj5QsT58w6Xg9hviyoALWqVZ1DLTvhVDeQ66w4';

  function selectPackage(btn) {
    selectedPackage = 'one';
    document.querySelectorAll('.package').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById("form").style.display = "block";
  }

  function selectToken(token, btn) {
    selectedToken = token;
    document.querySelectorAll('.token-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  function showDisclaimerModal() {
    const debug = document.getElementById("debug");
    debug.innerText = "";

    if (!selectedPackage) return debug.innerText = "Please select a package.";
    if (!selectedToken) return debug.innerText = "Please select a payment token.";

    document.getElementById("disclaimerModal").style.display = "flex";
  }

  function acceptDisclaimer() {
    document.getElementById("disclaimerModal").style.display = "none";
    createOrder();
  }

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

      debug.innerText = "Order created!";

      // Simple, clear payment instructions
      document.getElementById("amount").innerHTML = `
        <strong>Send $${188} ${selectedToken}</strong><br><br>
        To: <code style="word-break:break-all;">${WALLET_ADDRESS}</code><br><br>
        Reference: <strong>${data.reference}</strong>
      `;

      document.getElementById("paylink").href = "#";
      document.getElementById("paylink").innerText = "Copy Wallet Address";
      document.getElementById("paylink").onclick = () => {
        navigator.clipboard.writeText(WALLET_ADDRESS);
        alert("Wallet address copied!");
      };

      document.getElementById("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(WALLET_ADDRESS);
      document.getElementById("payment").style.display = "block";

      checkPayment(data.reference);
    } catch (err) {
      debug.innerText = "Checkout error: " + err.message;
    }
  }

  function checkPayment(ref) {
    // Keep your existing checkPayment function
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch(`/api/check-payment?reference=${encodeURIComponent(ref)}`);
        const d = await r.json();
        if (d.paid) {
          document.getElementById("status").innerHTML = "✅ <strong>Payment confirmed!</strong><br>We'll ship your order soon.";
          clearInterval(interval);
        } else {
          document.getElementById("status").innerText = `Waiting for payment... (${attempts})`;
        }
      } catch (e) {
        document.getElementById("status").innerText = "Checking network...";
      }
    }, 10000);
  }
</script>
