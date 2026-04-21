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
    const [copiedField, setCopiedField] = useState(null)

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
                            amount_usd: virtualCard.verified_amount_usdc || (virtualCard.amount_cents / 100).toFixed(6),
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

            // Step 4: Wait for Sui to index the transaction, then submit to backend
            setStatus('Waiting for blockchain confirmation...')
            console.log('Waiting for Sui RPC to index transaction...')

            // Retry logic — Sui testnet RPC needs time to index new transactions
            const MAX_RETRIES = 4
            const INITIAL_DELAY_MS = 3000 // 3 seconds initial wait
            let submitResponse = null
            let lastError = null

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                const delayMs = INITIAL_DELAY_MS + (attempt - 1) * 2000 // 3s, 5s, 7s, 9s
                console.log(`Attempt ${attempt}/${MAX_RETRIES}: waiting ${delayMs}ms...`)
                setStatus(`Confirming on-chain (attempt ${attempt}/${MAX_RETRIES})...`)

                await new Promise(resolve => setTimeout(resolve, delayMs))

                try {
                    submitResponse = await fetch(`${BACKEND_URL}/api/v1/payment/submit`, {
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

                    if (submitResponse.ok) {
                        console.log(`Transaction confirmed on attempt ${attempt}`)
                        break // Success — exit retry loop
                    }

                    // Check if it's a "transaction not found" error (worth retrying)
                    const errBody = await submitResponse.json().catch(() => ({}))
                    const errMsg = errBody.detail || ''
                    lastError = errMsg

                    if (errMsg.includes('Could not find the referenced transaction') && attempt < MAX_RETRIES) {
                        console.log(`Transaction not indexed yet, retrying...`)
                        submitResponse = null // Mark for retry
                        continue
                    }

                    // Non-retryable error
                    throw new Error(errMsg || 'Failed to create card')
                } catch (fetchErr) {
                    lastError = fetchErr.message
                    if (attempt === MAX_RETRIES) throw fetchErr
                    console.warn(`Attempt ${attempt} failed: ${fetchErr.message}`)
                    submitResponse = null
                }
            }

            if (!submitResponse || !submitResponse.ok) {
                throw new Error(lastError || 'Failed to verify transaction after multiple attempts')
            }

            setStatus('Creating virtual card...')
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
                            <div style={{ marginTop: '2rem' }}>
                                {/* ── Premium Card Visual ── */}
                                <div style={{
                                    perspective: '1000px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            maxWidth: '420px',
                                            aspectRatio: '1.586',
                                            margin: '0 auto',
                                            borderRadius: '16px',
                                            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)',
                                            padding: '28px 28px 24px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(74,222,128,0.08)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
                                            transform: 'rotateX(2deg)',
                                            transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'rotateX(0deg) scale(1.02)'
                                            e.currentTarget.style.boxShadow = '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(74,222,128,0.12)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'rotateX(2deg) scale(1)'
                                            e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(74,222,128,0.08)'
                                        }}
                                    >
                                        {/* Holographic shine overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
                                            pointerEvents: 'none',
                                        }} />

                                        {/* Card Top Row — Chip + Contactless + Visa */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {/* EMV Chip */}
                                                <div style={{
                                                    width: '45px', height: '34px',
                                                    borderRadius: '6px',
                                                    background: 'linear-gradient(135deg, #c9a84c 0%, #f0d78c 30%, #c9a84c 60%, #a88734 100%)',
                                                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.2)',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}>
                                                    {/* Chip lines */}
                                                    <div style={{ position: 'absolute', top: '8px', left: '4px', right: '4px', height: '1px', background: 'rgba(0,0,0,0.15)' }} />
                                                    <div style={{ position: 'absolute', top: '14px', left: '4px', right: '4px', height: '1px', background: 'rgba(0,0,0,0.15)' }} />
                                                    <div style={{ position: 'absolute', top: '20px', left: '4px', right: '4px', height: '1px', background: 'rgba(0,0,0,0.15)' }} />
                                                    <div style={{ position: 'absolute', top: '4px', bottom: '4px', left: '15px', width: '1px', background: 'rgba(0,0,0,0.1)' }} />
                                                    <div style={{ position: 'absolute', top: '4px', bottom: '4px', left: '30px', width: '1px', background: 'rgba(0,0,0,0.1)' }} />
                                                </div>
                                                {/* Contactless icon */}
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                                                    <path d="M12 18c3.31 0 6-2.69 6-6s-2.69-6-6-6" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                    <path d="M12 14c1.1 0 2-0.9 2-2s-0.9-2-2-2" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                    <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            {/* Visa Logo */}
                                            <div style={{ fontSize: '28px', fontWeight: 800, fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                                                VISA
                                            </div>
                                        </div>

                                        {/* Card Number */}
                                        <div
                                            style={{
                                                fontSize: '22px',
                                                fontWeight: 500,
                                                letterSpacing: '3px',
                                                color: '#fff',
                                                fontFamily: "'Courier New', 'Monaco', monospace",
                                                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                                transition: 'opacity 0.2s',
                                            }}
                                            onClick={() => {
                                                if (virtualCard.pan) {
                                                    navigator.clipboard.writeText(virtualCard.pan)
                                                    setCopiedField('pan')
                                                    setTimeout(() => setCopiedField(null), 1500)
                                                }
                                            }}
                                            title="Click to copy card number"
                                        >
                                            {copiedField === 'pan'
                                                ? '✓ Copied!'
                                                : virtualCard.pan
                                                    ? virtualCard.pan.replace(/(.{4})/g, '$1 ').trim()
                                                    : `•••• •••• •••• ${virtualCard.last_four}`
                                            }
                                        </div>

                                        {/* Card Bottom Row — Expiry, CVV, Amount */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div style={{ display: 'flex', gap: '24px' }}>
                                                {/* Expiry */}
                                                <div
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${String(virtualCard.exp_month).padStart(2, '0')}/${virtualCard.exp_year}`)
                                                        setCopiedField('exp')
                                                        setTimeout(() => setCopiedField(null), 1500)
                                                    }}
                                                    title="Click to copy expiry"
                                                >
                                                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '3px' }}>
                                                        VALID THRU
                                                    </div>
                                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: "monospace", letterSpacing: '1px' }}>
                                                        {copiedField === 'exp' ? '✓' : `${String(virtualCard.exp_month).padStart(2, '0')}/${String(virtualCard.exp_year).slice(-2)}`}
                                                    </div>
                                                </div>
                                                {/* CVV */}
                                                <div
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        if (virtualCard.cvv) {
                                                            navigator.clipboard.writeText(virtualCard.cvv)
                                                            setCopiedField('cvv')
                                                            setTimeout(() => setCopiedField(null), 1500)
                                                        }
                                                    }}
                                                    title="Click to copy CVV"
                                                >
                                                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '3px' }}>
                                                        CVV
                                                    </div>
                                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: "monospace", letterSpacing: '1px' }}>
                                                        {copiedField === 'cvv' ? '✓' : (virtualCard.cvv || '•••')}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Amount + Payzee */}
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80', letterSpacing: '-0.5px' }}>
                                                    {virtualCard.verified_amount_usdc
                                                        ? `$${virtualCard.verified_amount_usdc}`
                                                        : `$${(virtualCard.amount_cents / 100).toFixed(2)}`
                                                    }
                                                </div>
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginTop: '2px' }}>
                                                    PAYZEE
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Click to copy hint */}
                                <p style={{
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    color: '#555',
                                    marginBottom: '1rem',
                                }}>
                                    Click on card number, expiry, or CVV to copy
                                </p>

                                {/* Tip */}
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(74,222,128,0.06)',
                                    border: '1px solid rgba(74,222,128,0.15)',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    color: '#777',
                                    lineHeight: '1.5',
                                }}>
                                    💡 <strong style={{ color: '#999' }}>Tip:</strong> Use these details at any online checkout. For cardholder name, use <strong style={{ color: '#ccc' }}>Payzee User</strong>.
                                </div>

                                {paymentResult && (
                                    <div className="payment-complete" style={{ marginTop: '1rem' }}>
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

export default Dashboard
