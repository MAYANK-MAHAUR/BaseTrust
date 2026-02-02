import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Helper to initialize Neynar Client (SDK v2+ syntax)
const config = new Configuration({
    apiKey: process.env.NEYNAR_API_KEY
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
    // 1. Method Check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // 2. Auth Check (Notification Secret)
    const authHeader = req.headers.authorization
    const expectedSecret = process.env.NOTIFICATION_SECRET

    if (!expectedSecret) {
        console.error('[Notify] FATAL: NOTIFICATION_SECRET not configured in environment')
        return res.status(500).json({ error: 'Notification service misconfigured' })
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const { fid, title, body, targetUrl } = req.body

        if (!fid || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields: fid, title, body' })
        }

        console.log(`[Neynar] Sending notification to FID: ${fid}`)

        // 3. Send via Neynar
        // We pass the FID in an array as 'targetFids'
        // Neynar handles the token lookup automatically
        const result = await client.publishFrameNotifications({
            targetFids: [parseInt(fid)], // Must be array of numbers
            notification: {
                title: title.slice(0, 32),
                body: body.slice(0, 128),
                target_url: targetUrl || 'https://base-trust.vercel.app'
            }
        })

        console.log(`[Neynar] Success:`, result)
        return res.status(200).json({ success: true, result })

    } catch (error) {
        console.error('[Neynar] Error:', error)
        // Handle Neynar specific errors gracefully
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        })
    }
}
