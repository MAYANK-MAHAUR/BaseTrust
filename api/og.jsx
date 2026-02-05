import { ImageResponse } from '@vercel/og';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import EscrowABI from '../src/contracts/EscrowABI.json';
import addresses from '../src/contracts/addresses.json';

export const config = {
    runtime: 'edge',
};

// 1. Setup Client (Optimized for Edge)
// Note: In production Vercel, localhost won't work. We fallback to Base Sepolia or Base.
// For this demo, we prioritize Base Sepolia if deployed, or hardhat if local env var set.
const chain = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;

const client = createPublicClient({
    chain,
    transport: http(),
});

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        let deal = {
            title: searchParams.get('title') || 'Secure Escrow Deal',
            amount: searchParams.get('amount') || '???',
            token: searchParams.get('token') || 'USDC',
            seller: searchParams.get('seller') || '0x...'
        };

        // If ID is provided, we fetch the REAL data (Secure Mode)
        if (id) {
            try {
                const data = await client.readContract({
                    address: addresses.Escrow,
                    abi: EscrowABI,
                    functionName: 'escrows',
                    args: [BigInt(id)],
                });

                // Mapping Protocol Data
                deal.amount = formatUnits(data[3], 6);
                deal.seller = data[1];
                // Safe Title Extraction
                const fullDesc = data[4] || '';
                deal.title = fullDesc.split(':')[0] || 'Escrow Deal';

            } catch (readError) {
                console.error("Blockchain Read Error:", readError);
                deal.title = "Deal Not Found";
                deal.amount = "---";
            }
        }

        // BasedTrust Brand Colors
        const primary = '#3b82f6'; // blue-500
        const background = '#0f172a'; // slate-900
        const cardBg = '#1e293b'; // slate-800

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        textAlign: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        flexWrap: 'nowrap',
                        backgroundColor: background,
                        backgroundImage: 'radial-gradient(circle at 25px 25px, #334155 2%, transparent 0%), radial-gradient(circle at 75px 75px, #334155 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        color: 'white',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            backgroundColor: cardBg,
                            border: '1px solid #334155',
                            borderRadius: 24,
                            padding: '60px',
                            width: '80%',
                            height: '70%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        {/* Header / Logoish */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 24, color: '#94a3b8' }}>
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={primary}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>BasedTrust</span>
                            <span style={{ fontSize: 16, color: '#64748b', marginLeft: 'auto' }}>#{id}</span>
                        </div>

                        {/* Main Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
                            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: 'white' }}>
                                {deal.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: 32, color: primary, fontWeight: 600 }}>
                                    {deal.amount} USDC
                                </div>
                                <div style={{ fontSize: 32, color: '#64748b' }}>•</div>
                                <div style={{ fontSize: 32, color: '#94a3b8' }}>
                                    Seller: {deal.seller.slice(0, 6)}...{deal.seller.slice(-4)}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                display: 'flex',
                                width: '100%',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid #334155',
                                paddingTop: '30px',
                                marginTop: 'auto'
                            }}
                        >
                            <div style={{ fontSize: 24, color: '#64748b' }}>
                                Safe • Secure • On-chain
                            </div>
                            <div style={{
                                backgroundColor: primary,
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '50px',
                                fontSize: 24,
                                fontWeight: 600
                            }}>
                                View Deal
                            </div>
                        </div>

                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e) {
        console.error(e);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
