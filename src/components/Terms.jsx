import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

export function Terms({ onBack }) {
    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Terms of Service</h1>
                    <p className="text-muted-foreground">Last Updated: January 2026</p>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-2xl font-bold mb-3">1. Non-Custodial Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            BasedTrust is a non-custodial interface interacting with the Base blockchain. We do not hold, store, or manage your digital assets. All transactions are executed strictly via smart contracts that you approve.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">2. Fees & Payments</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            A flat platform fee of <strong>0.1%</strong> is automatically deducted from the full escrow amount upon successful release of funds. This fee supports the ongoing development and maintenance of the BasedTrust protocol.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">3. Dispute Resolution & Arbitration</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By using this service, you appoint the BasedTrust Platform as the sole Arbiter for all transactions. In the event of a dispute, the Arbiter has the final authority to release funds to the Seller or refund the Buyer based on evidence provided. All Arbiter decisions are final and enforced on-chain.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">4. Auto-Release Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If funds are not released or disputed within 3 days of the delivery confirmation, the smart contract allows for an auto-release of funds to the Seller to prevent deadlock.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">5. No Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree that BasedTrust developers and contributors are not responsible for funds lost due to user error (e.g., wrong address), third-party wallet failures, or blockchain network issues. Use at your own risk.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
