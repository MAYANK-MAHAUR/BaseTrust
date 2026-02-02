import { useRef } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { ChatBox } from './ChatBox'
import { X, CheckCircle2, AlertCircle, ShieldCheck, Share2 } from 'lucide-react'
import { EscrowState } from '../hooks/useEscrows'

export function DealDetailsModal({ escrow, currentUser, onClose, onUpdateState }) {
    if (!escrow) return null

    const modalRef = useRef(null)

    // Close on backdrop click
    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose()
        }
    }

    const getStatusLabel = (state) => {
        switch (state) {
            case EscrowState.AWAITING_ACCEPTANCE: return 'Pending Accept'
            case EscrowState.AWAITING_DELIVERY: return 'In Progress'
            case EscrowState.COMPLETED: return 'Completed'
            case EscrowState.REFUNDED: return 'Refunded'
            case EscrowState.DISPUTED: return 'Disputed'
            default: return 'Unknown'
        }
    }

    const getStatusVariant = (state) => {
        switch (state) {
            case EscrowState.COMPLETED: return 'default' // black/white
            case EscrowState.REFUNDED: return 'destructive' // red
            case EscrowState.DISPUTED: return 'destructive' // red
            default: return 'secondary' // gray
        }
    }

    const isSeller = currentUser && escrow.seller?.toLowerCase() === currentUser.toLowerCase()
    const isBuyer = currentUser && escrow.buyer?.toLowerCase() === currentUser.toLowerCase()
    const isArbiter = currentUser && escrow.arbiter?.toLowerCase() === currentUser.toLowerCase()
    const isParty = isSeller || isBuyer || isArbiter

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="bg-background w-full max-w-4xl max-h-[100dvh] sm:max-h-[90vh] rounded-none sm:rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 safe-y"
            >
                {/* Left Side: Deal Details (Image + Info) */}
                <div className="md:w-1/2 p-0 flex flex-col bg-muted/30 md:border-r border-border overflow-y-auto max-h-[40vh] md:max-h-none">
                    {/* Header Image */}
                    <div className="relative w-full h-32 sm:h-48 md:h-64 bg-secondary shrink-0">
                        {escrow.image_url ? (
                            <img
                                src={escrow.image_url}
                                alt={escrow.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No Image Provided
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 left-4 bg-background/50 hover:bg-background/80 md:hidden"
                            onClick={onClose}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Title & Status */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex gap-2">
                                    <Badge variant={getStatusVariant(escrow.state)} className="text-xs px-2 py-0.5">
                                        {getStatusLabel(escrow.state)}
                                    </Badge>
                                    {escrow.deadline > 0 && (
                                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed">
                                            Expires: {new Date(escrow.deadline).toLocaleDateString()}
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">ID: {escrow.contract_id || escrow.id}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground leading-tight">
                                {escrow.title || "Untitled Transaction"}
                            </h2>
                            <p className="text-2xl font-medium text-primary mt-2">
                                {escrow.amount} <span className="text-sm text-foreground/70">{escrow.token}</span>
                            </p>
                        </div>

                        {/* Description */}
                        {escrow.description && (
                            <div className="prose prose-sm dark:prose-invert">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</h3>
                                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                    {escrow.description}
                                </p>
                            </div>
                        )}

                        {/* Participants */}
                        <div className="space-y-3 pt-4 border-t border-border">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Participants</h3>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">B</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Buyer</p>
                                    <p className="text-xs text-muted-foreground font-mono">{escrow.buyer}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-xs font-bold">S</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Seller</p>
                                    <p className="text-xs text-muted-foreground font-mono">{escrow.seller}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Arbiter</p>
                                    <p className="text-xs text-muted-foreground font-mono">{escrow.arbiter}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Chat & Actions */}
                <div className="md:w-1/2 flex flex-col flex-1 md:h-auto bg-background min-h-0">
                    {/* Header Actions (Desktop) */}
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-semibold text-sm">Agreement & Chat</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="hidden md:flex">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Chat Component */}
                    <div className="flex-1 overflow-hidden relative">
                        <ChatBox
                            supabaseId={escrow.supabaseId}
                            contractId={escrow.contract_id || escrow.id}
                            currentUser={currentUser}
                            className="h-full border-0 rounded-none"
                        />
                    </div>

                    {/* Action Section */}
                    <div className="p-4 border-t border-border bg-muted/10 space-y-4 shrink-0 overflow-y-auto">

                        {!isParty && (
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-center space-y-3">
                                <p className="text-sm text-muted-foreground italic">Viewing as public observer. <br /> Trust is verified on Base.</p>
                                <div className="flex justify-center">
                                    <ShieldCheck className="w-8 h-8 text-primary shadow-sm" />
                                </div>
                            </div>
                        )}

                        {isParty && (
                            <>
                                {/* Core State Actions */}
                                {isBuyer && escrow.state === EscrowState.AWAITING_ACCEPTANCE && (
                                    <div className="flex gap-2">
                                        <Button variant="destructive" className="flex-1" onClick={() => onUpdateState(escrow.id, EscrowState.REFUNDED)}>
                                            Cancel Deal & Refund
                                        </Button>
                                    </div>
                                )}

                                {isBuyer && (escrow.state === EscrowState.AWAITING_DELIVERY || escrow.state === EscrowState.DELIVERED) && (
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onUpdateState(escrow.id, EscrowState.COMPLETED)}>
                                            Release Funds
                                        </Button>
                                        <Button variant="outline" className="flex-1" onClick={() => onUpdateState(escrow.id, EscrowState.DISPUTED)}>
                                            Dispute
                                        </Button>
                                    </div>
                                )}

                                {isSeller && escrow.state === EscrowState.AWAITING_ACCEPTANCE && (
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onUpdateState(escrow.id, EscrowState.AWAITING_DELIVERY)}>
                                            Accept Deal
                                        </Button>
                                        <Button className="flex-1" variant="destructive" onClick={() => onUpdateState(escrow.id, EscrowState.REFUNDED)}>
                                            Refuse
                                        </Button>
                                    </div>
                                )}

                                {isArbiter && escrow.state === EscrowState.DISPUTED && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded border border-red-200 text-xs font-bold uppercase tracking-tighter justify-center">
                                            <AlertCircle className="w-4 h-4" />
                                            Arbiter Ruling Required
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="flex-1" onClick={() => onUpdateState(escrow.id, EscrowState.COMPLETED)}>
                                                Pay Seller
                                            </Button>
                                            <Button variant="destructive" className="flex-1" onClick={() => onUpdateState(escrow.id, EscrowState.REFUNDED)}>
                                                Refund Buyer
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Seller: Mark Delivered */}
                                {isSeller && escrow.state === EscrowState.AWAITING_DELIVERY && (
                                    <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase text-primary font-bold">Proof of Delivery</label>
                                            <input
                                                id="proofLink"
                                                placeholder="Link or Note..."
                                                className="w-full bg-background border border-primary/20 rounded px-2 py-1 text-sm outline-none"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full bg-primary"
                                            onClick={() => {
                                                const proof = document.getElementById('proofLink').value
                                                onUpdateState(escrow.id, EscrowState.DELIVERED, proof)
                                            }}
                                        >
                                            🚀 Ship & Mark Delivered
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Public/Universal Feedback */}
                        {escrow.state === EscrowState.DELIVERED && (
                            <div className="space-y-2 p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                                <div className="flex items-center gap-2 text-green-600 font-semibold text-xs">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Work Delivered
                                </div>
                                {escrow.proofOfDelivery && (
                                    <div className="p-2 bg-background/50 rounded text-[10px] font-mono break-all border border-green-500/10">
                                        <span className="text-muted-foreground mr-1">Proof:</span>
                                        <a href={escrow.proofOfDelivery} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                            {escrow.proofOfDelivery}
                                        </a>
                                    </div>
                                )}

                                {(() => {
                                    const releaseTime = escrow.deliveryTimestamp + (3 * 24 * 60 * 60 * 1000)
                                    const timeLeft = releaseTime - Date.now()
                                    if (timeLeft > 0) {
                                        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
                                        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                        return (
                                            <div className="text-[9px] text-muted-foreground text-center uppercase tracking-widest bg-muted/30 py-1 rounded">
                                                Auto-Release in {days}d {hours}h
                                            </div>
                                        )
                                    } else if (isSeller) {
                                        return (
                                            <Button size="xs" variant="outline" className="w-full h-7 border-green-500/50 text-green-600 text-[10px]" onClick={() => onUpdateState(escrow.id, EscrowState.COMPLETED)}>
                                                Claim Auto-Release Now
                                            </Button>
                                        )
                                    }
                                })()}
                            </div>
                        )}

                        {escrow.state === EscrowState.COMPLETED && (
                            <div className="w-full py-2 bg-green-50 text-green-700 rounded-lg text-center text-xs font-bold border border-green-200">
                                COMPLETED
                            </div>
                        )}

                        {/* Deadline-based refund - only buyer can claim, only in AWAITING_ACCEPTANCE state */}
                        {isBuyer && escrow.state === EscrowState.AWAITING_ACCEPTANCE && escrow.deadline && Date.now() > escrow.deadline && (
                            <div className="space-y-2 pt-2 border-t border-red-500/10 text-center">
                                <p className="text-[9px] text-red-500 uppercase font-black">Contract Deadline Reached</p>
                                <Button size="sm" variant="destructive" className="w-full h-8 text-xs" onClick={() => onUpdateState(escrow.id, EscrowState.REFUNDED)}>
                                    Reclaim Funds
                                </Button>
                            </div>
                        )}

                        {/* Share Button (Universal) */}
                        <div className="pt-2 border-t border-border/10 grid grid-cols-2 gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-primary h-8 text-[9px] uppercase tracking-widest gap-2"
                                onClick={() => {
                                    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(`Check out this deal on BasedTrust! 🛡️\n\n${escrow.title}\n`)}&embeds[]=${encodeURIComponent(`https://base-trust.vercel.app/share/${escrow.contract_id || escrow.id}`)}`
                                    window.open(shareUrl, '_blank')
                                }}
                            >
                                <Share2 className="w-3 h-3" />
                                Share on Farcaster
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-primary h-8 text-[9px] uppercase tracking-widest"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/deal/${escrow.id}`)
                                    // You might want to use a toast here instead of alert in production
                                    alert("Link Copied! 🔗")
                                }}
                            >
                                Copy Link
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
