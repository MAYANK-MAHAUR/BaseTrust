import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

export function Privacy({ onBack }) {
    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Privacy Policy</h1>
                    <p className="text-muted-foreground">Last Updated: January 2026</p>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-2xl font-bold mb-3">1. No Personal Data Collection</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            BasedTrust does not collect, store, or process personal information such as names, email addresses, or phone numbers. We do not use cookies for tracking purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">2. On-Chain Data</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Please be aware that all transaction data (wallet addresses, transaction amounts, timestamps, and smart contract interactions) is publicly available on the Base blockchain. This is inherent to how public blockchains function.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">3. Off-Chain Data Storage</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            To provide features like transaction chats and detailed descriptions, we use off-chain storage (Supabase). While this data is not on the blockchain, it is linked to your public wallet address. We do not link this to your real-world identity unless you voluntarily disclose it in the chat.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-3">4. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use third-party RPC providers (like Base RPC) and wallet connectors which may log IP addresses. Please review their policies.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
