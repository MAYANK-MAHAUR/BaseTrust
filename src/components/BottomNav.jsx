import { Home, Plus, LayoutDashboard, User } from 'lucide-react'
import { useAccount } from 'wagmi'

export function BottomNav({ activeTab, navigate }) {
    const { address } = useAccount()

    const navItems = [
        { id: 'home', label: 'Home', icon: Home, path: '/' },
        { id: 'create', label: 'Create', icon: Plus, path: '/create' },
        { id: 'dashboard', label: 'Deals', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'profile', label: 'Profile', icon: User, path: address ? `/profile/${address}` : '/profile/me' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-bottom">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors touch-target ${isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
