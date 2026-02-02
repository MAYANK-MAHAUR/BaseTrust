import { useState } from 'react'
import { useAccount } from 'wagmi'
import { WalletButton } from './WalletButton'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'
import { SupportModal } from './SupportModal'

export function Navbar({ activeTab, navigate }) {
    const { isConnected } = useAccount()
    const [showSupport, setShowSupport] = useState(false)

    return (
        <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <button onClick={() => navigate('/')} className="flex items-center gap-2">
                    <img src="/logo.png" alt="BasedTrust" className="h-10 w-auto rounded-lg" />
                    <span className="font-bold text-lg text-foreground tracking-tight">Based<span className="text-primary">Trust</span></span>
                </button>

                {/* Nav Links */}
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className={`text-sm font-medium transition-colors hover:text-primary ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            Dashboard
                        </button>
                    ) : null}

                    <Button
                        size="sm"
                        className="rounded-full hidden sm:flex"
                        onClick={() => navigate('/create')}
                        variant={activeTab === 'create' ? 'secondary' : 'default'}
                    >
                        Start Transaction
                    </Button>

                    {/* Support Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 gap-2 hidden sm:flex"
                        onClick={() => setShowSupport(true)}
                    >
                        <img src="/logo.png" alt="Support" className="w-4 h-4" />
                        <span className="hidden lg:inline">Support</span>
                    </Button>

                    <ThemeToggle />
                    <WalletButton />
                </div>
            </div>

            {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
        </nav>
    )
}
