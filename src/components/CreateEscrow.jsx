import { useState, useEffect } from 'react'
import { useAccount, useBalance, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { useEscrows } from '../hooks/useEscrows'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { WalletButton } from './WalletButton'
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import addresses from '../contracts/addresses.json'

export function CreateEscrow({ onSuccess }) {
    const { isConnected, address } = useAccount()
    const publicClient = usePublicClient()
    const { createEscrow, getUserStats } = useEscrows()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState(1)
    const [contractId, setContractId] = useState(null)

    const [formData, setFormData] = useState({
        seller: '',
        amount: '',
        token: 'ETH',
        description: '',
        image_url: '', // New field
        title: '', // Added to match design, mapped to desc prefix
        deadline: '7',
        arbiter: '',
        arbiterType: 'admin', // admin | custom
    })

    const [sellerStats, setSellerStats] = useState({ completed: 0, loading: false })

    // Price and balance state
    const [prices, setPrices] = useState({ eth: 0, usdc: 1, usdt: 1 })
    const [tokenBalance, setTokenBalance] = useState(null)

    // Get ETH balance
    const { data: ethBalance } = useBalance({ address })

    // Get token address for selected token
    const getTokenAddress = (token) => {
        if (token === 'ETH') return null
        if (token === 'USDC') return addresses['8453']?.USDC || addresses.USDC
        if (token === 'USDT') return addresses['8453']?.USDT
        return null
    }

    // Fetch prices from CoinGecko
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether&vs_currencies=usd')
                const data = await res.json()
                setPrices({
                    eth: data.ethereum?.usd || 0,
                    usdc: data['usd-coin']?.usd || 1,
                    usdt: data.tether?.usd || 1
                })
            } catch (err) {
                console.warn('Failed to fetch prices:', err)
            }
        }
        fetchPrices()
        // Refresh every 60 seconds
        const interval = setInterval(fetchPrices, 60000)
        return () => clearInterval(interval)
    }, [])

    // Fetch token balance when token changes
    useEffect(() => {
        const fetchTokenBalance = async () => {
            const tokenAddr = getTokenAddress(formData.token)
            if (!tokenAddr || !address || !publicClient) {
                setTokenBalance(null)
                return
            }
            try {
                const balance = await publicClient.readContract({
                    address: tokenAddr,
                    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }],
                    functionName: 'balanceOf',
                    args: [address]
                })
                setTokenBalance(formatUnits(balance, 6)) // USDC/USDT are 6 decimals
            } catch (err) {
                console.warn('Failed to fetch token balance:', err)
                setTokenBalance(null)
            }
        }
        fetchTokenBalance()
    }, [formData.token, address, publicClient])

    // Calculate USD value
    const getUsdValue = () => {
        const amount = parseFloat(formData.amount) || 0
        if (formData.token === 'ETH') return (amount * prices.eth).toFixed(2)
        if (formData.token === 'USDC') return (amount * prices.usdc).toFixed(2)
        if (formData.token === 'USDT') return (amount * prices.usdt).toFixed(2)
        return '0.00'
    }

    // Check if user has enough balance
    const hasEnoughBalance = () => {
        if (!isConnected) return true // Skip check if not connected
        const amount = parseFloat(formData.amount) || 0
        if (amount <= 0) return true // Will be caught by validation

        if (formData.token === 'ETH') {
            const ethBal = parseFloat(ethBalance?.formatted || '0')
            return ethBal >= amount + 0.0001 // Reserve ~0.0001 ETH for gas
        } else {
            const bal = parseFloat(tokenBalance || '0')
            return bal >= amount
        }
    }

    // Check if user has enough ETH for gas
    const hasEnoughGas = () => {
        if (!isConnected) return true // Skip check if not connected
        const ethBal = parseFloat(ethBalance?.formatted || '0')
        return ethBal >= 0.0001 // Minimum ~0.0001 ETH for gas
    }

    // Debounced Trust Signal Lookup
    useEffect(() => {
        if (formData.seller.startsWith('0x') && formData.seller.length === 42) {
            setSellerStats(prev => ({ ...prev, loading: true }))
            const timer = setTimeout(async () => {
                const stats = await getUserStats(formData.seller)
                setSellerStats({ completed: stats.completed, loading: false })
            }, 800)
            return () => clearTimeout(timer)
        } else {
            setSellerStats({ completed: 0, loading: false })
        }
    }, [formData.seller, getUserStats])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    const handleNext = () => {
        if (step === 1) {
            if (!formData.title || !formData.amount) {
                setError('Please fill in title and amount')
                return
            }


            const amount = parseFloat(formData.amount)
            if (isNaN(amount) || amount <= 0) {
                setError('Please enter a valid amount greater than 0')
                return
            }

            // Decimal Precision Check
            const decimals = formData.token === 'ETH' ? 18 : 6
            const parts = formData.amount.split('.')
            if (parts.length > 1 && parts[1].length > decimals) {
                setError(`Amount has too many decimals. ${formData.token} supports up to ${decimals} decimals.`)
                return
            }

            if (!hasEnoughGas()) {
                setError('Insufficient ETH for gas fees. You need at least 0.0001 ETH.')
                return
            }

            if (!hasEnoughBalance()) {
                if (formData.token === 'ETH') {
                    setError(`Insufficient ETH balance. You have ${parseFloat(ethBalance?.formatted || 0).toFixed(4)} ETH.`)
                } else {
                    setError(`Insufficient ${formData.token} balance. You have ${parseFloat(tokenBalance || 0).toFixed(2)} ${formData.token}.`)
                }
                return
            }

            setStep(2)
            setError('')
        }
    }

    const handlePrev = () => {
        setStep(1)
        setError('')
    }

    const handleSubmit = async () => {
        setError('')

        // Validation
        if (!formData.seller || !formData.seller.startsWith('0x')) {
            setError('Please enter a valid seller wallet address')
            return
        }

        // Admin Arbiter from environment (configurable)
        const ADMIN_ARBITER = import.meta.env.VITE_ADMIN_ARBITER || "0xec4C55967878d9b3e03a7da39CEA05B5EDf1bDdE"
        const finalArbiter = ADMIN_ARBITER

        if (formData.seller.toLowerCase() === finalArbiter.toLowerCase()) {
            setError('The Seller cannot be the same as the Arbiter (Platform Admin). Please use a different Seller address (e.g., Account #1).')
            return
        }

        // Re-check balance before submission (needed because we skip check in Step 1 if disconnected)
        if (!hasEnoughBalance()) {
            if (formData.token === 'ETH') {
                setError(`Insufficient ETH balance. You need ${formData.amount} ETH + Gas.`)
            } else {
                setError(`Insufficient ${formData.token} balance. You need ${formData.amount} ${formData.token}.`)
            }
            return
        }

        setLoading(true)
        try {
            // Calculate deadline timestamp
            const deadlineDays = parseInt(formData.deadline) || 30
            const durationInSeconds = deadlineDays * 24 * 60 * 60

            const deadline = new Date()
            deadline.setDate(deadline.getDate() + deadlineDays)

            const fullDescription = `${formData.title}: ${formData.description}`

            const escrow = await createEscrow({
                seller: formData.seller,
                arbiter: finalArbiter,
                amount: parseFloat(formData.amount),
                token: formData.token,
                description: fullDescription,
                deliveryPeriod: durationInSeconds,
                acceptancePeriod: 3 * 24 * 60 * 60 // 3 days to accept
            })

            console.log("On-chain creation success, ID:", escrow)

            // Save to Supabase (only if we have a real ID)
            if (escrow !== undefined && typeof escrow === 'number' && supabase) {
                const { error: dbError } = await supabase
                    .from('escrows')
                    .insert([
                        {
                            contract_id: escrow, // Link to on-chain ID
                            buyer_address: address, // Map to DB column
                            seller_address: formData.seller, // Map to DB column
                            arbiter_address: finalArbiter, // Map to DB column
                            amount: parseFloat(formData.amount),
                            token: formData.token,
                            title: formData.title,
                            description: formData.description,
                            image_url: formData.image_url,
                            deadline: deadline.toISOString(),
                            state: 0 // AWAITING_ACCEPTANCE
                        }
                    ])

                if (dbError) {
                    console.error("Supabase Save Error:", dbError)
                } else {
                    console.log("Saved to Supabase!")
                }
            }

            if (escrow !== undefined) {
                setContractId(escrow)
                setSuccess(true)
                // setTimeout(() => {
                //     onSuccess?.()
                // }, 2000)
            }
        } catch (err) {
            console.error('Create escrow error:', err)
            if (err.message?.includes('exceeds the balance') || err.message?.includes('insufficient funds') || err.message?.includes('gas * price + value')) {
                setError('Insufficient funds to cover transaction + gas. Please top up your wallet.')
            } else {
                setError('Failed to create escrow. ' + (err.shortMessage || err.message || 'Please try again.'))
            }
        } finally {
            setLoading(false)
        }
    }



    if (success) {
        const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(`I just created a secure escrow deal on BasedTrust! 🛡️\n\nCheckout the deal: ${formData.title}`)}&embeds[]=${encodeURIComponent(`https://base-trust.vercel.app/share/${contractId || 'pending'}`)}`

        return (
            <div className="min-h-screen bg-background pt-8 pb-24">
                <main className="max-w-xl mx-auto px-4 sm:px-6">
                    <Card className="p-8 text-center space-y-6 border-green-500/20 bg-green-500/5">
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="size-8 text-green-600 dark:text-green-500" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-foreground">Transaction Created!</h2>
                            <p className="text-muted-foreground">
                                Your escrow smart contract has been deployed successfully.
                            </p>
                        </div>

                        <div className="p-4 bg-background rounded-lg border border-border text-left space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Deal ID</span>
                                <span className="font-mono">{contractId || 'Pending...'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount</span>
                                <span>{formData.amount} {formData.token}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                size="lg"
                                className="w-full gap-2 bg-[#855DCD] hover:bg-[#855DCD]/90 text-white"
                                onClick={() => window.open(shareUrl, '_blank')}
                            >
                                <img src="/icon.png" className="w-5 h-5 rounded-full bg-white p-0.5" alt="App Icon" />
                                Share to Feed
                            </Button>

                            <Button variant="outline" onClick={onSuccess} className="w-full">
                                Go to Dashboard
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12 safe-y">
                {/* Header */}
                <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-12">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create Onchain Escrow</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Secure peer-to-peer onchain transactions in seconds</p>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-between mb-8 sm:mb-12">
                    {[1, 2].map((num) => (
                        <div key={num} className="flex items-center flex-1">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${step >= num
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-muted-foreground'
                                    }`}
                            >
                                {num}
                            </div>
                            {num < 2 && (
                                <div
                                    className={`flex-1 h-1 mx-2 transition-colors ${step > num ? 'bg-primary' : 'bg-secondary'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <Card className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                    {/* Step 1: Transaction Details */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-foreground">Escrow Details</h2>
                                <p className="text-sm text-muted-foreground">Describe your crypto transaction</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Transaction Title</Label>
                                    <Input
                                        name="title"
                                        placeholder="e.g., UI Design Project, Vintage Watch"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="bg-secondary/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input
                                            type="number"
                                            name="amount"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            className="bg-secondary/50"
                                            min="0"
                                            step="any"
                                        />
                                        {formData.amount && parseFloat(formData.amount) > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                ≈ ${getUsdValue()} USD
                                            </p>
                                        )}
                                        {formData.token === 'ETH' && ethBalance && (
                                            <p className="text-xs text-muted-foreground">
                                                Balance: {parseFloat(ethBalance.formatted).toFixed(4)} ETH
                                            </p>
                                        )}
                                        {formData.token !== 'ETH' && tokenBalance !== null && (
                                            <p className="text-xs text-muted-foreground">
                                                Balance: {parseFloat(tokenBalance).toFixed(2)} {formData.token}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Token</Label>
                                        <div className="flex gap-2">
                                            <select
                                                name="token"
                                                value={formData.token}
                                                onChange={handleChange}
                                                className="w-full h-10 px-3 rounded-md border border-input bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="ETH">ETH (Base)</option>
                                                <option value="USDC">USDC (Base)</option>
                                                <option value="USDT">USDT (Base)</option>
                                            </select>

                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Duration (Days)</Label>
                                    <select
                                        name="deadline"
                                        value={formData.deadline}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="7">7 Days</option>
                                        <option value="14">14 Days</option>
                                        <option value="30">30 Days</option>
                                        <option value="60">60 Days</option>
                                        <option value="90">90 Days</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Image URL (Optional)</Label>
                                <Input
                                    name="image_url"
                                    placeholder="https://example.com/item.jpg"
                                    value={formData.image_url}
                                    onChange={handleChange}
                                    className="bg-secondary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Textarea
                                    name="description"
                                    placeholder="Add more details about deliverables or conditions..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="bg-secondary/50 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                    )}

                    {/* Step 2: Counterparty & Trust */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-foreground">Trust & Safety</h2>
                                <p className="text-sm text-muted-foreground">Verify your counterparty and choose an arbiter.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Seller Input with Trust Check */}
                                <div className="space-y-2">
                                    <Label>Seller Wallet Address</Label>
                                    <div className="relative">
                                        <Input
                                            name="seller"
                                            placeholder="0x..."
                                            value={formData.seller}
                                            onChange={handleChange}
                                            className="bg-secondary/50 font-mono pr-24"
                                        />
                                        {/* Real Trust Signal */}
                                        {formData.seller.length === 42 && (
                                            <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none animate-in fade-in">
                                                {sellerStats.loading ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                                ) : sellerStats.completed > 0 ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                        <span className="text-xs font-medium text-green-600">Verified</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                        <span className="text-xs font-medium text-slate-500">New</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {formData.seller.length === 42 && !sellerStats.loading && (
                                        <div className={`text-xs p-2 rounded-md border ${sellerStats.completed > 0 ? 'bg-green-500/10 border-green-500/20 text-green-700' : 'bg-secondary border-border text-muted-foreground'}`}>
                                            {sellerStats.completed > 0
                                                ? `✅ Trusted Seller: ${sellerStats.completed} successful deal${sellerStats.completed > 1 ? 's' : ''} on record.`
                                                : "ℹ️ First-time user: No previous deal history on BasedTrust."}
                                        </div>
                                    )}
                                </div>

                                {/* Arbiter: Fixed to Platform Admin */}
                                <div className="space-y-2">
                                    <Label>Arbiter</Label>
                                    <div className="p-3 bg-secondary/50 rounded-md border border-input text-sm text-foreground/80 flex items-center justify-between">
                                        <span>🛡️ BasedTrust Platform (Admin)</span>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Verified</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Platform Admin acts as the neutral third party for disputes.
                                    </p>
                                </div>

                                {/* Summary */}
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        Summary
                                    </h4>
                                    <div className="text-sm space-y-1 text-muted-foreground">
                                        <p>Sending <span className="font-mono text-foreground">{formData.amount} {formData.token}</span></p>
                                        <p>For <span className="text-foreground">{formData.title}</span></p>
                                        <p>Arbiter: <span className="text-foreground">BasedTrust Admin</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                            <AlertCircle className="size-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-border">
                        {step > 1 && (
                            <Button variant="outline" onClick={handlePrev} className="gap-2" disabled={loading}>
                                <ArrowLeft className="w-4 h-4" />
                                Previous
                            </Button>
                        )}
                        {step < 2 ? (
                            <Button onClick={handleNext} className="gap-2 ml-auto">
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            isConnected ? (
                                <Button onClick={handleSubmit} className="gap-2 ml-auto" disabled={loading}>
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Transaction
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <div className="ml-auto">
                                    <WalletButton />
                                </div>
                            )
                        )}
                    </div>
                </Card>
            </main>
        </div >
    )
}
