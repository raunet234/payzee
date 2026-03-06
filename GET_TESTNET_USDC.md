# 🪙 GET USDC ON SUI TESTNET

## The Error You're Seeing

```
Payment failed: No permission for the action | (e4:-4003)
```

This error typically means: **You don't have USDC tokens on Sui Testnet**

## Why This Happens

Your wallet is on **Sui Testnet** now ✅, but it doesn't have USDC tokens. When the app tries to spend USDC, the wallet denies permission because there are no USDC coins to spend!

## Solution: Get Testnet USDC

### Step 1: Get SUI Tokens First (For Gas)

Before getting USDC, you need SUI tokens for transaction fees:

**Option A: Sui Testnet Faucet (Official)**
1. Go to: https://discord.gg/sui
2. Join the Sui Discord
3. Go to `#testnet-faucet` channel
4. Type: `!faucet YOUR_WALLET_ADDRESS`
   - Replace with your address: `0x61dc...9735`
   - Example: `!faucet 0x61dcYOURFULLADDRESS9735`

**Option B: Web Faucet**
1. Go to: https://faucet.sui.io/
2. Select "Testnet"
3. Enter your wallet address
4. Click "Request Tokens"

### Step 2: Get USDC on Testnet

The USDC contract on Sui testnet is:
```
0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
```

**Unfortunately, there's no direct USDC faucet for Sui testnet.** Here are your options:

#### Option 1: FOR TESTING - Bypass USDC Requirement

**Quick Test Solution:** Test the backend card creation without Sui transaction:

1. **Go to backend test UI:** `http://localhost:8000/`
2. **Fill in the form:**
   - Stellar Transaction ID: `test-tx-123`
   - Amount (cents): `5000` (for $50.00)
   - Merchant Name: `Test Merchant`
3. **Click "Create SINGLE_USE Card"**
4. This will create a real Lithic card without Sui transaction ✅

This tests the full backend → Lithic integration without needing USDC.

#### Option 2: Get Testnet USDC (More Complex)

Since there's no direct USDC faucet, you need to:

1. **Deploy a test USDC contract** on testnet, OR
2. **Use a testnet bridge** to mint test USDC, OR
3. **Modify the contract** to work with native SUI instead of USDC

#### Option 3: Use Native SUI Instead of USDC (Recommended for Testing)

**Easier approach:** Modify the escrow contract to accept native SUI tokens instead of USDC.

**Steps:**

1. **Update the Move contract** (`sui-escrow/sources/escrow.move`)
   - Change from `Coin<USDC>` to `Coin<SUI>`
   - This lets you use native testnet SUI tokens

2. **Redeploy the contract:**
   ```bash
   cd "c:\temp\payzee\payzee\sui-escrow"
   sui client publish --gas-budget 100000000
   ```

3. **Update the package ID** in frontend and backend

4. **Use SUI instead of USDC** for testing

Would you like me to modify the contract to use SUI instead of USDC?

## Quick Fix: Test Without Blockchain

For immediate testing of the card creation flow:

### Use Backend API Directly

**Terminal command:**
```bash
curl -X POST http://localhost:8000/api/v1/cards/create ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: sk_stellar_pay_dev_b03352ef1d68164c675023b82538ea3d1d1902f69bc408b7" ^
  -d "{\"stellar_transaction_id\":\"test-123\",\"user_stellar_address\":\"GABC123...\",\"amount_cents\":5000,\"merchant_name\":\"Test Shop\"}"
```

This creates a real Lithic virtual card without touching Sui at all.

### Or Use Backend Test UI

1. Open: `http://localhost:8000/`
2. Use the purple test interface
3. Fill the form and create a card
4. Test the full payment → card → clearing flow

## Understanding the Flow

```
WITH USDC (Full Production Flow):
User → Deposit USDC to Escrow → Backend creates card → User pays
         ↑
    Needs USDC tokens on testnet ❌

WITHOUT USDC (Testing Mode):
User → Backend creates card directly → User pays
       ↑
   No blockchain needed ✅
```

## Recommended Next Steps

**For immediate testing:**
1. ✅ Use backend test UI at `http://localhost:8000/`
2. ✅ Create cards directly via API
3. ✅ Test Lithic integration (authorization, clearing)
4. ✅ Verify webhook handling

**For full blockchain integration:**
1. Get testnet SUI tokens (from faucet)
2. Either:
   - Modify contract to use SUI instead of USDC, OR
   - Deploy a custom USDC-like token for testing

## Quick Test Right Now

**Try this immediately:**

1. Open `http://localhost:8000/` in your browser
2. You'll see the purple test UI
3. Fill in:
   - Transaction ID: `test-payment-1`
   - Amount: `5000` (cents)
   - Merchant: `Coffee Shop`
4. Click "Create SINGLE_USE Card"
5. You should get a real virtual card! ✅

This proves the backend works without needing USDC.

## Summary

**The Issue:**
- ✅ Network switched to testnet (good!)
- ❌ No USDC tokens on testnet (blocking payment)
- Error: `-4003` = No permission (can't spend USDC you don't have)

**Immediate Solution:**
- Use backend test UI at `http://localhost:8000/`
- Create cards directly without blockchain
- Test the full Lithic integration

**Long-term Solution:**
- Modify contract to use SUI instead of USDC
- Or deploy a test USDC token
- Or get USDC from a testnet bridge

**Would you like me to:**
1. ✅ Show you how to use the backend test UI to create cards now?
2. ✅ Modify the contract to use SUI instead of USDC?
3. ✅ Create a demo mode in the dashboard that skips blockchain?

Let me know which approach you prefer! 🚀
