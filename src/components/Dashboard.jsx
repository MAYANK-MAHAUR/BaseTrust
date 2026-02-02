import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Name, Identity } from '@coinbase/onchainkit/identity'
import confetti from 'canvas-confetti'

import { useAccount } from 'wagmi'
import { useEscrows, EscrowState } from '../hooks/useEscrows'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { WalletButton } from './WalletButton'
import { ChatBox } from './ChatBox'
import { StatsCards } from './StatsCards'
import { DealDetailsModal } from './DealDetailsModal'
import { Lock, Plus, Clock, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'

export function Dashboard({ onCreateClick, initialDealId, onModalClose }) {
    const navigate = useNavigate()
    const { address, isConnected } = useAccount()
    const { getMyEscrows, loading, updateEscrowState, fetchDealById } = useEscrows()
    const [filter, setFilter] = useState('Active')
    const [openChatId, setOpenChatId] = useState(null)
    const [publicDeal, setPublicDeal] = useState(null)

    const myEscrows = getMyEscrows() || []

    useEffect(() => {
        if (initialDealId !== undefined && initialDealId !== null) {
            // Check if it's already in my escrows
            const found = myEscrows.find(e => e.id === initialDealId)
            if (found) {
                setOpenChatId(initialDealId)
            } else {
                // Fetch for public view
                fetchDealById(initialDealId).then(deal => {
                    if (deal) {
                        setPublicDeal(deal)
                        setOpenChatId(initialDealId)
                    }
                })
            }
        }
    }, [initialDealId, myEscrows, fetchDealById])

    const filteredEscrows = myEscrows.filter(escrow => {
        if (filter === 'Active') {
            return [
                EscrowState.AWAITING_ACCEPTANCE,
                EscrowState.AWAITING_DELIVERY,
                EscrowState.DELIVERED,
                EscrowState.DISPUTED
            ].includes(escrow.state)
        }
        if (filter === 'History') {
            return [
                EscrowState.COMPLETED,
                EscrowState.REFUNDED
            ].includes(escrow.state)
        }
        return true
    })

    const getStatusVariant = (state) => {
        switch (state) {
            case EscrowState.COMPLETED: return 'default'
            case EscrowState.AWAITING_ACCEPTANCE: return 'secondary'
            case EscrowState.AWAITING_DELIVERY: return 'secondary'
            case EscrowState.DELIVERED: return 'default' // Highlighted
            case EscrowState.REFUNDED: return 'destructive'
            case EscrowState.DISPUTED: return 'destructive'
            default: return 'outline'
        }
    }

    const getStatusLabel = (state) => {
        switch (state) {
            case EscrowState.AWAITING_ACCEPTANCE: return 'Pending Accept'
            case EscrowState.AWAITING_DELIVERY: return 'In Progress'
            case EscrowState.DELIVERED: return 'Delivered'
            case EscrowState.COMPLETED: return 'Completed'
            case EscrowState.REFUNDED: return 'Refunded'
            case EscrowState.DISPUTED: return 'Disputed'
            default: return state
        }
    }

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    // ...

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">Your Transactions</h1>
                        <p className="text-muted-foreground">Monitor and manage all your escrow transactions</p>
                    </div>
                    <Button onClick={onCreateClick} size="sm" className="gap-2 rounded-full px-6 h-10">
                        <Plus className="w-4 h-4" />
                        New Escrow
                    </Button>
                </div>

                {/* Stats */}
                <StatsCards escrows={myEscrows} />

                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto pb-1">
                    {['Active', 'History'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className="px-6 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap min-w-[100px]"
                            style={{
                                borderColor: filter === tab ? 'var(--primary)' : 'transparent',
                                color: filter === tab ? 'var(--foreground)' : 'var(--muted-foreground)'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Transactions List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading transactions...</div>
                    ) : filteredEscrows.length > 0 ? (
                        filteredEscrows.map((escrow) => (
                            <Card key={escrow.id} className="p-6 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start gap-4">
                                            {escrow.image_url && (
                                                <img
                                                    src={escrow.image_url}
                                                    alt="Item"
                                                    className="w-16 h-16 rounded-md object-cover bg-secondary border border-border"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="font-semibold text-foreground text-lg">
                                                        {escrow.title || escrow.description}
                                                    </h3>
                                                    <Badge variant={getStatusVariant(escrow.state)} className="">
                                                        {getStatusLabel(escrow.state)}
                                                    </Badge>
                                                </div>
                                                {escrow.title && (
                                                    <p className="text-sm text-muted-foreground line-clamp-1">{escrow.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <span className="font-medium text-foreground/80">From:</span>
                                                <Identity address={escrow.seller} className="bg-transparent cursor-pointer" onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/profile/${escrow.seller}`)
                                                }}>
                                                    <Name className="text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4" />
                                                </Identity>
                                            </span>
                                            <span className="hidden sm:inline">•</span>
                                            <span>Created: {formatDate(escrow.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-2 shrink-0 w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="font-bold text-xl text-foreground">
                                            {escrow.amount} <span className="text-sm font-medium text-muted-foreground">{escrow.token}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Open Modal Button */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs hover:bg-secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setOpenChatId(escrow.id) // Reuse this state to track open modal ID
                                                }}
                                            >
                                                View Deal
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Card className="p-16 text-center space-y-6 border-dashed bg-secondary/5">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                                <Clock className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-medium text-foreground">No transactions found</p>
                                <p className="text-muted-foreground">Create your first escrow to get started safely.</p>
                            </div>
                            <Button onClick={onCreateClick} variant="outline" className="mt-4">
                                Create Transaction
                            </Button>
                        </Card>
                    )}
                </div>

                {/* Deal Details Modal */}
                {
                    openChatId !== null && (
                        <DealDetailsModal
                            escrow={myEscrows.find(e => e.id === openChatId) || publicDeal}
                            currentUser={address}
                            onClose={() => {
                                setOpenChatId(null)
                                setPublicDeal(null)
                                if (onModalClose) onModalClose()
                            }}
                            onUpdateState={updateEscrowState}
                        />
                    )
                }
            </main >
        </div >
    )
}
