# 🎯 Quick Start Guide: Understanding Your Payzee Setup

## TL;DR - The Confusion Explained

You have **TWO different UIs** running:

1. **Backend Test UI** at `http://localhost:8000/` 
   - ❌ This is an OLD testing tool (not your main app!)
   - Uses outdated Stellar blockchain references
   - Just for backend API testing

2. **Dashboard (Main App)** at `http://localhost:3001/`
   - ✅ This is your REAL frontend!
   - Modern React app with Sui blockchain
   - **Already connected** to backend at port 8000

## Visual Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     YOUR BROWSER                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Tab 1: http://localhost:3001/                               │
│  ┌────────────────────────────────────────────┐              │
│  │  ✅ DASHBOARD (Main Frontend)              │              │
│  │  - Landing Page                            │              │
│  │  - Payzee branding                         │              │
│  │  - "Connect Wallet" button                 │              │
│  │  - Sui wallet integration                  │              │
│  └────────────────────────────────────────────┘              │
│         │                                                     │
│         │ Makes API calls to:                                │
│         │ http://localhost:8000/api/v1/*                     │
│         ▼                                                     │
│                                                               │
│  Tab 2: http://localhost:8000/                               │
│  ┌────────────────────────────────────────────┐              │
│  │  🧪 BACKEND TEST UI (Legacy)               │              │
│  │  - Manual card creation forms              │              │
│  │  - Says "Stellar Transaction ID"           │              │
│  │  - Purple gradient design                  │              │
│  │  - For internal API testing only           │              │
│  └────────────────────────────────────────────┘              │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 BACKEND SERVER (Port 8000)                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  FastAPI Application                                         │
│  ├─ API Routes: /api/v1/payment/*, /api/v1/cards/*          │
│  ├─ Static Files: /static/* (test UI)                       │
│  ├─ API Docs: /docs (Swagger)                               │
│  └─ Health Check: /health                                    │
│                                                               │
│  Services:                                                    │
│  ├─ Sui blockchain integration                              │
│  ├─ Lithic card creation                                     │
│  └─ SQLite database                                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## How They ARE Connected ✅

Look at `dashboard/src/pages/Dashboard.jsx` lines 18-20:

```javascript
const BACKEND_URL = import.meta.env.DEV
    ? 'http://localhost:8000'  // ← Dashboard DOES connect to backend!
    : 'https://payzee-production.up.railway.app'
```

The Dashboard makes these API calls:
- `POST http://localhost:8000/api/v1/payment/initiate`
- `POST http://localhost:8000/api/v1/payment/submit` 
- `POST http://localhost:8000/api/v1/cards/test-payment`

## What You Should Use

### For Normal Use (Users/Demo):
**Go to: `http://localhost:3001/`**
- This is your production-ready frontend
- Beautiful landing page
- Sui wallet connection
- Full payment flow

### For API Testing (Developers):
**Go to: `http://localhost:8000/docs`**
- Swagger API documentation
- Test endpoints directly
- Better than the static HTML UI

### Legacy Test UI (Optional):
**Go to: `http://localhost:8000/`**
- Old testing interface
- Can be removed if desired
- Not needed for normal operation

## Verifying the Connection

Test if backend is running:
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T...",
  "environment": "sandbox"
}
```

Test if dashboard can reach backend:
1. Open `http://localhost:3001/`
2. Open browser DevTools (F12)
3. Go to Network tab
4. Connect wallet or try a payment
5. You should see API calls to `http://localhost:8000/api/v1/*`

## Running Both Services

```bash
# Terminal 1: Backend
cd "c:\temp\payzee\payzee\backend"
uvicorn src.main:app --reload --port 8000

# Terminal 2: Dashboard
cd "c:\temp\payzee\payzee\dashboard"  
npm run dev
```

✅ Both should be running (you have them running already!)

## The Bottom Line

**You don't have a connection problem!** 

Your frontend (port 3001) and backend (port 8000) ARE connected. The confusion comes from:

1. **The backend has an old test UI** at `http://localhost:8000/` that looks different
2. **The dashboard IS the real frontend** at `http://localhost:3001/`
3. They communicate via API calls (which is correct!)

**What to do:**
- Use `http://localhost:3001/` for the actual Payzee app
- Ignore or remove `http://localhost:8000/` (the static test UI)
- The Dashboard already calls the backend API correctly

## Optional: Remove the Legacy Test UI

If you want to clean up and remove confusion:

```bash
# Remove the old test UI
rm "c:\temp\payzee\payzee\backend\static\index.html"
```

Then in `backend/src/main.py`, remove lines 260-263 (static file mounting).

This won't break anything - the Dashboard will still work perfectly!
