# Payzee Usage Guide

## 🎯 What Happens After Connecting Your Wallet

Congratulations on connecting your wallet! Here's the complete workflow for using Payzee to make crypto payments.

---

## 📋 Prerequisites Checklist

Before making a payment, ensure you have:

- [x] **Sui Wallet Connected** - You've already done this!
- [ ] **USDC on Sui Testnet** - You need testnet USDC in your wallet
- [ ] **Backend Server Running** - The FastAPI backend must be running on port 8000
- [ ] **Dashboard Running** - Frontend should be running on port 3001
- [ ] **Browser Extension Installed** (Optional but recommended for auto-checkout)

---

## 🚀 Step-by-Step Payment Flow

### **Option 1: Manual Payment (Direct Dashboard)**

#### Step 1: Get Testnet USDC
If you don't have USDC yet, you need to get some testnet USDC:

1. Visit the Sui Testnet Faucet: https://discord.gg/sui
2. Join the Discord and go to #testnet-faucet channel
3. Request testnet SUI tokens first
4. Then you'll need to convert SUI to USDC or use a USDC faucet

**Alternative - Use the Sui Testnet Web Wallet:**
- Visit https://suiexplorer.com/
- Get testnet tokens
- Bridge or swap to USDC

#### Step 2: Enter Payment Amount
1. On the dashboard (http://localhost:3001)
2. You should now see a payment form showing:
   - Your connected wallet address (truncated)
   - An "Amount (USD)" input field
   - A "Pay with USDC" button

3. **Enter the amount** you want to pay in USD (e.g., `10.50`)

#### Step 3: Initiate Payment
1. Click the **"Pay with USDC"** button
2. The system will:
   - Create a payment session with the backend
   - Calculate how much USDC is needed (amount × 1,000,000 since USDC has 6 decimals)
   - Check if you have enough USDC in your wallet
   - Build a Sui transaction to deposit funds into the escrow contract

#### Step 4: Sign the Transaction
1. Your wallet will pop up asking you to approve the transaction
2. Review the transaction details:
   - **Function:** `escrow::deposit`
   - **Amount:** Your USDC amount
   - **Gas:** Small amount of SUI for transaction fees

3. Click **"Approve"** or **"Sign"** in your wallet

#### Step 5: Virtual Card Created
Once the transaction is confirmed:

1. The backend will:
   - Verify your escrow deposit on the Sui blockchain
   - Create a virtual card via Lithic API
   - Return the card details to the dashboard

2. You'll see a **"✅ Virtual Card Created"** message with:
   - **Card Number:** •••• XXXX (last 4 digits)
   - **Expiration:** MM/YYYY
   - **Amount:** $XX.XX

3. The full card details (PAN, CVV, expiration) are available for use

#### Step 6: Use the Virtual Card
You can now use this virtual card at any online checkout that accepts Mastercard/Visa!

**The card details will be:**
- Full 16-digit card number
- CVV code  
- Expiration date
- Cardholder name (if required, use "Payzee User")

---

### **Option 2: Automated Payment (Browser Extension)**

This is the more seamless approach once you have the extension installed.

#### Step 1: Install the Browser Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the folder: `c:\temp\payzee\payzee\extension`

#### Step 2: Browse to Any E-commerce Site
1. Go to any online store (e.g., Amazon, Shopify store, etc.)
2. Add items to cart and proceed to checkout

#### Step 3: Extension Auto-Detects Checkout
The extension will:
- Automatically detect you're on a checkout page
- Extract merchant name, product details, and price
- Show a **"Pay with Crypto"** popup/overlay

#### Step 4: Click "Pay with Crypto"
1. The extension opens your Payzee dashboard in a new window
2. The amount and merchant info are pre-filled
3. Connect your wallet (if not already connected)
4. Follow steps 3-6 from Option 1 above

#### Step 5: Auto-fill Card Details
Once the virtual card is created:
- The extension automatically fills in the card details on the checkout page
- You just need to click "Complete Order"

---

## 🛠️ Important: Start the Backend Server

**The dashboard won't work without the backend!**

To start the backend:

```bash
cd "c:\temp\payzee\payzee\backend"

# Activate virtual environment
.\.venv\Scripts\activate

# Run the server
uvicorn src.main:app --reload --port 8000
```

**Verify it's running:**
- Open http://localhost:8000/docs in your browser
- You should see the FastAPI Swagger documentation

---

## 🔍 What's Happening Behind the Scenes

### On the Dashboard:
```javascript
1. You enter amount: $10.50
2. Click "Pay with USDC"
3. System calls: POST /api/v1/payment/initiate
4. Backend creates a payment session
5. Dashboard builds Sui transaction to escrow
6. You sign the transaction in wallet
7. Transaction executes on Sui blockchain
8. Dashboard calls: POST /api/v1/payment/submit
9. Backend creates virtual card via Lithic
10. Card details returned to you
```

### On the Blockchain:
```move
1. Your USDC is locked in the escrow smart contract
2. Contract stores: (merchant_address, amount, session_id)
3. Funds remain in escrow until released
4. Release happens when card transaction settles
```

### On the Backend:
```python
1. Receives your payment session request
2. Generates unique session_id
3. Waits for blockchain confirmation
4. Creates virtual card via Lithic API
5. Stores card mapping: session_id → card_id
6. Returns encrypted card details
```

---

## 🐛 Troubleshooting

### "No USDC coins found in wallet"
**Solution:** You need to get testnet USDC first (see Step 1 above)

### "Failed to initiate payment" or Network Error
**Solution:** Make sure the backend server is running on port 8000

### "Insufficient USDC balance"
**Solution:** You don't have enough USDC. The amount must be in wallet.

**Check your balance:**
```javascript
// In browser console on dashboard:
console.log(wallet.account.address)
// Then check on: https://suiexplorer.com/address/YOUR_ADDRESS?network=testnet
```

### Transaction Stuck/Pending
**Solution:** 
- Check transaction on Sui Explorer: https://suiexplorer.com/txblock/YOUR_TX_HASH?network=testnet
- Try refreshing the page and starting over
- Ensure you have enough SUI for gas fees

### "Card created successfully" but no details shown
**Solution:**
- Open browser console (F12) and check for errors
- Backend might have failed to create the card
- Check backend logs for Lithic API errors

---

## 📊 Current System Configuration

Based on your setup:

- **Dashboard:** http://localhost:3001
- **Backend:** http://localhost:8000 (must be started manually)
- **Sui Network:** Testnet
- **Escrow Contract:** `0xd0d84d39...3dbf69`
- **USDC Type:** `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- **Lithic Environment:** Sandbox (test cards only)

---

## 🎓 Testing the Full Flow

Want to test the entire system? Here's a quick test:

1. **Start backend:**
   ```bash
   cd "c:\temp\payzee\payzee\backend"
   .\.venv\Scripts\activate
   uvicorn src.main:app --reload
   ```

2. **Ensure dashboard is running:**
   - Should already be running on http://localhost:3001

3. **Get testnet USDC** (see Step 1 above)

4. **Make a small test payment:**
   - Amount: `5.00` USD
   - Click "Pay with USDC"
   - Approve in wallet
   - Wait for card creation

5. **Verify the card:**
   - Card details will be displayed
   - You can test the card at any test checkout
   - Or use the backend's test endpoint: `POST /api/v1/cards/test-payment`

---

## 📞 Need Help?

If you're stuck at any step, check:

1. **Browser Console** (F12) - Look for error messages
2. **Backend Logs** - Check the terminal where backend is running
3. **Sui Explorer** - Verify transactions: https://suiexplorer.com
4. **Backend API Docs** - http://localhost:8000/docs

Common issues are usually:
- Backend not running
- No USDC in wallet
- Insufficient SUI for gas fees
- Wrong network configuration

---

## ✅ Next Steps After Creating a Card

Once you have a virtual card:

1. **Test it immediately** - Cards in sandbox might have expiration
2. **Use at any online checkout** - It's a real working card (in sandbox mode)
3. **Check card status** - Use backend API: `GET /api/v1/cards/{card_id}`
4. **Create more cards** - Repeat the process for additional payments

**Remember:** In production, these would be real cards funded by real crypto!
