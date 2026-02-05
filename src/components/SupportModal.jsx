import { useState, useRef } from 'react'
import { useSendTransaction, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { WalletButton } from './WalletButton'
import { X, Heart, MessageSquare, ExternalLink, Loader2 } from 'lucide-react'

// The Owner/Dev Address
const DONATION_ADDRESS = "0xec4C55967878d9b3e03a7da39CEA05B5EDf1bDdE"

export function SupportModal({ onClose }) {
    const { isConnected } = useAccount()
    const [amount, setAmount] = useState('0.005')
    const modalRef = useRef(null)

    const { data: hash, isPending, sendTransaction } = useSendTransaction()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    })

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose()
        }
    }

    const handleDonate = () => {
        if (!amount || isNaN(amount)) return
        if (import.meta.env.DEV) console.log("Initiating donation...", amount)
        try {
            sendTransaction({
                to: DONATION_ADDRESS,
                value: parseEther(amount.toString())
            })
        } catch (e) {
            console.error("Donation failed:", e)
            alert("Failed to open wallet. Please try again.")
        }
    }

    const handleFeedback = () => {
        window.location.href = "mailto:mayankgaming179@gmail.com"
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <Card
                ref={modalRef}
                className="w-full max-w-md bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-primary/20"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="BasedTrust" className="h-8 w-auto rounded-lg" />
                        <h2 className="text-lg font-bold">Support BasedTrust</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Donation Section */}
                    <div className="space-y-4">
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-foreground">Buy us a coffee ☕</h3>
                            <p className="text-sm text-muted-foreground">
                                Your support helps keep the smart contracts deployed and the platform running smooth.
                            </p>
                        </div>

                        {!isSuccess ? (
                            <div className="flex flex-col gap-3">
                                {isConnected ? (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">ETH</span>
                                            <Input
                                                type="number"
                                                step="0.001"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="pl-12"
                                                placeholder="0.01"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleDonate}
                                            disabled={isPending || isConfirming}
                                            className="bg-pink-600 hover:bg-pink-700 text-white min-w-[100px]"
                                        >
                                            {isPending || isConfirming ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Donate'
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex justify-center">
                                        <WalletButton />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-green-500/10 rounded-lg text-center text-green-600 text-sm font-medium animate-in fade-in">
                                Thank you for your generosity! 🎉
                            </div>
                        )}
                        {hash && <p className="text-xs text-center text-muted-foreground break-all">Tx: {hash}</p>}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    <div className="text-center space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold">Have Feedback?</h3>
                            <p className="text-sm text-muted-foreground">
                                Found a bug or have a feature request? Let us know directly.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleFeedback}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Send Feedback to Dev
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
