# Payzee

A crypto-to-fiat payment bridge that enables users to pay at any online checkout using cryptocurrency. The system creates virtual cards funded by crypto deposits through an escrow smart contract, allowing seamless conversion from digital assets to traditional payment methods.

## Tech Stack

### Backend
- **Python 3.10+** with FastAPI
- **SQLModel** for database ORM
- **Lithic API** for virtual card issuance and management
- **Pydantic Settings** for configuration management
- **Uvicorn** as ASGI server

### Dashboard (Frontend)
- **React 18** with Vite
- **Sui Wallet Kit** (`@suiet/wallet-kit`) for wallet integration
- **Sui.js** (`@mysten/sui.js`) for blockchain interactions

### Smart Contract
- **Move** language on **Sui** blockchain
- Escrow contract for secure fund management

### Browser Extension
- **Manifest V3** Chrome extension
- Content script for checkout page detection

## Folder Structure

```
stellar pay/
├── backend/               # FastAPI backend service
│   ├── src/
│   │   ├── main.py        # Application entry point and API routes
│   │   ├── config.py      # Environment configuration
│   │   ├── models.py      # Database models
│   │   ├── api/           # API route modules
│   │   └── services/      # Business logic (Lithic, Sui, etc.)
│   ├── static/            # Static files for test frontend
│   ├── requirements.txt   # Python dependencies
│   └── pyproject.toml     # Project metadata
│
├── dashboard/             # React frontend application
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── main.jsx       # React entry point
│   │   └── *.css          # Stylesheets
│   ├── package.json       # Node.js dependencies
│   └── vite.config.js     # Vite configuration
│
├── extension/             # Chrome browser extension
│   ├── manifest.json      # Extension manifest
│   ├── content.js         # Content script for page interaction
│   └── icons/             # Extension icons
│
└── sui-escrow/            # Sui Move smart contract
    ├── sources/
    │   └── escrow.move    # Escrow contract source
    ├── Move.toml          # Move package manifest
    └── build/             # Compiled contract artifacts
```

## Local Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- Sui CLI (for smart contract development)

### Backend

1. Navigate to the backend directory:
   ```bash
   cd "stellar pay/backend"
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with required configuration:
   ```env
   API_KEY=your_api_key
   LITHIC_API_KEY=your_lithic_api_key
   LITHIC_ENVIRONMENT=sandbox
   SUI_NETWORK=testnet
   SUI_PACKAGE_ID=your_deployed_package_id
   ```

5. Run the development server:
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```

### Dashboard

1. Navigate to the dashboard directory:
   ```bash
   cd "stellar pay/dashboard"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:3001`.

### Browser Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `stellar pay/extension` directory

### Smart Contract (Sui)

1. Navigate to the contract directory:
   ```bash
   cd "stellar pay/sui-escrow"
   ```

2. Build the contract:
   ```bash
   sui move build
   ```

3. Deploy to testnet:
   ```bash
   sui client publish --gas-budget 100000000
   ```

## Notes

- The backend runs on port `8000` by default; the dashboard on port `3001`.
- The Lithic integration operates in sandbox mode by default for development.
- Sui testnet is used for development; update configuration for mainnet deployment.
- API documentation is available at `/docs` (Swagger UI) and `/redoc` when the backend is running.
- Ensure all environment variables are properly configured before running services.
