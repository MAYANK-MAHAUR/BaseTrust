export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { endpoint } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint parameter' });
    }

    // UPDATED: Correct API URL from HeyElsa documentation
    const HEYELSA_API_URL = process.env.HEYELSA_API_URL || 'https://x402-api.heyelsa.ai';

    try {
        // Build the target URL
        // If endpoint starts with /, strip it to avoid double slashes if base has trailing slash
        // formatting: base + endpoint
        const urlStr = `${HEYELSA_API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const url = new URL(urlStr);

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

        console.log('[HeyElsa Proxy] Outgoing Headers:', JSON.stringify(headers));

        const fetchOptions = {
            method: req.method,
            headers,
        };

        // Forward body for POST requests
        if (req.method === 'POST' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(url.toString(), fetchOptions);

        // Read response text first to handle non-JSON errors safeley
        const text = await response.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            console.warn('[HeyElsa Proxy] Response was not JSON:', text.substring(0, 100));
            data = { error: 'Non-JSON response', body: text };
        }

        // Return upstream status code
        res.status(response.status).json(data);

    } catch (error) {
        console.error('[HeyElsa Proxy] Fatal Error:', error);
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
