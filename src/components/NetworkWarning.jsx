import { useChainId, useSwitchChain } from 'wagmi'
import { hardhat, base } from 'wagmi/chains'
import { AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

export function NetworkWarning() {
    const chainId = useChainId()
    const { switchChain } = useSwitchChain()

    // Determine target chain based on environment
    const targetChainId = import.meta.env.DEV ? hardhat.id : base.id
    const targetChainName = import.meta.env.DEV ? 'Localhost' : 'Base Mainnet'

    // If we are on the correct chain, show nothing
    if (chainId === targetChainId) return null

    return (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-yellow-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                        Wrong Network. Please connect to {targetChainName}.
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => switchChain({ chainId: targetChainId })}
                >
                    Switch to {targetChainName}
                </Button>
            </div>
        </div>
    )
}
