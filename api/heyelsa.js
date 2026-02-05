/**
 * HeyElsa x402 API Proxy
 * Bypasses CORS by proxying browser requests through Vercel serverless function
 */

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { endpoint, ...params } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint parameter' });
    }

    const HEYELSA_API_URL = process.env.HEYELSA_API_URL || 'https://x402.heyelsa.ai';

    try {
        // Build the target URL
        const url = new URL(`${HEYELSA_API_URL}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, value);
        });

        console.log('[HeyElsa Proxy] Forwarding to:', url.toString());

        // Forward request to HeyElsa
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        // Forward X-PAYMENT header if present
        if (req.headers['x-payment']) {
            headers['X-PAYMENT'] = req.headers['x-payment'];
        }

        const response = await fetch(url.toString(), {
            method: req.method,
            headers,
        });

        const data = await response.json();

        // Return response with original status code
        res.status(response.status).json(data);
    } catch (error) {
        console.error('[HeyElsa Proxy] Error:', error.message);
        res.status(500).json({ error: 'Proxy request failed', message: error.message });
    }
}
