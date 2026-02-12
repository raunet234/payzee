/**
 * Payzee Dashboard Application
 *
 * Main payment interface for the crypto-to-fiat payment bridge.
 * Handles wallet connection, USDC deposits to escrow, and virtual card creation.
 */
import { useState, useEffect } from 'react'
import { ConnectButton, useWallet } from '@suiet/wallet-kit'
import { SuiClient } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import "../App.css";

// =============================================================================
// Configuration
// =============================================================================

// Backend API configuration
const BACKEND_URL = import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://payzee-production.up.railway.app'
const API_KEY = 'sk_stellar_pay_dev_b03352ef1d68164c675023b82538ea3d1d1902f69bc408b7'

// Sui blockchain configuration
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'
const ESCROW_PACKAGE_ID = '0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69'
const USDC_COIN_TYPE = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'

// =============================================================================
// Main App Component
// =============================================================================

// =============================================================================
// Main App Component
// =============================================================================

function Dashboard() {
    const wallet = useWallet()

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    // Payment form state
    const [amount, setAmount] = useState('')
    const [merchantName, setMerchantName] = useState('')
    const [merchantDomain, setMerchantDomain] = useState('')
    const [originalAmount, setOriginalAmount] = useState('')

    // UI state
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isTestingPayment, setIsTestingPayment] = useState(false)

    // Data state
    const [virtualCard, setVirtualCard] = useState(null)
    const [paymentResult, setPaymentResult] = useState(null)
    const [suiClient, setSuiClient] = useState(null)

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------

    // Initialize Sui client on mount
    useEffect(() => {
        const client = new SuiClient({ url: SUI_RPC_URL })
        setSuiClient(client)
    }, [])

    // Handle wallet connection status changes
    useEffect(() => {
        if (wallet.connected) {
            console.log('Wallet connected:', wallet.name)
            console.log('Account address:', wallet.account?.address)
            setStatus(`Connected to ${wallet.name}`)
            setError('')
        } else {
            console.log('Wallet not connected')
            // Clear payment state when wallet disconnects
            setAmount('')
            setVirtualCard(null)
            setPaymentResult(null)
            setStatus('')
            setError('')
        }
    }, [wallet.connected, wallet.name, wallet.account])

    // Parse URL parameters from browser extension
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlAmount = params.get('amount')
        const urlMerchant = params.get('merchant')
        const urlDomain = params.get('domain')
        const urlOriginalAmount = params.get('originalAmount')

        if (urlAmount) {
            setAmount(urlAmount)
        }

        if (urlOriginalAmount) {
            setOriginalAmount(urlOriginalAmount)
            setStatus(`Converted ${urlOriginalAmount} to $${parseFloat(urlAmount).toFixed(2)} USD`)
        } else if (urlMerchant) {
            setStatus(`Payment for ${urlMerchant}`)
        }

        if (urlMerchant) {
            setMerchantName(urlMerchant)
        }

        if (urlDomain) {
            setMerchantDomain(urlDomain)
        }
    }, [])

    // Listen for messages from browser extension
    useEffect(() => {
        const handleExtensionMessage = (event) => {
            console.log('Dashboard: Message received from:', event.origin)
            console.log('Dashboard: Message data:', event.data)

            if (event.data.type === 'SUI_PAY_CONFIRM_TRANSACTION') {
                console.log('Dashboard: Confirm transaction requested, card:', virtualCard)
                if (virtualCard && !isTestingPayment) {
                    console.log('Dashboard: Triggering payment...')
                    handleTestPayment()
                } else if (!virtualCard) {
                    console.error('Dashboard: No card available')
                }
            }
        }

        window.addEventListener('message', handleExtensionMessage)
        return () => window.removeEventListener('message', handleExtensionMessage)
    }, [virtualCard, isTestingPayment])

    // ---------------------------------------------------------------------------
    // Event Handlers
    // ---------------------------------------------------------------------------

    /**
     * Execute a test payment using the created virtual card.
     * Simulates authorization and settlement in Lithic sandbox.
     */
    const handleTestPayment = async () => {
        if (!virtualCard) {
            setError('No card available')
            return
        }

        setIsTestingPayment(true)
        setStatus('Processing payment...')
        setError('')

        try {
            console.log('Initiating test payment for card:', virtualCard.id)

            const response = await fetch(`${BACKEND_URL}/api/v1/cards/test-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify({
                    pan: virtualCard.pan,
                    amount_cents: virtualCard.amount_cents,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Payment failed')
            }

            const result = await response.json()
            console.log('Test payment result:', result)

            setPaymentResult(result)
            setStatus('Payment successful!')

            // Notify browser extension that payment is complete
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: 'PAYMENT_COMPLETE',
                        success: true,
                        card: {
                            last_four: virtualCard.last_four,
                            exp_month: virtualCard.exp_month,
                            exp_year: virtualCard.exp_year,
                            amount_usd: (virtualCard.amount_cents / 100).toFixed(2),
                            original_amount: originalAmount || null,
                        },
                    },
                    '*'
                )
            }
        } catch (err) {
            console.error('Payment error:', err)
            setError(`Payment failed: ${err.message}`)
            setStatus('')

            // Notify browser extension of failure
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: 'PAYMENT_ERROR',
                        error: err.message,
                    },
                    '*'
                )
            }
        } finally {
            setIsTestingPayment(false)
        }
    }

    /**
     * Main payment handler - initiates the full payment flow.
     * 1. Creates payment session with backend
     * 2. Builds and signs Sui transaction
     * 3. Submits to backend to create virtual card
     */

    /**
     * Main payment handler - initiates the full payment flow.
     * 1. Creates payment session with backend
     * 2. Builds and signs Sui transaction
     * 3. Submits to backend to create virtual card
     */
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

        setIsProcessing(true)
        setStatus('Initiating payment...')
        setError('')

        try {
            const paymentAmount = parseFloat(amount)
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new Error('Invalid amount')
            }

            // Step 1: Create payment session with backend
            console.log('Step 1: Initiating payment session...')
            console.log('Backend URL:', BACKEND_URL)

            const sessionResponse = await fetch(`${BACKEND_URL}/api/v1/payment/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify({
                    amount: paymentAmount,
                    user_public_key: wallet.account?.address,
                    merchant_name: merchantName || 'Merchant',
                }),
            })

            console.log('Session response status:', sessionResponse.status)

            if (!sessionResponse.ok) {
                const errorText = await sessionResponse.text()
                console.error('Session error:', errorText)
                throw new Error(`Failed to initiate payment: ${sessionResponse.status}`)
            }

            const session = await sessionResponse.json()
            console.log('Payment session created:', session)

            // Step 2: Build Sui transaction for escrow deposit
            setStatus('Building transaction...')
            console.log('Step 2: Building Sui transaction...')

            const amountInCents = Math.ceil(paymentAmount * 100)
            const amountInBaseUnits = Math.ceil(paymentAmount * 1_000_000) // USDC has 6 decimals

            console.log('Amount in USDC base units:', amountInBaseUnits)
            console.log('Getting USDC coins from wallet...')

            // Query user's USDC coins
            const { data: userCoins } = await suiClient.getCoins({
                owner: wallet.account?.address,
                coinType: USDC_COIN_TYPE,
            })

            console.log('USDC coins found:', userCoins?.length || 0)

            if (!userCoins || userCoins.length === 0) {
                throw new Error(
                    'No USDC coins found in wallet. Please get USDC from a faucet or bridge first.'
                )
            }

            // Calculate total USDC balance
            const totalBalance = userCoins.reduce(
                (sum, coin) => sum + BigInt(coin.balance),
                BigInt(0)
            )
            console.log('Total USDC balance:', totalBalance.toString())

            if (totalBalance < BigInt(amountInBaseUnits)) {
                throw new Error(
                    `Insufficient USDC balance. Have: ${totalBalance.toString()}, Need: ${amountInBaseUnits}`
                )
            }

            // Build transaction block
            const txb = new TransactionBlock()

            // Use the first USDC coin and merge others if needed
            let primaryCoin = txb.object(userCoins[0].coinObjectId)

            if (userCoins.length > 1) {
                const additionalCoins = userCoins.slice(1).map((coin) => txb.object(coin.coinObjectId))
                txb.mergeCoins(primaryCoin, additionalCoins)
            }

            // Split the exact amount needed for payment
            const [paymentCoin] = txb.splitCoins(primaryCoin, [txb.pure(amountInBaseUnits)])

            console.log('Building moveCall to deposit...')

            // Call escrow deposit function
            txb.moveCall({
                target: `${ESCROW_PACKAGE_ID}::escrow::deposit`,
                arguments: [
                    paymentCoin,
                    txb.pure(session.merchant_address || wallet.account?.address),
                    txb.pure(session.session_id),
                ],
                typeArguments: [USDC_COIN_TYPE],
            })

            // Step 3: Sign and execute transaction
            setStatus('Requesting signature...')
            console.log('Step 3: Requesting wallet signature...')
            console.log('Wallet name:', wallet.name)

            const signedTx = await wallet.signAndExecuteTransaction({
                transaction: txb,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            })

            console.log('Transaction signed and executed:', signedTx)

            // Step 4: Submit to backend and create virtual card
            setStatus('Creating virtual card...')

            const submitResponse = await fetch(`${BACKEND_URL}/api/v1/payment/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify({
                    session_id: session.session_id,
                    signed_transaction: signedTx.digest,
                    escrow_id: signedTx.effects?.created?.[0]?.reference?.objectId || '',
                }),
            })

            if (!submitResponse.ok) {
                const errorData = await submitResponse.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Failed to create card')
            }

            const cardData = await submitResponse.json()
            console.log('Card created:', cardData)

            setVirtualCard(cardData)
            setStatus('Card created successfully!')

            // Notify browser extension with card details
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: 'CARD_READY',
                        card: {
                            pan: cardData.pan,
                            cvv: cardData.cvv,
                            exp_month: cardData.exp_month,
                            exp_year: cardData.exp_year,
                            last_four: cardData.last_four,
                        },
                    },
                    '*'
                )
            }
        } catch (err) {
            console.error('Payment error:', err)
            setError(`Payment failed: ${err.message}`)
            setStatus('')
        } finally {
            setIsProcessing(false)
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div className="connected-badge">✓ Connected to {wallet.name}</div>
                                <button
                                    onClick={() => wallet.disconnect()}
                                    className="disconnect-button"
                                >
                                    Disconnect
                                </button>
                            </div>
                            <div className="address">
                                {wallet.account?.address?.substring(0, 6)}...
                                {wallet.account?.address?.substring(wallet.account?.address.length - 4)}
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
                                disabled={isProcessing || virtualCard !== null}
                            />
                        </div>

                        {!virtualCard && (
                            <button
                                onClick={handlePayment}
                                disabled={isProcessing || !amount}
                                className="pay-button"
                            >
                                {isProcessing ? 'Processing...' : 'Pay with USDC'}
                            </button>
                        )}

                        {virtualCard && (
                            <div className="card-created">
                                <h3>✅ Virtual Card Created</h3>
                                <div className="card-info">
                                    <p>
                                        <strong>Card Number:</strong> •••• {virtualCard.last_four}
                                    </p>
                                    <p>
                                        <strong>Expires:</strong> {virtualCard.exp_month}/{virtualCard.exp_year}
                                    </p>
                                    <p>
                                        <strong>Amount:</strong> ${(virtualCard.amount_cents / 100).toFixed(2)}
                                    </p>
                                </div>

                                {/* Full Card Details Section */}
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '2px solid #e9ecef' }}>
                                    <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>💳 Card Details for Checkout</h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {/* Card Number */}
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                                CARD NUMBER
                                            </label>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <code style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    background: 'white',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1rem',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {virtualCard.pan || `•••• •••• •••• ${virtualCard.last_four}`}
                                                </code>
                                                {virtualCard.pan && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(virtualCard.pan)
                                                            alert('Card number copied!')
                                                        }}
                                                        style={{
                                                            padding: '0.6rem 1rem',
                                                            background: '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Copy
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expiration and CVV Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            {/* Expiration */}
                                            <div>
                                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                                    EXPIRATION
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <code style={{
                                                        flex: 1,
                                                        padding: '0.75rem',
                                                        background: 'white',
                                                        border: '1px solid #dee2e6',
                                                        borderRadius: '4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '1rem'
                                                    }}>
                                                        {String(virtualCard.exp_month).padStart(2, '0')}/{virtualCard.exp_year}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${String(virtualCard.exp_month).padStart(2, '0')}/${virtualCard.exp_year}`)
                                                            alert('Expiration copied!')
                                                        }}
                                                        style={{
                                                            padding: '0.6rem 1rem',
                                                            background: '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </div>

                                            {/* CVV */}
                                            <div>
                                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                                    CVV
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <code style={{
                                                        flex: 1,
                                                        padding: '0.75rem',
                                                        background: 'white',
                                                        border: '1px solid #dee2e6',
                                                        borderRadius: '4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '1rem'
                                                    }}>
                                                        {virtualCard.cvv || '•••'}
                                                    </code>
                                                    {virtualCard.cvv && (
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(virtualCard.cvv)
                                                                alert('CVV copied!')
                                                            }}
                                                            style={{
                                                                padding: '0.6rem 1rem',
                                                                background: '#28a745',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            Copy
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{
                                        marginTop: '1rem',
                                        fontSize: '0.85rem',
                                        color: '#666',
                                        padding: '0.75rem',
                                        background: '#fff3cd',
                                        border: '1px solid #ffc107',
                                        borderRadius: '4px'
                                    }}>
                                        💡 <strong>Tip:</strong> Use these details at any online checkout. For cardholder name, use "Payzee User" or your name.
                                    </p>
                                </div>

                                <p className="card-note">
                                    Card details have been sent to the merchant page. Click{' '}
                                    <strong>Confirm Transaction</strong> to complete payment.
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

                <div className="footer  text-center">
                    <p>Powered by Sui • Secure escrow via smart contracts</p>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
