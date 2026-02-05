import { useState, useEffect } from "react";
import { Bot, User, X, ExternalLink, Github, Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function IdentityModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState("selection");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!sessionStorage.getItem("basetrust_identity_shown")) {
            setIsOpen(true);
        }
    }, []);

    const handleHuman = () => {
        sessionStorage.setItem("basetrust_identity_shown", "true");
        localStorage.setItem("basetrust_identity", "human");
        setIsOpen(false);
    };

    const handleAgent = () => setView("agent");
    const handleClose = () => {
        sessionStorage.setItem("basetrust_identity_shown", "true");
        setIsOpen(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300 relative">
                <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>

                {view === "selection" && (
                    <div className="p-8 md:p-12 text-center space-y-8">
                        <div className="space-y-3">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                Identify Protocol
                            </h2>
                            <p className="text-muted-foreground">Are you biological or autonomous?</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                            <button onClick={handleHuman} className="group flex flex-col items-center p-6 rounded-xl border-2 border-border hover:border-blue-500/50 bg-card hover:bg-blue-500/5 transition-all duration-300 hover:scale-[1.02]">
                                <div className="h-14 w-14 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <User className="w-7 h-7 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">Human</h3>
                                <p className="text-xs text-muted-foreground">Use the UI to create escrows</p>
                            </button>

                            <button onClick={handleAgent} className="group flex flex-col items-center p-6 rounded-xl border-2 border-border hover:border-purple-500/50 bg-card hover:bg-purple-500/5 transition-all duration-300 hover:scale-[1.02]">
                                <div className="h-14 w-14 bg-purple-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Bot className="w-7 h-7 text-purple-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">Agent</h3>
                                <p className="text-xs text-muted-foreground">Integrate via ElizaOS skill</p>
                            </button>
                        </div>
                    </div>
                )}

                {view === "agent" && (
                    <div className="flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-border bg-purple-500/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-500" />
                                <h3 className="text-lg font-bold">Agent Integration</h3>
                            </div>
                            <a href="https://github.com/MAYANK-MAHAUR/BaseTrust/tree/main/src/agent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                <Github className="w-4 h-4" />
                                View on GitHub
                            </a>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    Quick Start
                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">ElizaOS</span>
                                </h4>
                                <div className="relative group">
                                    <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ borderRadius: '0.5rem', padding: '0.75rem', fontSize: '12px' }}>
                                        {`npx degit MAYANK-MAHAUR/BaseTrust/src/agent packages/plugin-basetrust`}
                                    </SyntaxHighlighter>
                                    <button onClick={() => copyToClipboard("npx degit MAYANK-MAHAUR/BaseTrust/src/agent packages/plugin-basetrust")} className="absolute top-2 right-2 p-1.5 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Downloads only the skill folder (~50KB), not the whole repo.</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Environment</h4>
                                <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ borderRadius: '0.5rem', padding: '0.75rem', fontSize: '12px' }}>
                                    {`BASE_PRIVATE_KEY=0x...
ESCROW_CONTRACT_ADDRESS=0xe7f874b494D2d015bb19752913B016A6DE3e143b`}
                                </SyntaxHighlighter>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Available Actions</h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    {["CREATE_ESCROW", "ACCEPT_DEAL", "MARK_DELIVERED", "RELEASE_FUNDS", "RAISE_DISPUTE", "RESOLVE_DISPUTE", "CLAIM_REFUND", "CLAIM_AUTO_RELEASE", "GET_ESCROW"].map(action => (
                                        <div key={action} className="bg-muted/30 px-2 py-1.5 rounded-lg font-mono text-muted-foreground text-[10px]">
                                            {action}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center">
                            <button onClick={() => setView("selection")} className="text-xs text-muted-foreground hover:text-foreground">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <a href="https://github.com/MAYANK-MAHAUR/BaseTrust/tree/main/src/agent" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> Docs
                                </a>
                                <button onClick={handleClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

