# 🌐 Payzee Browser Extension Guide

## What is the Payzee Browser Extension?

The **Payzee browser extension** is a Chrome/Edge extension that automatically **detects checkout pages** and lets you **pay with crypto** at ANY online store - even if they don't accept cryptocurrency!

---

## 🎯 What It Does

### **Automatic Magic:**

```
You're shopping →  Extension detects checkout  →  Click "Pay with Payzee"
     ↓                       ↓                             ↓
Add to cart          Sees card fields               Opens dashboard
     ↓                       ↓                             ↓
Checkout           Extracts price & merchant      Connect wallet + Pay
     ↓                       ↓                             ↓
Enter payment    Converts currency to USD      Virtual card created
     ↓                       ↓                             ↓
Complete!        Auto-fills card details         Purchase complete!
```

**You never manually copy/paste card details!**

---

## ✨ Key Features

### 1. **Smart Checkout Detection**
- Automatically detects when you're on a payment page
- Shows a "Pay with Payzee" button (bottom-right corner)
- Works on ANY website with checkout forms

### 2. **Automatic Price Extraction**
- Extracts the total amount from the page
- Detects currency (USD, EUR, GBP, INR, etc.)
- Auto-converts to USD using real-time exchange rates

### 3. **Merchant Information Extraction**
- Captures merchant name from page
- Extracts product/hotel details
- Records domain and URL for reference

### 4. **Currency Conversion**
- Supports 10+ currencies:
  - 💵 USD (US Dollar)
  - 💶 EUR (Euro)
  - 💷 GBP (British Pound)
  - 💴 JPY (Japanese Yen)
  - 💰 INR (Indian Rupee)
  - And more!

### 5. **Auto-Fill Card Details**
- Automatically fills in:
  - ✅ Card Number
  - ✅ Expiration Date (MM/YY or separate fields)
  - ✅ CVV/CVC
  - ✅ Cardholder Name (optional)
- Works with React, Vue, and vanilla JavaScript forms

### 6. **One-Click Confirmation**
- Shows "Confirm Transaction" button after auto-fill
- Final click to complete the purchase
- Tracks payment status

---

## 🚀 How to Install

### **Step 1: Load the Extension**

1. **Open Chrome** (or Edge)
2. Navigate to: `chrome://extensions/` (or `edge://extensions/`)
3. **Enable "Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select folder: `c:\temp\payzee\payzee\extension`

**You should see:**
```
┌────────────────────────────────────┐
│ ✅ Payzee                          │
│ v1.0.8                             │
│ Pay at any checkout using USDC on  │
│ Sui - automatic currency conversion│
└────────────────────────────────────┘
```

### **Step 2: Verify Installation**

1. Extension icon should appear in browser toolbar
2. Go to any website
3. Open browser console (F12)
4. You should see: `Payzee Extension: Content script loaded`

---

## 💡 How to Use

### **Complete Flow Example:**

Let's say you're buying a hotel room on Booking.com:

#### **1. Browse Normally**
```
Go to Booking.com
Search for hotels
Select a room
Click "Book Now"
```

#### **2. Extension Detects Checkout**
When you reach the payment page:
- Extension scans the page
- Detects card input fields
- Extracts:
  - Hotel name: "Grand Plaza Hotel"
  - Location: "Dubai, UAE"
  - Price: "Rs 15,000" (Indian Rupees)
  - Dates: Check-in/Check-out

#### **3. "Pay with Payzee" Button Appears**
Bottom-right corner of the page:
```
┌───────────────────────┐
│ 💎 Pay with Payzee    │ ← Floating button
└───────────────────────┘
```

#### **4. Click the Button**
- Extension shows loading: "Accepting crypto..."
- Converts Rs 15,000 → ~$180 USD (real-time rate)
- Opens Payzee dashboard in popup window
- Pre-fills:
  - ✅ Amount: $180.00
  - ✅ Merchant: "Grand Plaza Hotel"
  - ✅ Original: "Rs 15,000"

#### **5. Dashboard Flow**
In the popup:
```
1. Connect your Sui wallet
2. Review the amount (already filled)
3. Click "Pay with USDC"
4. Approve transaction in wallet
5. Wait for virtual card creation
```

#### **6. Auto-Fill Magic** ✨
Once card is created:
- Extension receives card details
- **Automatically fills** all fields on Booking.com:
  - Card Number: `4111 1111 1111 1234`
  - Expiration: `02/32`
  - CVV: `123`
  - Name: "Payzee User"
- Shows notification: "Card details filled automatically!"

#### **7. Confirm Transaction**
A green "Confirm Transaction" button appears:
```
┌───────────────────────────┐
│ ✅ Confirm Transaction    │ ← Click this
└───────────────────────────┘
```

#### **8. Complete Purchase**
- Extension sends confirmation
- Dashboard processes payment
- Booking.com completes the reservation
- **You just paid with crypto!** 🎉

---

## 🔧 Extension Configuration

The extension can be configured in `content.js`:

```javascript
// Line 5-6 in content.js
const DEV_MODE = true;  // Use localhost dashboard
const DASHBOARD_URL = DEV_MODE 
  ? 'http://localhost:3001'  // Local development
  : 'https://payzee-tan.vercel.app';  // Production URL
```

**For your current setup:**
- ✅ `DEV_MODE = true` (using localhost:3001)
- Change to `false` when deploying to production

---

## 🎨 What You'll See

### **On Checkout Pages:**

**Before clicking:**
```
┌─────────────────────────────────┐
│                                 │
│  Hotel Booking Summary          │
│                                 │
│  Total: Rs 15,000               │
│                                 │
│  [Enter Card Details]           │
│                                 │
│                                 │
│              ┌─────────────────┐│
│              │💎 Pay with Payzee││ ← Extension button
│              └─────────────────┘│
└─────────────────────────────────┘
```

**After clicking:**
```
┌─────────────────────────────────┐
│  Payzee Dashboard (popup)       │
│                                 │
│  Payment to: Grand Plaza Hotel  │
│  Booking.com                    │
│                                 │
│  Amount (USD): 180.00           │ ← Auto-filled!
│  Converted from: Rs 15,000      │ ← Shows original
│                                 │
│  [Connect Wallet]               │
└─────────────────────────────────┘
```

**After payment:**
```
┌─────────────────────────────────┐
│                                 │
│  Card Number: 4111111111111234  │ ← Auto-filled!
│  Expiration:  02/32             │ ← Auto-filled!
│  CVV:         123               │ ← Auto-filled!
│  Name:        Payzee User       │ ← Auto-filled!
│                                 │
│              ┌─────────────────┐│
│              │✅ Confirm       ││ ← Click to finish
│              │   Transaction   ││
│              └─────────────────┘│
└─────────────────────────────────┘
```

---

## 🌍 Supported Features

### **Checkout Detection:**
Automatically works on pages with:
- ✅ URLs containing: `/checkout`, `/payment`, `/cart`, `/order`
- ✅ Card input fields (number, CVV, expiry)
- ✅ Payment-related text ("credit card", "debit card", etc.)

### **Currency Conversion:**
Supports these currencies:
- 💵 **USD** - US Dollar
- 💶 **EUR** - Euro
- 💷 **GBP** - British Pound  
- 💴 **JPY** - Japanese Yen
- 💰 **INR** - Indian Rupee (Rs/₹)
- 🇨🇦 **CAD** - Canadian Dollar (C$)
- 🇦🇺 **AUD** - Australian Dollar (A$)
- 🇨🇭 **CHF** - Swiss Franc
- 🇸🇪 **SEK** - Swedish Krona (kr)
- 🇧🇷 **BRL** - Brazilian Real (R$)

### **Form Auto-Fill:**
Works with:
- ✅ React forms (bypasses React state)
- ✅ Vue.js forms
- ✅ Vanilla JavaScript forms
- ✅ Separate month/year fields
- ✅ Combined expiry fields (MM/YY)
- ✅ All CVV/CVC field variations

---

## 🧪 Testing the Extension

### **Test on These Sites:**

1. **Local Test Page**
   - Create a simple HTML checkout form
   - Test auto-detection and auto-fill

2. **Real E-commerce (Sandbox Mode)**
   - Amazon.com (might not work - needs real card)
   - Hotels.com booking page
   - Any Shopify store

3. **Your Own Test Checkout**
   - Create HTML with card fields
   - Extension should detect it

---

## 🔍 Debugging

### **Check if Extension is Running:**

1. **Open any webpage**
2. **Open Console (F12)**
3. **Look for:**
   ```
   Payzee Extension: Content script loaded
   Payzee: Checkout page detected
   ```

### **Test Amount Extraction:**

In console, run:
```javascript
// Manually trigger extraction
console.log(extractTotalAmount());
```

### **Test Merchant Extraction:**

```javascript
console.log(extractMerchantData());
```

### **Enable Detailed Logs:**

The extension has extensive logging. Check console for:
```
=== PAYZEE DEBUG: Starting amount extraction ===
Payzee: Found product name: Grand Plaza Hotel
Payzee: Extracted amount: Rs 15,000
Payzee: Converted to USD: $180.00
```

---

## 🎯 Real-World Use Cases

### **Use Case 1: Hotel Booking**
```
Booking.com → Rs 15,000 hotel room
              ↓
Extension converts to $180 USD
              ↓
Pay with USDC from wallet
              ↓
Card auto-filled on Booking.com
              ↓
Booking confirmed!
```

### **Use Case 2: International Shopping**
```
UK Store → £99 product
           ↓
Extension converts to $127 USD
           ↓
Pay with USDC
           ↓
Card details auto-filled
           ↓
Purchase complete!
```

### **Use Case 3: Subscription**
```
Netflix → €12.99/month
          ↓
Extension converts to $14 USD
          ↓
Create virtual card
          ↓
Auto-fill payment info
          ↓
Subscription activated!
```

---

## 📊 Extension Architecture

```
┌─────────────────────────────────────────────┐
│          Browser Extension                  │
│  ┌───────────────────────────────────┐     │
│  │  content.js (runs on every page)  │     │
│  │                                   │     │
│  │  1. Detect checkout page          │     │
│  │  2. Extract price & merchant      │     │
│  │  3. Show "Pay with Payzee" button │     │
│  │  4. Convert currency → USD        │     │
│  │  5. Open dashboard popup          │     │
│  │  6. Listen for card details       │     │
│  │  7. Auto-fill card fields         │     │
│  │  8. Show confirm button           │     │
│  └───────────────────────────────────┘     │
└─────────────────────────────────────────────┘
              ↕ postMessage
┌─────────────────────────────────────────────┐
│       Dashboard (Popup Window)              │
│  ┌───────────────────────────────────┐     │
│  │  1. Receive amount & merchant     │←────│ From extension
│  │  2. User connects wallet          │     │
│  │  3. User approves payment         │     │
│  │  4. Virtual card created          │     │
│  │  5. Send card details back        │─────│ To extension
│  └───────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security & Privacy

### **What the Extension Can See:**
- ✅ Current page URL
- ✅ Page text (to extract prices)
- ✅ Form fields (to auto-fill)

### **What It CANNOT See:**
- ❌ Your wallet private keys
- ❌ Other tabs/windows
- ❌ Browser history
- ❌ Passwords or saved data

### **Card Details:**
- Transmitted via `postMessage` (browser-to-browser)
- Not sent over internet until you submit checkout form
- Only stored temporarily in extension memory
- Cleared after auto-fill completes

---

## 🚨 Troubleshooting

### **"Pay with Payzee" button doesn't appear**

**Possible causes:**
1. Not on a checkout page
   - ✅ Go to a page with card input fields
2. Extension not loaded
   - ✅ Check `chrome://extensions/`
3. Already on dashboard
   - ✅ Button is hidden on localhost:3001

**Solution:** Check console for:
```
Payzee: Checkout page detected
```

---

### **Amount not extracted correctly**

**Possible causes:**
1. Page uses non-standard format
2. Price hidden in iframe
3. Dynamic loading not complete

**Solution:** Check console:
```javascript
extractTotalAmount();  // See what it extracts
```

---

### **Auto-fill doesn't work**

**Possible causes:**
1. Form fields have unusual names/IDs
2. React/Vue binding issue
3. Card details missing from message

**Solution:**
1. Check card object in console:
   ```javascript
   console.log(cardDetails);
   ```
2. Manually inspect field selectors
3. Try clicking in a field first (triggers focus)

---

### **Currency conversion fails**

**Possible causes:**
1. Exchange API rate limit
2. Network offline
3. Unsupported currency

**Solution:**
- Extension uses free API: `open.er-api.com`
- Falls back to original amount if conversion fails
- Check console for API response

---

## 📝 Quick Reference

| Action | Where | What Happens |
|--------|-------|--------------|
| Install extension | `chrome://extensions/` | Loads Payzee on all pages |
| Go to checkout | Any e-commerce site | Button appears bottom-right |
| Click "Pay with Payzee" | Checkout page | Opens dashboard popup |
| Connect wallet | Dashboard popup | Links to Sui wallet |
| Approve payment | Wallet popup | Creates virtual card |
| Wait for auto-fill | Checkout page | Card details filled automatically |
| Click "Confirm Transaction" | Checkout page | Completes extension flow |
| Complete purchase | Merchant checkout | Finishes transaction |

---

## 🎓 Summary

The Payzee extension makes crypto payments **invisible** to merchants:

✅ **You:** Pay with USDC from your Sui wallet  
✅ **Merchant:** Receives USD via normal card payment  
✅ **Magic:** Extension handles all the complexity  

**No merchant integration needed. No crypto knowledge required. Just click and pay!** 🚀

---

## 📖 Next Steps

1. **Install the extension** (see instructions above)
2. **Test on a real checkout page**
3. **Watch the magic happen** as prices convert and cards auto-fill
4. **Pay with crypto anywhere online!**

The extension is your **crypto payment superpower** - turning any e-commerce site into a crypto-accepting store! 💪
