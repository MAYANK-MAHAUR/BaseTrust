import { Button } from './ui/button'
import { Card } from './ui/card'
import {
    Shield,
    Zap,
    Lock,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react'

export function Hero({ onCreateClick, onDashboardClick, onTermsClick, onPrivacyClick, onDocsClick }) {
    return (
        <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-block px-4 py-1.5 bg-secondary/10 border border-secondary/20 rounded-full">
                            <p className="text-sm font-medium text-secondary">
                                Secure Onchain Escrow ✨
                            </p>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                            Safe transactions{' '}
                            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                onchain
                            </span>
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                            Hold assets securely until both parties are satisfied.
                            Non-custodial, transparent, and built for peer-to-peer trust.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button size="lg" className="rounded-full gap-2 text-base px-8 h-12" onClick={onCreateClick}>
                                Create Escrow
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-full bg-transparent border-input hover:bg-secondary/50 h-12 px-8"
                                onClick={onDashboardClick}
                            >
                                View Transactions
                            </Button>
                        </div>

                        {/* Profile Search */}
                        <div className="mt-8 pt-8 border-t border-border/50">
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                                Check reputation or find a user
                            </p>
                            <div className="flex gap-2 max-w-sm">
                                <input
                                    type="text"
                                    placeholder="Search by 0x... or basename"
                                    className="flex-1 h-10 px-3 rounded-md border border-input bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value) {
                                            window.location.href = `/profile/${e.target.value}`
                                        }
                                    }}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-10"
                                    onClick={(e) => {
                                        const input = e.target.previousSibling.value
                                        if (input) window.location.href = `/profile/${input}`
                                    }}
                                >
                                    Search
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Animated Card */}
                    <div className="relative mt-8 md:mt-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-3xl animate-pulse" />
                        <Card className="relative p-8 border-primary/20 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm shadow-xl">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Transaction Status
                                    </span>
                                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-bold">2.5 ETH</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        $5,240.50 USD
                                    </p>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                                        <span className="text-sm font-medium">
                                            Buyer approved
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                                        <span className="text-sm font-medium">
                                            Funds locked in escrow
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-80">
                                        <div className="w-5 h-5 rounded-full border-2 border-primary shrink-0 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Awaiting seller confirmation
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-border/50 bg-secondary/5">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Why Choose BasedTrust
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Built on Base for speed, security, and minimal fees.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <Card className="p-8 border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Non-Custodial
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Your assets stay under your control. We never hold your private
                            keys or funds directly.
                        </p>
                    </Card>

                    <Card className="p-8 border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Instant Settlement
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Settle transactions in minutes via smart contracts. No human intermediaries, no delays.
                        </p>
                    </Card>

                    <Card className="p-8 border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-6">
                            <Lock className="w-6 h-6 text-secondary" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Transparent
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Every transaction is verifiable on-chain. Full transparency at
                            every step of the process.
                        </p>
                    </Card>
                </div>
            </section>

            {/* How It Works */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <h2 className="text-center text-3xl md:text-4xl font-bold mb-16">
                    How It Works
                </h2>
                <div className="grid md:grid-cols-4 gap-6 relative">
                    {[
                        {
                            step: '01',
                            title: 'Create Escrow',
                            desc: 'Set up a new escrow with the transaction details and parties involved.',
                        },
                        {
                            step: '02',
                            title: 'Lock Funds',
                            desc: 'Buyer deposits crypto into the escrow smart contract securely.',
                        },
                        {
                            step: '03',
                            title: 'Exchange',
                            desc: 'Both parties complete the transaction off-chain or on another platform.',
                        },
                        {
                            step: '04',
                            title: 'Release',
                            desc: 'Funds are released to the seller once both parties approve.',
                        },
                    ].map((item, i) => (
                        <div key={i} className="relative group">
                            {i !== 3 && (
                                <div className="hidden md:block absolute top-12 left-[60%] w-[40%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent z-0" />
                            )}
                            <Card className="p-6 border-border h-full relative z-10 group-hover:border-primary/50 transition-colors">
                                <div className="text-4xl font-black text-primary/20 mb-4 group-hover:text-primary/40 transition-colors">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-bold mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-snug">{item.desc}</p>
                            </Card>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/20 p-12 md:p-24 text-center">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px]" />
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                            Ready to secure your crypto?
                        </h2>
                        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                            Start your first escrow transaction today and experience
                            peer-to-peer trading with confidence.
                        </p>
                        <Button size="lg" className="rounded-full gap-2 text-lg h-14 px-10 shadow-lg shadow-primary/20" onClick={onCreateClick}>
                            Get Started Now
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border mt-12 bg-secondary/5">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <img src="/logo.png" alt="BasedTrust" className="h-12 w-auto rounded-lg" />
                                <span className="font-bold text-xl tracking-tight">BasedTrust</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Secure escrow infrastructure for the decentralized web. Built on Base.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-foreground">Product</h4>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li><button onClick={onDashboardClick} className="hover:text-primary transition-colors">Dashboard</button></li>
                                <li><button onClick={onCreateClick} className="hover:text-primary transition-colors">New Transaction</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li><button onClick={onDocsClick} className="hover:text-primary transition-colors text-left w-full">Documentation</button></li>
                                <li><button onClick={onDocsClick} className="hover:text-primary transition-colors text-left w-full">FAQ</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li><button onClick={onTermsClick} className="hover:text-primary transition-colors text-left w-full">Terms of Service</button></li>
                                <li><button onClick={onPrivacyClick} className="hover:text-primary transition-colors text-left w-full">Privacy Policy</button></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            © 2026 BasedTrust. All rights reserved.
                        </p>
                        <div className="flex gap-4">
                            {/* Social icons could go here */}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
