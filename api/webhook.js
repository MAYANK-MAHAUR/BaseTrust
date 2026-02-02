import { verifyAppEventWithNeynar } from '@farcaster/miniapp-node'

// Notification webhook handler for Farcaster Mini App
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // 1. Verify Webhook Signature (CRITICAL)
        const neynarKey = process.env.NEYNAR_API_KEY
        if (!neynarKey) {
            console.error('[Webhook] FATAL: NEYNAR_API_KEY not configured')
            return res.status(500).json({ error: 'Configuration error' })
        }

        const isValid = await verifyAppEventWithNeynar(req.body, neynarKey)
        if (!isValid) {
            console.warn('[Webhook] Unauthorized: Invalid signature detected')
            return res.status(401).json({ error: 'Invalid signature' })
        }

        const body = req.body
        const { fid, event } = body

        // 2. Initialize Supabase
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        )

        if (!event) {
            return res.status(400).json({ error: 'Missing event data' })
        }

        const eventType = event.event || event.type
        const notificationDetails = event.notificationDetails

        console.log(`[Webhook] Event: ${eventType}, FID: ${fid}`)

        switch (eventType) {
            case 'miniapp_added':
            case 'notifications_enabled':
                if (notificationDetails?.token && notificationDetails?.url) {
                    // Save notification token to database
                    const { error } = await supabase
                        .from('notification_tokens')
                        .upsert({
                            fid: fid,
                            token: notificationDetails.token,
                            url: notificationDetails.url,
                            enabled: true,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'fid' })

                    if (error) {
                        console.error('[Webhook] Failed to save token:', error)
                    } else {
                        console.log(`[Webhook] Saved token for FID ${fid}`)
                    }
                }
                break

            case 'miniapp_removed':
            case 'notifications_disabled':
                // Mark token as disabled
                const { error } = await supabase
                    .from('notification_tokens')
                    .update({ enabled: false, updated_at: new Date().toISOString() })
                    .eq('fid', fid)

                if (error) {
                    console.error('[Webhook] Failed to disable token:', error)
                } else {
                    console.log(`[Webhook] Disabled token for FID ${fid}`)
                }
                break

            default:
                console.log(`[Webhook] Unknown event type: ${eventType}`)
        }

        // Return success quickly (Base app waits for response)
        return res.status(200).json({ success: true })

    } catch (error) {
        console.error('[Webhook] Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
