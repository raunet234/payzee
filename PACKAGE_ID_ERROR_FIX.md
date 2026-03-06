# 🔧 FIX: Package ID Not Found Error

## The Error You're Seeing

```
We were unable to locate the packageID. 
Please try selecting a different network or reach out 
to the website owner to confirm the existence of the requested package.
```

## What This Means

Your **Suiet wallet** is trying to find a Sui smart contract package with ID:
```
0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69
```

But it can't find it. This happens when:
1. ❌ Your wallet is on the **wrong network** (mainnet vs testnet)
2. ❌ The package doesn't exist or was never deployed
3. ❌ The package ID in the code is incorrect

## Solution 1: Check Your Wallet Network ✅

**Most likely cause:** Your Suiet wallet is on **Mainnet** but the app needs **Testnet**.

### How to Switch Network in Suiet:

1. **Open Suiet Wallet** (the extension)
2. **Click the network selector** at the top (might say "Mainnet" or "Sui Mainnet")
3. **Select "Testnet"** from the dropdown
4. **Refresh the dashboard page** (`http://localhost:3001/app`)
5. **Try the payment again**

### Visual Guide:
```
Suiet Wallet
┌─────────────────────────┐
│ [Mainnet ▼]  ← Click    │  Switch this to:
│                         │
│ Options:                │  
│ • Mainnet               │
│ • Testnet    ← Select   │
│ • Devnet                │
│ • Custom RPC            │
└─────────────────────────┘
```

## Solution 2: Verify Package Deployment

The package ID in your config is:
```
0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69
```

### Check if it exists on Sui Testnet:

**Option A: Use Sui Explorer**
1. Go to: https://suiscan.xyz/testnet/home
2. Paste the package ID in search: `0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69`
3. If it shows "Not found" → Package was never deployed

**Option B: Use CLI** (if you have Sui CLI installed)
```bash
sui client object 0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69 --network testnet
```

## Solution 3: Deploy the Smart Contract (If Needed)

If the package doesn't exist, you need to deploy it:

### Deploy to Sui Testnet:

```bash
# Navigate to contract directory
cd "c:\temp\payzee\payzee\sui-escrow"

# Make sure you're on testnet
sui client switch --env testnet

# Deploy the contract
sui client publish --gas-budget 100000000

# ⚠️ IMPORTANT: Copy the package ID from the output!
# It will look like: "Published package 0x..."
```

### After Deployment:

1. **Copy the new Package ID** from the deployment output
2. **Update** `backend/.env` line 15:
   ```env
   SUI_PACKAGE_ID=0xYOUR_NEW_PACKAGE_ID_HERE
   ```
3. **Update** `dashboard/src/pages/Dashboard.jsx` line 25:
   ```javascript
   const ESCROW_PACKAGE_ID = '0xYOUR_NEW_PACKAGE_ID_HERE'
   ```
4. **Restart both servers**

## Solution 4: Quick Fix - Use Test Mode

For testing without deploying the contract, you can temporary bypass the escrow:

### Option: Direct Card Creation (Testing Only)

This bypasses the Sui transaction and creates cards directly:

**Update Dashboard.jsx** to skip Sui transaction for testing:
- Comment out the transaction building code
- Call backend directly with mock transaction data
- This is NOT production-ready, only for testing the card creation flow

## Most Likely Fix 🎯

**90% chance this is the issue:**

Your **Suiet wallet is on Mainnet** but the app expects **Testnet**.

**Quick Fix:**
1. Open Suiet wallet extension
2. Switch from "Mainnet" to "Testnet"
3. Refresh the dashboard page
4. Try payment again ✅

## Verification Steps

After switching to Testnet:

1. **Check wallet network:**
   - Suiet should show "Testnet" at the top
   - Your USDC balance might be different (testnet vs mainnet)

2. **Try payment again:**
   - Enter amount (e.g., `10`)
   - Click "Pay with USDC"
   - Wallet should ask to sign transaction ✅

3. **Check browser console:**
   - Press F12 → Console tab
   - Look for any errors
   - Should see: "Building transaction..." logs

## Expected Flow (After Fix)

```
1. Dashboard calls backend: /api/v1/payment/initiate
   ✅ Backend returns session

2. Dashboard builds Sui transaction on TESTNET
   ✅ Uses ESCROW_PACKAGE_ID on testnet

3. Suiet wallet (on TESTNET) signs transaction
   ✅ Finds the package ✅
   ✅ Transaction succeeds

4. Dashboard submits to backend
   ✅ Backend verifies transaction
   ✅ Backend creates virtual card
   ✅ Card details returned
```

## Alternative: Skip Escrow for Testing

If you just want to test the card creation without Sui integration:

### Test Endpoint

Use the backend's test UI at `http://localhost:8000/`:
1. Enter any transaction ID (e.g., `test-tx-123`)
2. Enter amount in cents (e.g., `5000` for $50)
3. Click "Create SINGLE_USE Card"
4. This tests Lithic integration without Sui

## Summary

**Most likely solution:**
✅ Switch Suiet wallet from **Mainnet** to **Testnet**
✅ Refresh the dashboard
✅ Try payment again

**If that doesn't work:**
1. Verify package exists on testnet using Sui Explorer
2. Re-deploy the contract if needed
3. Update package ID in both frontend and backend

**Network Mismatch is 90% of the time the issue!** 🎯

---

## Quick Commands

```bash
# Check if package exists on testnet (requires curl)
curl -X POST https://fullnode.testnet.sui.io:443 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getObject","params":["0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69"]}'

# Deploy contract (if needed)
cd "c:\temp\payzee\payzee\sui-escrow"
sui client publish --gas-budget 100000000
```

**Start by switching your wallet to Testnet!** That should fix it! 🚀
