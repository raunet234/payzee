import { useEffect } from 'react'
import { ConnectButton, useWallet } from '@suiet/wallet-kit'
import { useNavigate } from 'react-router-dom'

function Landing() {
    const wallet = useWallet()
    const navigate = useNavigate()

    // Auto-redirect to app after wallet connect
    useEffect(() => {
        if (wallet.connected) {
            console.log('Wallet connected, redirecting to dashboard...')
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/app')
            }, 500)
        }
    }, [wallet.connected, navigate])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
            {/* ================= HERO ================= */}
            <section className="max-w-6xl mx-auto px-6 pt-24 text-center">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                    Pay anywhere online <br />
                    <span className="text-emerald-400">using crypto</span>
                </h1>

                <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
                    Payzee lets you spend USDC on Sui at any online checkout by instantly
                    converting crypto into virtual cards.
                </p>

                <div className="mt-10 flex flex-col items-center gap-4">
                    <ConnectButton className="scale-110" />

                    {wallet.connected && (
                        <button
                            onClick={() => navigate('/app')}
                            className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors"
                        >
                            Enter App →
                        </button>
                    )}
                </div>

                <p className="mt-4 text-sm text-slate-400">
                    No merchant integration • Non-custodial • Secure escrow
                </p>
            </section>

            {/* ================= HOW IT WORKS ================= */}
            <section className="max-w-6xl mx-auto px-6 mt-28">
                <h2 className="text-3xl font-semibold text-center mb-14">
                    How Payzee works
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-2">1. Deposit USDC</h3>
                        <p className="text-slate-400">
                            Connect your Sui wallet and deposit USDC into a secure escrow smart
                            contract.
                        </p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-2">2. Card is created</h3>
                        <p className="text-slate-400">
                            Payzee converts your crypto and creates a virtual card for the
                            exact amount.
                        </p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-2">3. Pay anywhere</h3>
                        <p className="text-slate-400">
                            Use the card at any online checkout — merchants never touch crypto.
                        </p>
                    </div>
                </div>
            </section>

            {/* ================= TRUST ================= */}
            <section className="max-w-6xl mx-auto px-6 mt-28 text-center">
                <h2 className="text-3xl font-semibold mb-10">
                    Built for trust & scale
                </h2>

                <div className="grid md:grid-cols-4 gap-6 text-sm">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                        <p className="font-semibold">Sui Blockchain</p>
                        <p className="text-slate-400 mt-1">
                            Fast, low-latency smart contracts
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                        <p className="font-semibold">USDC</p>
                        <p className="text-slate-400 mt-1">
                            Stable, widely accepted digital dollar
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                        <p className="font-semibold">Smart-contract escrow</p>
                        <p className="text-slate-400 mt-1">
                            Funds remain transparent and secure
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                        <p className="font-semibold">Virtual cards</p>
                        <p className="text-slate-400 mt-1">
                            Works with existing Web2 payments
                        </p>
                    </div>
                </div>
            </section>

            {/* ================= FINAL CTA ================= */}
            <section className="max-w-6xl mx-auto px-6 mt-32 mb-20 text-center">
                <h2 className="text-3xl font-semibold mb-6">
                    Ready to pay with crypto anywhere?
                </h2>

                <div className="flex justify-center">
                    <ConnectButton />
                </div>

                <p className="mt-4 text-sm text-slate-400">
                    You stay in control of your funds
                </p>
            </section>

            {/* ================= FOOTER ================= */}
            <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
                Powered by Sui • Payzee
            </footer>
        </div>
    )
}

export default Landing
