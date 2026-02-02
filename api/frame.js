import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import EscrowABI from '../src/contracts/EscrowABI.json';
import addresses from '../src/contracts/addresses.json';

export const config = {
    runtime: 'edge',
};

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;
const client = createPublicClient({
    chain,
    transport: http(),
});

// Basic HTML sanitizer for on-chain data
const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
};

export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return new Response('Missing ID', { status: 400 });
    }

    // Default values
    let deal = {
        title: 'Secure Escrow Deal',
        amount: '???',
        token: 'USDC'
    };

    try {
        const data = await client.readContract({
            address: addresses.Escrow,
            abi: EscrowABI,
            functionName: 'escrows',
            args: [BigInt(id)],
        });

        const tokenAddr = data[3]?.toLowerCase();
        const isETH = !tokenAddr || tokenAddr === '0x0000000000000000000000000000000000000000';
        const decimals = isETH ? 18 : 6;
        deal.token = isETH ? 'ETH' : 'USDC';

        deal.amount = formatUnits(data[4], decimals);
        const fullDesc = data[11] || '';
        deal.title = escapeHtml(fullDesc.split(':')[0] || 'Escrow Deal');

        // Note: data[11] is description in production Escrow.sol, split by ':' for title
    } catch (error) {
        console.error("Frame Data Fetch Error:", error);
    }

    // Host URL calculation (handle localhost vs production)
    const host = request.headers.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const imageUrl = `${baseUrl}/api/og?id=${id}`;
    const appUrl = `${baseUrl}/deal/${id}`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${deal.title}</title>
        <meta property="og:title" content="${deal.title}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:button:1" content="View Deal on BaseTrust" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${appUrl}" />
      </head>
      <body>
        <h1>${deal.title} - ${deal.amount} ${deal.token}</h1>
        <p>Redirecting...</p>
        <script>window.location.href = "${appUrl}";</script>
      </body>
    </html>
    `;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
