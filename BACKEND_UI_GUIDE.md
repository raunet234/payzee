# Backend Test UI Guide

## What is the Backend Test UI?

The backend test interface at **http://localhost:8000** (visible at `/docs` or the root HTML) provides **manual control** over the card creation and payment flow. This is separate from the user-facing dashboard.

---

## When to Use Each Interface

### Use Frontend Dashboard When:
- ✅ Testing the complete user experience
- ✅ Testing wallet integration (Slush, Suiet, Sui Wallet)
- ✅ Testing blockchain escrow deposits
- ✅ Demonstrating to users how to pay with crypto
- ✅ Creating real crypto-backed cards

### Use Backend Test UI When:
- ✅ Testing Lithic API without needing crypto
- ✅ Debugging card creation issues
- ✅ Simulating merchant authorization/clearing
- ✅ Testing card limits and restrictions
- ✅ Bypassing blockchain for rapid development

---

## How to Use the Backend Test UI

### Step 1: Create a Test Card

**On the backend UI (http://localhost:8000):**

1. Find the section: **"1️⃣ Create Card"**
2. Fill in the form:
   ```
   Stellar Transaction ID: stellar-tx-test-123
   Amount (cents): 5000  (= $50.00)
   Merchant Name: Test Merchant
   ```
3. Click **"Create SINGLE_USE Card"**

**What happens:**
- Backend calls Lithic API to create a virtual card
- No blockchain involved - this is pure test mode
- Returns a `card_id` (e.g., `card_abc123xyz`)

**Response example:**
```json
{
  "id": "card_abc123xyz",
  "pan": "4111111111111234",
  "cvv": "123",
  "exp_month": "02",
  "exp_year": "2032",
  "last_four": "1234",
  "amount_cents": 5000,
  "status": "OPEN"
}
```

---

### Step 2: Authorize a Payment

**Purpose:** Simulate what happens when a merchant charges the card

1. **Copy the `card_id`** from Step 1 (e.g., `card_abc123xyz`)
2. Find section: **"2️⃣ Authorize Payment"**
3. Fill in:
   ```
   Card ID: card_abc123xyz
   Amount (cents): 5000
   Merchant Descriptor: TEST STORE NYC
   MCC: 5812 - Restaurants
   ```
4. Click **"Authorize Transaction"**

**What happens:**
- Simulates a merchant swiping/entering the card
- Lithic places a hold on the card balance
- Transaction is in "pending" state

**Response:**
```json
{
  "authorization_id": "auth_xyz789",
  "status": "APPROVED",
  "amount": 5000,
  "merchant": "TEST STORE NYC"
}
```

---

### Step 3: Clear the Payment

**Purpose:** Complete the transaction (merchant settles)

1. Use the **same `card_id`** from Step 1
2. Find section: **"3️⃣ Clear Payment"**
3. Fill in:
   ```
   Card ID: card_abc123xyz
   Amount (cents): 5000
   ```
4. Click **"Clear Transaction"**

**What happens:**
- Transaction moves from "pending" to "settled"
- Money is deducted from card balance
- Card is now spent (if single-use)

**Response:**
```json
{
  "clearing_id": "clear_abc456",
  "status": "CLEARED",
  "final_amount": 5000
}
```

---

### Step 4: View Card Details

1. Use the **`card_id`** from Step 1
2. Find section: **"4️⃣ View Card Details"**
3. Enter: `card_abc123xyz`
4. Click **"Get Card Details"**

**What you'll see:**
```json
{
  "id": "card_abc123xyz",
  "pan": "4111111111111234",
  "cvv": "123",
  "status": "CLOSED",  // If fully spent
  "balance_remaining": 0,
  "transactions": [...]
}
```

---

## Why This is Useful

### 1. **Fast Iteration During Development**

Instead of:
```
Connect wallet → Get USDC → Sign transaction → Wait for blockchain → Create card
(Takes 2-3 minutes)
```

You can:
```
Fill form → Click button → Get card
(Takes 5 seconds)
```

### 2. **Test Edge Cases**

- What happens if authorization fails?
- What if clearing amount differs from authorization?
- How does the system handle declined cards?
- Can you authorize twice on the same card?

The backend UI lets you test all these scenarios manually.

### 3. **Bypass Blockchain Issues**

If you have:
- ❌ No testnet USDC
- ❌ Wallet connection issues
- ❌ Blockchain congestion
- ❌ Smart contract bugs

You can still test the Lithic integration!

### 4. **Simulate Real Merchant Behavior**

Merchants don't use your frontend - they have their own payment systems. The backend UI simulates what happens on **their side**:

```
User's Frontend          →    Backend API    →    Merchant System
-----------------             -----------         ---------------
Card created                  Card exists         Authorization
Card shown to user            Card authorized     ← Request charge
User enters card at           ← Authorization        Settlement
checkout                      Clear transaction   ← Complete sale
```

---

## Real-World Flow Comparison

### Using Frontend (Customer Experience):

```
Customer Journey:
1. Visit Payzee dashboard
2. Connect Slush wallet
3. Enter $50 amount
4. Approve USDC transaction
5. Receive virtual card
6. Go to Amazon.com
7. Enter card at checkout
8. Amazon charges the card
9. Purchase complete!

Behind the scenes:
- Dashboard → Backend API → Lithic API → Card created
- Amazon → Lithic API → Authorization/Clearing
```

### Using Backend UI (Developer Testing):

```
Developer Journey:
1. Open localhost:8000
2. Create test card ($50)
3. Copy card_id
4. Simulate merchant authorization
5. Simulate merchant clearing
6. View transaction history

Purpose:
- Test Lithic integration
- Debug payment flows
- No wallet needed
- No blockchain needed
```

---

## When Each Flow is Active

### Frontend Flow is Active When:
- User connects wallet on dashboard
- User clicks "Pay with USDC"
- Blockchain transaction occurs
- Backend receives transaction hash
- Backend creates card via Lithic
- Card shown to user

**Key Point:** User never sees Card ID, authorization, or clearing. It's all automated!

### Backend Test Flow is Active When:
- Developer manually creates cards
- Developer simulates merchant actions
- Testing/debugging only
- No real user involved

---

## Example: Full Backend Test Workflow

Let's create and test a card using only the backend UI:

**Step 1: Create Card**
```
POST /api/v1/cards/create
{
  "stellar_tx": "test-tx-999",
  "amount_cents": 10000,
  "merchant_name": "Netflix"
}

Response: card_id = "card_test123"
```

**Step 2: Check Card**
```
GET /api/v1/cards/card_test123

Response:
{
  "pan": "4111111111112345",
  "cvv": "456",
  "status": "OPEN",
  "balance": 10000
}
```

**Step 3: Simulate Netflix Charging the Card**
```
POST /api/v1/cards/authorize
{
  "card_id": "card_test123",
  "amount_cents": 1599,  // $15.99 Netflix subscription
  "merchant": "NETFLIX.COM"
}

Response: authorization_id = "auth_xyz"
```

**Step 4: Complete the Payment**
```
POST /api/v1/cards/clear
{
  "card_id": "card_test123",
  "amount_cents": 1599
}

Response: Status = "CLEARED"
```

**Step 5: Check Balance**
```
GET /api/v1/cards/card_test123

Response:
{
  "status": "OPEN",
  "balance": 8401  // $100 - $15.99 = $84.01
}
```

---

## Summary

| Question | Answer |
|----------|--------|
| **What is backend UI for?** | Testing and manual card operations |
| **Do users see it?** | ❌ No, only developers |
| **Is it required?** | ❌ No, frontend works independently |
| **When to use it?** | When testing without wallet/blockchain |
| **Is it secure for production?** | ⚠️ Should be disabled or protected in production |

---

## Best Practices

### Development Phase:
- ✅ Use backend UI for rapid testing
- ✅ Use frontend UI for E2E testing
- ✅ Test both flows regularly

### Production:
- ❌ Disable/protect backend UI endpoints
- ✅ Only allow frontend flow
- ✅ Add authentication to admin endpoints
- ✅ Remove test HTML interface

---

## Next Steps

**If you want to test backend UI now:**

1. Go to http://localhost:8000
2. Use the HTML form interface
3. Create a test card with amount 5000 ($50)
4. Note the card_id
5. Authorize $50 payment
6. Clear the $50 payment
7. View card details - should show CLOSED

**If you prefer frontend:**

1. Go to http://localhost:3001
2. Connect wallet
3. Enter amount
4. Get card automatically
5. Use card at real checkout

Both work, but serve different purposes! 🚀
