import { useState, useEffect } from 'react'
import { ConnectButton, useWallet } from '@suiet/wallet-kit'
import { SuiClient } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import './App.css'

// Use localhost for development, production URL for deployed version
const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://payzee-production.up.railway.app'
const API_KEY = 'sk_stellar_pay_dev_b03352ef1d68164c675023b82538ea3d1d1902f69bc408b7'

// Sui configuration
const NETWORK = 'testnet'
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'
const PACKAGE_ID = '0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69'
const USDC_TYPE = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC' // USDC on Sui testnet

function App() {
  // Use Suiet wallet kit
  const wallet = useWallet()
  
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [card, setCard] = useState(null)
  const [testingPayment, setTestingPayment] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [merchantName, setMerchantName] = useState('')
  const [merchantDomain, setMerchantDomain] = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [suiClient, setSuiClient] = useState(null)

  // Initialize Sui client
  useEffect(() => {
    const client = new SuiClient({ url: SUI_RPC_URL })
    setSuiClient(client)
  }, [])

  // Log wallet connection status
  useEffect(() => {
    if (wallet.connected) {
      console.log('Wallet connected:', wallet.name)
      console.log('Account address:', wallet.account?.address)
      setStatus(`Connected to ${wallet.name}`)
      setError('')
    } else {
      console.log('Wallet not connected')
    }
  }, [wallet.connected, wallet.name, wallet.account])

  // Get amount and merchant data from URL params (sent by extension)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const amountParam = params.get('amount')
    const merchantParam = params.get('merchant')
    const domainParam = params.get('domain')
    const originalAmountParam = params.get('originalAmount')
    
    if (amountParam) {
      setAmount(amountParam)
    }
    
    if (originalAmountParam) {
      setOriginalAmount(originalAmountParam)
      setStatus(`Converted ${originalAmountParam} to $${parseFloat(amountParam).toFixed(2)} USD`)
    } else if (merchantParam) {
      setStatus(`Payment for ${merchantParam}`)
    }
    
    if (merchantParam) {
      setMerchantName(merchantParam)
    }
    
    if (domainParam) {
      setMerchantDomain(domainParam)
    }
  }, [])

  // Listen for messages from extension
  useEffect(() => {
    // Listen for confirm transaction message from extension
    const handleMessage = (event) => {
      console.log('Dashboard: Message received from:', event.origin);
      console.log('Dashboard: Message data:', event.data);
      
      if (event.data.type === 'SUI_PAY_CONFIRM_TRANSACTION') {
        console.log('Dashboard: Confirm transaction requested, card:', card);
        if (card && !testingPayment) {
          console.log('Dashboard: Triggering payment...');
          handleTestPayment();
        } else if (!card) {
          console.error('Dashboard: No card available');
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [card, testingPayment]);

  const handleTestPayment = async () => {
    if (!card) {
      setError('No card available')
      return
    }

    setTestingPayment(true)
    setStatus('Processing payment...')
    setError('')

    try {
      console.log('Initiating test payment for card:', card.id)

      // Call backend to authorize and settle payment
      const response = await fetch(`${BACKEND_URL}/api/v1/cards/test-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          pan: card.pan,
          amount_cents: card.amount_cents
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Payment failed')
      }

      const result = await response.json()
      console.log('Test payment result:', result)

      setPaymentResult(result)
      setStatus('Payment successful!')
      
      // Notify extension that payment is complete
      if (window.opener) {
        window.opener.postMessage({
          type: 'PAYMENT_COMPLETE',
          success: true,
          card: {
            last_four: card.last_four,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            amount_usd: (card.amount_cents / 100).toFixed(2),
            original_amount: originalAmount || null
          }
        }, '*')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError(`Payment failed: ${err.message}`)
      setStatus('')
      
      // Notify extension of failure
      if (window.opener) {
        window.opener.postMessage({
          type: 'PAYMENT_ERROR',
          error: err.message
        }, '*')
      }
    } finally {
      setTestingPayment(false)
    }
  }

  const handlePayment = async () => {
    console.log('=== Payment initiated ===')
    console.log('Wallet connected:', wallet.connected)
    console.log('Wallet account:', wallet.account?.address)
    console.log('Amount:', amount)
    
    if (!amount || !wallet.connected) {
      const errorMsg = 'Please connect wallet and enter amount'
      console.error(errorMsg)
      setError(errorMsg)
      return
    }

    setProcessing(true)
    setStatus('Initiating payment...')
    setError('')

    try {
      const amountFloat = parseFloat(amount)
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error('Invalid amount')
      }

      console.log('Step 1: Initiating payment session...')
      console.log('Backend URL:', BACKEND_URL)
      
      // Step 1: Initiate payment session
      const sessionResponse = await fetch(`${BACKEND_URL}/api/v1/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          amount: amountFloat,
          user_public_key: wallet.account?.address,
          merchant_name: merchantName || 'Merchant'
        })
      })

      console.log('Session response status:', sessionResponse.status)
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text()
        console.error('Session error:', errorText)
        throw new Error(`Failed to initiate payment: ${sessionResponse.status}`)
      }

      const session = await sessionResponse.json()
      console.log('Payment session created:', session)

      setStatus('Building transaction...')
      console.log('Step 2: Building Sui transaction...')

      // Step 2: Build Sui transaction for deposit
      const amountCents = Math.ceil(amountFloat * 100)
      const amountMist = Math.ceil(amountFloat * 1_000_000) // USDC has 6 decimals
      
      console.log('Amount in USDC base units:', amountMist)
      console.log('Getting USDC coins from wallet...')
      
      // Query user's USDC coins
      const { data: coins } = await suiClient.getCoins({
        owner: wallet.account?.address,
        coinType: USDC_TYPE,
      })
      
      console.log('USDC coins found:', coins?.length || 0)
      
      if (!coins || coins.length === 0) {
        throw new Error('No USDC coins found in wallet. Please get USDC from a faucet or bridge first.')
      }
      
      // Calculate total USDC balance
      const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0))
      console.log('Total USDC balance:', totalBalance.toString())
      
      if (totalBalance < BigInt(amountMist)) {
        throw new Error(`Insufficient USDC balance. Have: ${totalBalance.toString()}, Need: ${amountMist}`)
      }
      
      const txb = new TransactionBlock()
      
      // Use the first USDC coin and merge others if needed
      let primaryCoin = txb.object(coins[0].coinObjectId)
      
      // Merge additional coins if we have multiple
      if (coins.length > 1) {
        const otherCoins = coins.slice(1).map(coin => txb.object(coin.coinObjectId))
        txb.mergeCoins(primaryCoin, otherCoins)
      }
      
      // Split the exact amount needed
      const [paymentCoin] = txb.splitCoins(primaryCoin, [txb.pure(amountMist)])
      
      console.log('Building moveCall to deposit...')
      
      // Call deposit function
      txb.moveCall({
        target: `${PACKAGE_ID}::escrow::deposit`,
        arguments: [
          paymentCoin,
          txb.pure(session.merchant_address || wallet.account?.address), // merchant address
          txb.pure(session.session_id), // card_id
        ],
        typeArguments: [USDC_TYPE],
      })

      setStatus('Requesting signature...')
      console.log('Step 3: Requesting wallet signature...')
      console.log('Wallet name:', wallet.name)

      // Step 3: Sign transaction with wallet using Suiet kit
      const signedTx = await wallet.signAndExecuteTransaction({
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })

      console.log('Transaction signed and executed:', signedTx)

      setStatus('Creating virtual card...')

      // Step 4: Submit transaction and get card
      const submitResponse = await fetch(`${BACKEND_URL}/api/v1/payment/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          session_id: session.session_id,
          signed_transaction: signedTx.digest,
          escrow_id: signedTx.effects?.created?.[0]?.reference?.objectId || ''
        })
      })

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to create card')
      }

      const cardData = await submitResponse.json()
      console.log('Card created:', cardData)

      setCard(cardData)
      setStatus('Card created successfully!')

      // Notify extension with card details
      if (window.opener) {
        window.opener.postMessage({
          type: 'CARD_READY',
          card: {
            pan: cardData.pan,
            cvv: cardData.cvv,
            exp_month: cardData.exp_month,
            exp_year: cardData.exp_year,
            last_four: cardData.last_four
          }
        }, '*')
      }

    } catch (err) {
      console.error('Payment error:', err)
      setError(`Payment failed: ${err.message}`)
      setStatus('')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>💳 Payzee</h1>
          <p className="tagline">Pay with USDC on Sui</p>
        </div>

        {merchantName && (
          <div className="merchant-info">
            <h3>Payment to: {merchantName}</h3>
            {merchantDomain && <p className="domain">{merchantDomain}</p>}
          </div>
        )}

        {!wallet.connected ? (
          <div className="connect-section">
            <ConnectButton>Connect Wallet</ConnectButton>
            {error && <div className="error">{error}</div>}
            <p className="hint">Supports Slush, Suiet, Sui Wallet and more</p>
          </div>
        ) : (
          <div className="payment-section">
            <div className="wallet-info">
              <div className="connected-badge">✓ Connected to {wallet.name}</div>
              <div className="address">
                {wallet.account?.address?.substring(0, 6)}...{wallet.account?.address?.substring(wallet.account?.address.length - 4)}
              </div>
            </div>

            <div className="amount-input">
              <label htmlFor="amount">Amount (USD)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={processing || card !== null}
              />
            </div>

            {!card && (
              <button
                onClick={handlePayment}
                disabled={processing || !amount}
                className="pay-button"
              >
                {processing ? 'Processing...' : 'Pay with USDC'}
              </button>
            )}

            {card && (
              <div className="card-created">
                <h3>✅ Virtual Card Created</h3>
                <div className="card-info">
                  <p><strong>Card Number:</strong> •••• {card.last_four}</p>
                  <p><strong>Expires:</strong> {card.exp_month}/{card.exp_year}</p>
                  <p><strong>Amount:</strong> ${(card.amount_cents / 100).toFixed(2)}</p>
                </div>
                <p className="card-note">
                  Card details have been sent to the merchant page. 
                  Click <strong>Confirm Transaction</strong> to complete payment.
                </p>

                {paymentResult && (
                  <div className="payment-complete">
                    <h3>🎉 Payment Complete!</h3>
                    <p>Transaction successful</p>
                  </div>
                )}
              </div>
            )}

            {status && <div className="status">{status}</div>}
            {error && <div className="error">{error}</div>}
          </div>
        )}

        <div className="footer">
          <p>Powered by Sui • Secure escrow via smart contracts</p>
        </div>
      </div>
    </div>
  )
}

export default App
