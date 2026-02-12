# Payzee Project Structure

## Overview

This project has **two UIs** but they serve different purposes:

### ✅ Production Frontend (Dashboard)
- **Location**: `dashboard/` directory
- **URL**: `http://localhost:3001/` (during development)
- **Tech Stack**: React + Vite + Tailwind + Sui blockchain integration
- **Purpose**: Main user-facing application
- **Routes**:
  - `/` - Landing page with marketing content
  - `/app` - Dashboard for making payments
- **Backend Connection**: ✅ **CONNECTED** to `http://localhost:8000`

### 🧪 Backend Test UI (Legacy)
- **Location**: `backend/static/index.html`
- **URL**: `http://localhost:8000/`
- **Tech Stack**: Static HTML/CSS/JS
- **Purpose**: Internal testing interface (outdated, uses Stellar blockchain references)
- **Note**: This is NOT the main UI - it's just for API testing during development

## How They Connect

```
┌─────────────────────────┐
│  Dashboard Frontend     │
│  (port 3001)            │
│                         │
│  - Landing Page (/)     │
│  - Dashboard (/app)     │
│  - Wallet connection    │
│  - Payment UI           │
└───────────┬─────────────┘
            │
            │ API Calls
            │ (fetch requests)
            │
            ▼
┌─────────────────────────┐
│  Backend API            │
│  (Port 8000)            │
│                         │
│  FastAPI Endpoints:     │
│  - /api/v1/payment/*    │
│  - /api/v1/cards/*      │
│  - /health              │
│                         │
│  Static Test UI:        │
│  - / (index.html)       │
└─────────────────────────┘
```

## For Users

**To use Payzee:**
1. Open `http://localhost:3001/` in your browser
2. This is the main dashboard with the Sui wallet integration
3. Click "Connect Wallet" and follow the flow

**To test the backend API directly:**
1. Open `http://localhost:8000/` for the testing interface
2. Or use `http://localhost:8000/docs` for Swagger API documentation

## Architecture Flow

When you make a payment from the Dashboard:

```
1. User connects Sui wallet (Suiet/Sui Wallet)
   └─> Dashboard.jsx manages wallet state

2. User enters payment amount
   └─> Dashboard calls /api/v1/payment/initiate
   └─> Backend creates session and returns details

3. User signs transaction in wallet
   └─> Dashboard builds Sui transaction
   └─> Wallet signs the transaction

4. Dashboard submits signed transaction
   └─> Calls /api/v1/payment/submit
   └─> Backend verifies on Sui blockchain
   └─> Backend creates virtual card via Lithic
   └─> Returns card details to Dashboard

5. Dashboard displays card information
   └─> User can complete payment
```

## Development Servers

```bash
# Terminal 1: Backend
cd backend
uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend Dashboard
cd dashboard
npm run dev
```

Default ports:
- **Backend**: `http://localhost:8000`
- **Dashboard**: `http://localhost:3001`

## Key Configuration

### Backend (FastAPI)
- **File**: `backend/src/config.py`
- Sui RPC endpoint
- Lithic API keys
- Database settings

### Frontend (React)
- **File**: `dashboard/src/pages/Dashboard.jsx`
- Lines 18-20: BACKEND_URL configuration
- Automatically uses `localhost:8000` in development
- Uses production URL when built

## Common Confusion

❌ **"The backend and frontend have different UIs and aren't connected"**
- The backend's HTML page at `http://localhost:8000/` is just a test tool
- The real frontend is the Dashboard at `http://localhost:3001/`
- They ARE connected via API calls

✅ **"How do I use the app?"**
- Open `http://localhost:3001/`
- Connect your Sui wallet
- Make payments from the `/app` route

## API Endpoints

The Dashboard uses these backend endpoints:

- `POST /api/v1/payment/initiate` - Start a payment session
- `POST /api/v1/payment/submit` - Submit signed transaction and create card
- `POST /api/v1/cards/test-payment` - Test payment with created card
- `GET /health` - Check backend status

## Next Steps

If you want to clean up the legacy test UI:
1. Remove `backend/static/index.html` (optional)
2. Update `backend/src/main.py` to remove static file serving (optional)

The Dashboard at port 3001 is your production frontend and is fully connected to the backend!
