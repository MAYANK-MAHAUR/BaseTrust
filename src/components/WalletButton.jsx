import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { Button } from './ui/button'
import { Wallet, LogOut, ChevronDown, Copy, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Identity, Name, Avatar } from '@coinbase/onchainkit/identity'

export function WalletButton() {
    const { address, isConnected, chainId } = useAccount()
    const { connect, connectors, isPending } = useConnect()
    const { disconnect } = useDisconnect()
    const { switchChain } = useSwitchChain()
    const [showDropdown, setShowDropdown] = useState(false)
    const [copied, setCopied] = useState(false)
    const dropdownRef = useRef(null)

    // Auto-Switch Network
    useEffect(() => {
        // PRODUCTION: Enforce Base Mainnet
        if (!import.meta.env.DEV && isConnected && chainId !== base.id) {
            if (import.meta.env.DEV) console.log("Production: Switching to Base Mainnet")
            switchChain({ chainId: base.id })
            return
        }
    }, [isConnected, chainId, switchChain])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Connector Icons mapping (optional, can be expanded)
    const getConnectorIcon = (id) => {
        if (id.includes('coinbase')) return '🔵'
        if (id.includes('metaMask')) return '🦊'
        return '🔌'
    }

    if (isConnected && address) {
        return (
            <div className="relative" ref={dropdownRef}>
                <Button
                    variant="outline"
                    className="gap-2 pl-2 rounded-full border-primary/20 hover:border-primary/50 bg-background/50 backdrop-blur-sm"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    <div className="size-5 rounded-full overflow-hidden bg-primary/10">
                        <Identity address={address} className="items-center justify-center w-full h-full">
                            <Avatar className="h-full w-full" />
                        </Identity>
                    </div>

                    <Identity address={address} className="bg-transparent">
                        <Name className="text-sm font-medium text-foreground hover:text-primary transition-colors" />
                    </Identity>

                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg animate-in fade-in zoom-in-95 z-50 p-2">
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center justify-between">
                            <span>My Wallet</span>
                            <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-green-500">Connected</span>
                            </div>
                        </div>
                        <div className="h-px bg-border my-1" />
                        <button
                            onClick={copyAddress}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                            Copy Address
                        </button>
                        <button
                            onClick={() => {
                                disconnect()
                                setShowDropdown(false)
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isPending}
                className="gap-2"
            >
                <Wallet className="size-4" />
                {isPending ? 'Connecting...' : 'Connect Wallet'}
            </Button>

            {showDropdown && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDropdown(false)}>
                    <div className="bg-background border border-primary/20 rounded-lg shadow-2xl p-4 w-full max-w-md animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="text-lg font-bold text-center mb-4 flex items-center justify-center gap-2">
                            <img src="/logo.png" alt="Logo" className="w-6 h-6" />
                            Connect Wallet
                        </div>
                        <div className="space-y-2">
                            {connectors.map((connector) => (
                                <button
                                    key={connector.uid}
                                    onClick={() => {
                                        connect({ connector })
                                        setShowDropdown(false)
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-4 text-sm font-medium rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all text-left group"
                                >
                                    <span className="group-hover:text-primary transition-colors">{connector.name}</span>
                                    <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{getConnectorIcon(connector.id)}</span>
                                </button>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4" onClick={() => setShowDropdown(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
