# 🚀 After Wallet Connection - Quick Start Guide

## ✅ You've Connected Your Wallet! What's Next?

Great job connecting your Sui wallet! Now you can make crypto payments and get virtual cards.

---

## 📍 **Where You Are Now**

You're on the Payzee dashboard at **http://localhost:3001** with your wallet connected.

You should see:
- ✓ Your wallet name (e.g., "Sui Wallet")
- ✓ Your wallet address (truncated, like `0x1234...5678`)
- ✓ An "Amount (USD)" input field
- ✓ A "Pay with USDC" button

---

## ⚡ **What You Need to Do Next**

### **IMPORTANT: Start the Backend Server First!**

The dashboard cannot process payments without the backend API running.

#### **Option 1: If Python is Already Installed**

Open a **new terminal** and run:

```powershell
cd "c:\temp\payzee\payzee\backend"

# Check if venv folder exists and has Python
# If yes, run:
venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000

# If the above doesn't work, try:
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000
```

**You'll know it's working when you see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

#### **Option 2: If Python is NOT Installed**

1. **Install Python 3.10 or higher:**
   - Download from: https://www.python.org/downloads/
   - ⚠️ **IMPORTANT:** Check "Add Python to PATH" during installation

2. **Restart your terminal** (close and reopen)

3. **Then run:**
   ```powershell
   cd "c:\temp\payzee\payzee\backend"
   python -m venv venv
   venv\Scripts\python.exe -m pip install -r requirements.txt
   venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000
   ```

#### **Verify Backend is Running:**

Open this URL in your browser: *


You should see the FastAPI Swagger documentation page.

---

## 💰 **Step 2: Get Testnet USDC**

You need USDC tokens in your wallet to make payments.

### **How to Get Testnet USDC:**

**Option A: Sui Discord Faucet (Most Reliable)**
1. Join Sui Discord: https://discord.gg/sui
2. Go to `#testnet-faucet` channel
3. Type: `!faucet <YOUR_WALLET_ADDRESS>`
4. You'll receive testnet SUI
5. Find a USDC faucet or DEX to convert SUI → USDC

**Option B: Direct USDC Faucet**
1. Search for "Sui testnet USDC faucet"
2. Enter your wallet address
3. Request testnet USDC

**Check Your Balance:**
1. Go to: https://suiexplorer.com/
2. Paste your wallet address
3. Set network to "Testnet"
4. Look for USDC balance

---

## 🎯 **Step 3: Make Your First Payment**

Once you have:
- ✅ Backend running on port 8000
- ✅ USDC in your wallet
- ✅ Wallet connected

**Do this:**

1. **On the dashboard (http://localhost:3001):**
   - Enter an amount, e.g., `5.50` (in USD)
   - Click **"Pay with USDC"**

2. **Your wallet will pop up:**
   - Review the transaction details
   - Make sure you have enough USDC (amount) + SUI (gas fee)
   - Click **"Approve"** or **"Sign"**

3. **Wait for the transaction:**
   - You'll see "Building transaction..."
   - Then "Requesting signature..."
   - Then "Creating virtual card..."

4. **Virtual card created! 🎉**
   - You'll see:
     - Card Number: •••• XXXX
     - Expiration: MM/YYYY
     - Amount: $XX.XX
   
   The full card details are available in the response!

---

## 🛍️ **Step 4: Use Your Virtual Card**

You can now use this card at **any online checkout**:

1. Go to any e-commerce website
2. Add items to cart
3. Proceed to checkout
4. Enter the virtual card details:
   - **Card Number:** (the 16-digit number from dashboard)
   - **CVV:** (from dashboard)
   - **Expiration Date:** (from dashboard)
   - **Name:** Use "Payzee User" or any name

5. Complete the purchase!

**Note:** Since you're using Lithic's sandbox environment, the cards work at test checkouts but may not work on all production sites.

---

## 🌐 **Alternative: Use the Browser Extension**

For a more seamless experience:

### **Install the Extension:**

1. Open Chrome/Edge
2. Go to `chrome://extensions/` or `edge://extensions/`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select folder: `c:\temp\payzee\payzee\extension`

### **How It Works:**

1. Browse to any online store (e.g., Amazon)
2. Add items to cart → Go to checkout
3. The extension **automatically detects** the checkout page
4. Shows a **"Pay with Crypto"** button
5. Clicking it opens the dashboard with pre-filled amount
6. Follow the payment flow
7. Extension **auto-fills** the card details on the checkout page
8. You just click "Complete Order"!

---

## 🔍 **Troubleshooting**

### **"Failed to initiate payment"**
- ❌ Backend is not running
- ✅ Start the backend (see Step 1 above)

### **"No USDC coins found in wallet"**
- ❌ You don't have USDC in your wallet
- ✅ Get testnet USDC (see Step 2 above)

### **"Insufficient USDC balance"**
- ❌ You don't have enough USDC for the amount you entered
- ✅ Lower the amount or get more USDC

### **Transaction stuck/pending**
- Check on Sui Explorer: https://suiexplorer.com/
- Make sure you have SUI for gas fees
- Try refreshing and starting over

### **Nothing happens when clicking "Pay with USDC"**
- Open browser console (F12) and check for errors
- Make sure backend is running on port 8000
- Verify your wallet is still connected

---

## 📊 **System Status Checklist**

Before making a payment, verify:

| Component | Status | How to Check |
|-----------|--------|--------------|
| Frontend | ✅ Running | http://localhost:3001 loads |
| Backend | ❓ Check | http://localhost:8000/docs loads |
| Wallet | ✅ Connected | Shows wallet address on dashboard |
| USDC | ❓ Check | View on https://suiexplorer.com |
| SUI (gas) | ❓ Check | View on https://suiexplorer.com |

---

## 🎓 **Understanding the Payment Flow**

Here's what happens when you click "Pay with USDC":

```
1. Dashboard → Backend: "Create payment session for $X.XX"
   └─> Backend generates session_id

2. Dashboard → Sui Blockchain: "Deposit X USDC into escrow"
   └─> Your wallet signs the transaction
   └─> USDC locked in smart contract (address: 0xd0d84d39...3dbf69)

3. Dashboard → Backend: "Transaction confirmed, create card"
   └─> Backend verifies blockchain transaction
   └─> Backend → Lithic API: "Create virtual card for $X.XX"
   └─> Lithic creates real Mastercard/Visa card

4. Backend → Dashboard: "Here's your card: PAN, CVV, Expiry"
   └─> You see card details on screen
```

**Your crypto is safe in escrow until the card transaction settles!**

---

## 🎉 **You're All Set!**

Next steps:
1. ✅ Start the backend server
2. ✅ Get some testnet USDC
3. ✅ Make your first crypto → card payment!

**Need more help?** Check:
- Full usage guide: `USAGE_GUIDE.md`
- Backend API docs: http://localhost:8000/docs (when running)
- Sui Explorer: https://suiexplorer.com

**Happy crypto shopping! 🚀**
