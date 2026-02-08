/**
 * Application Entry Point
 *
 * Initializes React with Sui wallet provider context.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider } from '@suiet/wallet-kit'
import '@suiet/wallet-kit/style.css'

import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
)
