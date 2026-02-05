import { ArrowLeft, FileText, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

export function Docs({ onBack }) {
    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 safe-y">

                {/* Header */}
                <div className="mb-8">
                    <Button variant="ghost" className="mb-4 pl-0 gap-2 hover:bg-transparent hover:text-primary" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">Documentation & FAQ</h1>
                    <p className="text-muted-foreground mt-2">Everything you need to know about BasedTrust security and usage.</p>
                </div>

                <div className="space-y-8">
                    {/* Security Audit Section */}
                    <section>
                        <Card className="p-6 border-green-500/20 bg-green-500/5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <ShieldCheck className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <h2 className="text-xl font-semibold">Security Audit Report</h2>
                                    <p className="text-sm text-foreground/80 leading-relaxed">
                                        Trust is our currency using Base. We have conducted comprehensive automated audits using industry-standard tools including Slither, Mythril, and Solidity Scan, achieving a security score of <strong>96.4/10</strong>.
                                    </p>
                                    <div className="pt-2">
                                        <a
                                            href="/Escrow_Audit_Report.docx"
                                            download="BasedTrust_Audit_Report.docx"
                                            className="inline-flex"
                                        >
                                            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                                <FileText className="w-4 h-4" />
                                                Download Audit Report
                                            </Button>
                                        </a>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Latest scan: Feb 1, 2026
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* How it Works */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            How it Works
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="p-5 space-y-2">
                                <h3 className="font-semibold text-primary">1. Create Deal</h3>
                                <p className="text-sm text-muted-foreground">Buyer sets up terms (amount, deadline) and deposits funds into the secure smart contract.</p>
                            </Card>
                            <Card className="p-5 space-y-2">
                                <h3 className="font-semibold text-primary">2. Seller Accepts</h3>
                                <p className="text-sm text-muted-foreground">Seller reviews terms and accepts. This locks the agreement on-chain.</p>
                            </Card>
                            <Card className="p-5 space-y-2">
                                <h3 className="font-semibold text-primary">3. Delivery</h3>
                                <p className="text-sm text-muted-foreground">Seller delivers work and provides proof. Buyer reviews the delivery.</p>
                            </Card>
                            <Card className="p-5 space-y-2">
                                <h3 className="font-semibold text-primary">4. Release</h3>
                                <p className="text-sm text-muted-foreground">Buyer approves and funds are released instantly. If there's an issue, an arbiter resolves it.</p>
                            </Card>
                        </div>
                    </section>

                    {/* For AI Agents */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            For AI Agents
                        </h2>
                        <Card className="p-6 border-blue-500/20 bg-blue-500/5 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">Automate Trades with Eliza / OpenClaw</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    BaseTrust is built for agents. Works with <strong>HeyElsa</strong>, <strong>ElizaOS</strong>, <strong>OpenClaw</strong>, and <strong>Moltbook</strong> agents.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">1. Quick Install</h4>
                                <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                                    npx degit MAYANK-MAHAUR/BaseTrust/src/agent packages/plugin-basetrust
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">2. Usage (ElizaOS)</h4>
                                <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre">
                                    {`import { baseTrustPlugin } from "./plugins/basetrust";
runtime.registerPlugin(baseTrustPlugin);`}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">3. All 9 Actions</h4>
                                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">✅ CREATE_ESCROW</div>
                                    <div className="flex items-center gap-1">✅ ACCEPT_DEAL</div>
                                    <div className="flex items-center gap-1">✅ MARK_DELIVERED</div>
                                    <div className="flex items-center gap-1">✅ RELEASE_FUNDS</div>
                                    <div className="flex items-center gap-1">✅ RAISE_DISPUTE</div>
                                    <div className="flex items-center gap-1">✅ RESOLVE_DISPUTE</div>
                                    <div className="flex items-center gap-1">✅ CLAIM_REFUND</div>
                                    <div className="flex items-center gap-1">✅ CLAIM_AUTO_RELEASE</div>
                                    <div className="flex items-center gap-1">✅ GET_ESCROW</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">4. OpenClaw Config</h4>
                                <p className="text-xs text-muted-foreground">Add to <code>~/.openclaw/openclaw.json</code>:</p>
                                <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre">
                                    {`{
  "skills": {
    "load": { "extraDirs": ["~/.openclaw/skills/basetrust"] },
    "entries": {
      "basetrust-escrow": {
        "env": {
          "BASE_PRIVATE_KEY": "0x...",
          "ESCROW_CONTRACT_ADDRESS": "0xe7f..."
        }
      }
    }
  }
}`}
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* FAQ */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">Is my money safe?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Yes. Funds are held in a non-custodial smart contract deployed on the Base network. Only the Buyer, Seller, or the neutral Arbiter (in case of dispute) can move funds. BaseTrust never has access to your private keys or funds.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">What happens if the seller disappears?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    If the Seller does not accept the deal within the deadline (3 days), you can reclaim your funds immediately. If they accept but don't deliver, you can raise a dispute.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">What is the 72-hour auto-release?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    After the seller marks delivery, the buyer has 72 hours to release funds or raise a dispute. If neither happens, the seller can claim auto-release to receive payment automatically.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">Can AI agents use BaseTrust?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Yes! We provide full agent support for <strong>HeyElsa</strong>, <strong>ElizaOS</strong>, <strong>OpenClaw</strong>, and <strong>Moltbook</strong> agents. Agents can create deals, accept, deliver, release funds, and handle disputes — all 9 actions are available programmatically.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">Who is the Arbiter?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The arbiter is a neutral third party chosen when creating the escrow. In case of disputes, the arbiter reviews evidence and decides who receives the funds. You can set any trusted address as arbiter.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium text-foreground">What are the fees?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We charge a minimal 0.1% fee on successful transactions. Gas fees on Base are typically less than $0.05.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}
