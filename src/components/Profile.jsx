import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, Name, Identity } from '@coinbase/onchainkit/identity'
import { useAccount, useEnsAddress } from 'wagmi'
import { useEscrows } from '../hooks/useEscrows'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Shield, Award, Clock, ArrowLeft, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'

import { normalize } from 'viem/ens'

export function Profile() {
    const { address: paramId } = useParams()
    const navigate = useNavigate()
    const { address: myAddress } = useAccount()
    const { getUserStats } = useEscrows()

    // Resolve ENS/Basename if needed
    const { data: resolvedAddress, isLoading: isResolving } = useEnsAddress({
        name: paramId && !paramId.startsWith('0x') ? normalize(paramId) : undefined,
        chainId: 1, // Explicitly Mainnet for CCIP-Read
    })

    const address = paramId?.startsWith('0x') ? paramId : resolvedAddress

    const [stats, setStats] = useState({ completed: 0, ethVolume: 0, stableVolume: 0, recentDeals: [] })
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (address) {
            setLoading(true)
            getUserStats(address).then(data => {
                setStats(data)
                setLoading(false)
            })
        } else if (!isResolving && !address) {
            setLoading(false) // Resolved to null or invalid
        }
    }, [address, getUserStats, isResolving])

    // Loading State for Resolution
    if (isResolving) {
        return (
            <div className="min-h-screen bg-background pt-20 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Resolving profile...</p>
                </div>
            </div>
        )
    }

    const copyAddress = () => {
        if (!address) return
        navigator.clipboard.writeText(address)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    if (!address) return <div className="p-8 text-center pt-20 text-muted-foreground">Address not found</div>

    return (
        <div className="min-h-screen bg-background pt-8 pb-24">
            <main className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Header / Nav */}
                <div className="mb-8">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                </div>

                {/* Identity Card */}
                <Card className="p-8 mb-8 border-primary/20 bg-gradient-to-br from-card to-secondary/10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative">
                            <div className="size-24 rounded-full overflow-hidden border-4 border-background shadow-xl">
                                <Identity address={address} className="bg-transparent h-full w-full">
                                    <Avatar className="h-full w-full" />
                                </Identity>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full border border-border">
                                <Shield className="size-5 text-primary fill-primary/20" />
                            </div>
                        </div>

                        <div className="text-center md:text-left space-y-2 flex-1">
                            <Identity address={address} className="bg-transparent">
                                <Name className="text-3xl font-bold text-foreground" />
                            </Identity>

                            <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                                <button onClick={copyAddress} className="flex items-center gap-1.5 hover:text-foreground transition-colors text-sm font-mono bg-secondary/50 px-2 py-0.5 rounded-full">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                    {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                                </button>
                                <a
                                    href={`https://basescan.org/address/${address}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-foreground transition-colors"
                                >
                                    <ExternalLink className="size-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex gap-4">
                            <div className="text-center p-4 bg-background/50 rounded-xl border border-border min-w-[100px]">
                                <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Deals</div>
                            </div>
                            <div className="text-center p-4 bg-background/50 rounded-xl border border-border min-w-[100px]">
                                <div className="text-xl font-bold text-foreground">
                                    {stats.ethVolume > 0 ? `${stats.ethVolume.toFixed(2)} Ξ` : `$${Math.round(stats.stableVolume)}`}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Recent Activity */}
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="size-5 text-muted-foreground" />
                    Recent Activity
                </h3>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading reputation...</div>
                    ) : stats.recentDeals.length > 0 ? (
                        stats.recentDeals.map((deal) => (
                            <Card key={deal.id} className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
                                        <Award className="size-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {deal.title || 'Untitled Deal'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(deal.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-foreground">
                                        {deal.amount} {deal.token}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5 px-2 bg-green-500/10 text-green-600 border-green-500/20">
                                        Completed
                                    </Badge>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Card className="p-12 text-center text-muted-foreground border-dashed">
                            No public history yet.
                        </Card>
                    )}
                </div>

            </main>
        </div>
    )
}
