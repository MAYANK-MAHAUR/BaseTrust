/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from 'wagmi'
import { useSendCalls, useCapabilities } from 'wagmi/experimental'
import { parseUnits, formatUnits, decodeEventLog } from 'viem'
import { hardhat, baseSepolia, base } from 'wagmi/chains'
import React from 'react'
import { supabase } from '../lib/supabase'

import EscrowABI from '../contracts/EscrowABI.json'
import MockUSDCABI from '../contracts/MockUSDCABI.json'
import addresses from '../contracts/addresses.json'

// Development-only logger to keep production console clean
const devLog = (...args) => {
    if (import.meta.env.DEV) console.log(...args)
}

// The Graph Subgraph URL for historical data
const GRAPH_URL = 'https://api.studio.thegraph.com/query/1724573/escrow/version/latest'

const EscrowsContext = createContext(null)

export const EscrowState = {
    AWAITING_ACCEPTANCE: 0,
    AWAITING_DELIVERY: 1,
    DELIVERED: 2,
    COMPLETED: 3, // Maps to contract's COMPLETE
    DISPUTED: 4,
    REFUNDED: 5,
}

// User-friendly error messages for failed transactions
const ERROR_MESSAGES = {
    'Only seller can accept': 'Only the seller can accept this deal.',
    'Only buyer can release': 'Only the buyer can release the funds.',
    'Only seller': 'Only the seller can perform this action.',
    'Only buyer': 'Only the buyer can perform this action.',
    'Only arbiter decides': 'Only the arbiter can resolve this dispute.',
    'Invalid state': 'This action cannot be performed in the current state.',
    'Not in dispute': 'This deal is not currently in dispute.',
    'Safety window active': 'The 72-hour safety period has not passed yet.',
    'Not delivered': 'The seller has not marked this as delivered yet.',
    'user rejected': 'Transaction was cancelled by user.',
}

export function EscrowsProvider({ children }) {
    const [escrows, setEscrows] = useState([])
    const [loading, setLoading] = useState(true)
    const { address, chainId } = useAccount()
    const publicClient = usePublicClient()
    const { data: walletClient } = useWalletClient()
    const { writeContractAsync } = useWriteContract()

    // Determine Contract Address based on Chain ID
    const defaultChainId = import.meta.env.DEV ? hardhat.id : base.id
    const activeChainId = chainId || defaultChainId
    const ESCROW_ADDRESS = addresses.Escrow
    const USDC_ADDRESS = addresses.USDC

    // Fetch escrows from The Graph (primary source for historical data)
    const fetchFromGraph = async () => {
        const query = `
            query GetEscrows {
                escrows(first: 100, orderBy: createdAt, orderDirection: desc) {
                    id
                    buyer
                    seller
                    arbiter
                    token
                    amount
                    state
                    acceptanceDeadline
                    deliveryDeadline
                    deliveryTimestamp
                    description
                    createdAt
                    createdTxHash
                }
            }
        `
        const response = await fetch(GRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        })
        const json = await response.json()
        if (json.errors) throw new Error(json.errors[0].message)
        return json.data.escrows
    }

    // Load Escrows (The Graph primary, RPC fallback)
    const loadEscrows = useCallback(async (isBackground = false) => {
        const supportedChains = [hardhat.id, baseSepolia.id, base.id]
        if (!ESCROW_ADDRESS || !supportedChains.includes(activeChainId)) {
            console.warn(`Skipping loadEscrows: Contract or Network ${activeChainId} not supported`)
            if (!isBackground) setLoading(false)
            return
        }

        if (!isBackground) setLoading(true)

        try {
            // Try The Graph first (for Base mainnet)
            if (activeChainId === base.id) {
                try {
                    const graphEscrows = await fetchFromGraph()

                    const escrowsData = graphEscrows.map(e => {
                        const tokenAddr = e.token.toLowerCase()
                        const isETH = tokenAddr === '0x0000000000000000000000000000000000000000'
                        const isUSDC = tokenAddr === addresses['8453']?.USDC?.toLowerCase() || tokenAddr === addresses.USDC?.toLowerCase()
                        const isUSDT = tokenAddr === addresses['8453']?.USDT?.toLowerCase()
                        const decimals = isETH ? 18 : 6
                        const symbol = isETH ? 'ETH' : (isUSDC ? 'USDC' : (isUSDT ? 'USDT' : 'Token'))

                        return {
                            id: Number(e.id),
                            buyer: e.buyer,
                            seller: e.seller,
                            arbiter: e.arbiter,
                            amount: formatUnits(BigInt(e.amount), decimals),
                            token: symbol,
                            state: Number(e.state),
                            acceptanceDeadline: Number(e.acceptanceDeadline || 0) * 1000,
                            deliveryDeadline: Number(e.deliveryDeadline || 0) * 1000,
                            deliveryTimestamp: Number(e.deliveryTimestamp || 0) * 1000,
                            description: e.description || '',
                            // Helper field for UI to show common "Due Date"
                            deadline: (Number(e.state) === 0 ? Number(e.acceptanceDeadline || 0) : Number(e.deliveryDeadline || 0)) * 1000,
                            proofOfDelivery: '',
                            createdAt: Number(e.createdAt) * 1000,
                            txHash: e.createdTxHash
                        }
                    })

                    // Merge with Supabase for rich metadata
                    let finalEscrows = escrowsData
                    if (supabase && escrowsData.length > 0) {
                        const ids = escrowsData.map(e => e.id)
                        const { data: supabaseData } = await supabase
                            .from('escrows')
                            .select('id, contract_id, title, image_url, description')
                            .in('contract_id', ids)

                        if (supabaseData) {
                            finalEscrows = finalEscrows.map(e => {
                                const richData = supabaseData.find(s => s.contract_id === e.id)
                                return {
                                    ...e,
                                    supabaseId: richData?.id,
                                    title: richData?.title || (e.description ? e.description.split(':')[0] : 'Escrow Deal'),
                                    image_url: richData?.image_url
                                }
                            })
                        }
                    }

                    setEscrows(finalEscrows)
                    if (!isBackground) setLoading(false)
                    return
                } catch (graphErr) {
                    console.warn("⚠️ Graph query failed, falling back to RPC:", graphErr.message)
                }
            }

            // Fallback: RPC scan (for local/testnet or if Graph fails)
            if (!publicClient) {
                if (!isBackground) setLoading(false)
                return
            }

            // Check if we can reach the node first (basic health check)
            try {
                await publicClient.getBlockNumber()
            } catch {
                console.warn("RPC Node unreachable. Is your local node running?")
                if (!isBackground) setLoading(false)
                return
            }

            // Optimization: Fetch current block to limit scan range
            // Public RPCs limit range (e.g. 10k blocks). Since we just deployed, 50k is safe.
            const currentBlock = await publicClient.getBlockNumber()
            const START_BLOCK_OFFSET = 5000n // ~30 mins on Base (within 10k RPC limit)
            const fromBlock = activeChainId === hardhat.id ? 0n : (currentBlock - START_BLOCK_OFFSET)

            const logs = await publicClient.getContractEvents({
                address: ESCROW_ADDRESS,
                abi: EscrowABI,
                eventName: 'EscrowCreated',
                fromBlock: fromBlock > 0n ? fromBlock : 0n
            })

            const escrowsData = await Promise.all(logs.map(async (log) => {
                const id = log.args.escrowId
                const data = await publicClient.readContract({
                    address: ESCROW_ADDRESS,
                    abi: EscrowABI,
                    functionName: 'escrows',
                    args: [id]
                })

                // New Struct Mapping (production contract):
                // 0: buyer, 1: seller, 2: arbiter, 3: token, 4: amount, 
                // 5: state, 6: acceptanceDeadline, 7: deliveryDeadline, 8: deliveryTimestamp,
                // 9: disputeTimestamp, 10: deliveryPeriod, 11: description, 12: proofOfDelivery

                const tokenAddr = data[3].toLowerCase()
                const isETH = tokenAddr === '0x0000000000000000000000000000000000000000'
                const isUSDC = tokenAddr === addresses['8453']?.USDC?.toLowerCase() || tokenAddr === addresses.USDC?.toLowerCase()
                const isUSDT = tokenAddr === addresses['8453']?.USDT?.toLowerCase()

                const decimals = isETH ? 18 : 6
                let symbol = isETH ? 'ETH' : (isUSDC ? 'USDC' : (isUSDT ? 'USDT' : 'Token'))

                return {
                    id: Number(id),
                    buyer: data[0],
                    seller: data[1],
                    arbiter: data[2],
                    amount: formatUnits(data[4], decimals),
                    token: symbol,
                    description: data[11],
                    state: Number(data[5]),
                    acceptanceDeadline: Number(data[6]) * 1000,
                    deliveryDeadline: Number(data[7]) * 1000,
                    deliveryTimestamp: Number(data[8]) * 1000,
                    // Helper field for UI to show common "Due Date"
                    deadline: (Number(data[5]) === 0 ? Number(data[6]) : Number(data[7])) * 1000,
                    proofOfDelivery: data[12],
                    createdAt: Number((await publicClient.getBlock({ blockNumber: log.blockNumber })).timestamp) * 1000,
                    txHash: log.transactionHash
                }
            }))
            let finalEscrows = escrowsData.sort((a, b) => b.createdAt - a.createdAt)

            // Merge with Supabase (Allow on ALL chains)
            if (supabase && escrowsData.length > 0) {
                const ids = escrowsData.map(e => e.id)
                const { data: supabaseData } = await supabase
                    .from('escrows')
                    .select('id, contract_id, title, image_url')
                    .in('contract_id', ids)

                if (supabaseData) {
                    // Sort descending by ID to prefer newer records (fixes ID collision)
                    supabaseData.sort((a, b) => b.id - a.id)

                    finalEscrows = finalEscrows.map(e => {
                        const richData = supabaseData.find(s => s.contract_id === e.id)
                        return {
                            ...e,
                            supabaseId: richData?.id,
                            title: richData?.title || (e.description ? e.description.split(':')[0] : 'Escrow Deal'),
                            image_url: richData?.image_url
                        }
                    })
                }
            }
            setEscrows(finalEscrows)
        } catch (err) {
            console.error("Failed to load escrows:", err)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }, [publicClient, ESCROW_ADDRESS, activeChainId])

    useEffect(() => {
        loadEscrows()
    }, [loadEscrows])

    // --- Real-time Updates via Contract Events + Visibility-aware Polling ---
    useEffect(() => {
        const supportedChains = [hardhat.id, baseSepolia.id, base.id]
        if (!publicClient || !ESCROW_ADDRESS || !supportedChains.includes(activeChainId)) return

        let pollInterval = null
        let isVisible = !document.hidden
        const ACTIVE_POLL_MS = 15000
        const IDLE_POLL_MS = 60000

        const handleVisibilityChange = () => {
            isVisible = !document.hidden
            if (isVisible) loadEscrows(true)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        pollInterval = setInterval(() => {
            if (isVisible) loadEscrows(true)
        }, isVisible ? ACTIVE_POLL_MS : IDLE_POLL_MS)

        const unwatch = publicClient.watchContractEvent({
            address: ESCROW_ADDRESS,
            abi: EscrowABI,
            onLogs: () => {
                setTimeout(() => loadEscrows(true), 3000)
            }
        })

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            clearInterval(pollInterval)
            unwatch()
        }
    }, [publicClient, ESCROW_ADDRESS, loadEscrows, activeChainId])

    // EIP-5792: Batch & Paymaster Support
    const { sendCallsAsync } = useSendCalls()
    const { data: capabilities } = useCapabilities()

    // Create Escrow Function
    const createEscrow = useCallback(async (escrowData) => {
        if (!walletClient) throw new Error("Wallet not connected")

        try {
            // 1. Resolve Token Address
            let tokenAddress = addresses['8453']?.ETH || '0x0000000000000000000000000000000000000000';
            let decimals = 18;

            if (escrowData.token === 'USDC') {
                tokenAddress = addresses['8453']?.USDC;
                decimals = 6;
            } else if (escrowData.token === 'USDT') {
                tokenAddress = addresses['8453']?.USDT;
                decimals = 6;
            }

            if (!tokenAddress) throw new Error("Token address not found for " + escrowData.token);

            const amountBigInt = parseUnits(escrowData.amount.toString(), decimals)
            const acceptancePeriod = escrowData.acceptancePeriod ? BigInt(escrowData.acceptancePeriod) : BigInt(30 * 24 * 60 * 60)
            const deliveryPeriod = escrowData.deliveryPeriod ? BigInt(escrowData.deliveryPeriod) : BigInt(14 * 24 * 60 * 60)
            const isNativeETH = tokenAddress === '0x0000000000000000000000000000000000000000';

            // --- STRATEGY SELECTION ---
            // Check if wallet supports atomic batching (e.g. Coinbase Smart Wallet)
            const supportedCapabilities = capabilities?.[activeChainId]
            const canBatch = supportedCapabilities?.atomicBatch?.supported
            const canSponsor = supportedCapabilities?.paymasterService?.supported

            if (canBatch && !isNativeETH) {
                devLog("🚀 Using Batch Transaction (Approve + Create)")

                const calls = []

                // A. Check Allowance (Add Approve if needed)
                const allowance = await publicClient.readContract({
                    address: tokenAddress,
                    abi: MockUSDCABI,
                    functionName: 'allowance',
                    args: [address, ESCROW_ADDRESS]
                })

                if (allowance < amountBigInt) {
                    calls.push({
                        to: tokenAddress,
                        abi: MockUSDCABI,
                        functionName: 'approve',
                        args: [ESCROW_ADDRESS, amountBigInt]
                    })
                }

                // B. Create Escrow Call
                calls.push({
                    to: ESCROW_ADDRESS,
                    abi: EscrowABI,
                    functionName: 'createEscrow',
                    args: [
                        escrowData.seller,
                        escrowData.arbiter,
                        amountBigInt,
                        tokenAddress,
                        escrowData.description,
                        acceptancePeriod,
                        deliveryPeriod
                    ]
                })

                // C. Send Batch
                const id = await sendCallsAsync({
                    calls,
                    capabilities: canSponsor ? {
                        paymasterService: {
                            url: import.meta.env.VITE_PAYMASTER_URL || 'https://api.developer.coinbase.com/rpc/v1/base/paymaster' // Fallback or env
                        }
                    } : undefined
                })

                devLog("Batch sent, bundle ID:", id)
                // Note: We need to wait for the calls to be processed.
                // For simplicity in this demo, we'll wait a fixed time or rely on the Real-time Event Listener to detect the 'EscrowCreated' event which updates the UI.

                // Optimistically return 'pending' or wait for event?
                // For now, let's assume success if no error thrown, but we won't have the Escrow ID immediately without parsing receipt of the batch (which is complex).
                // Let's rely on the event listener. 
                return 'pending-batch' // Component handles this as success

            } else {
                // --- FALLBACK: Standard Sequential Transactions ---

                // 2. Handle Approval (ERC20 Only)
                if (!isNativeETH) {
                    const allowance = await publicClient.readContract({
                        address: tokenAddress,
                        abi: MockUSDCABI,
                        functionName: 'allowance',
                        args: [address, ESCROW_ADDRESS]
                    })

                    if (allowance < amountBigInt) {
                        devLog(`Approving ${escrowData.token}...`)
                        const approveTx = await writeContractAsync({
                            address: tokenAddress,
                            abi: MockUSDCABI,
                            functionName: 'approve',
                            args: [ESCROW_ADDRESS, amountBigInt],
                        })
                        await publicClient.waitForTransactionReceipt({ hash: approveTx })
                        devLog(`${escrowData.token} Approved`)
                    }
                }

                // 3. Create Escrow
                devLog(`Creating ${escrowData.token} Escrow...`)

                // Simulate first
                const { request } = await publicClient.simulateContract({
                    address: ESCROW_ADDRESS,
                    abi: EscrowABI,
                    functionName: 'createEscrow',
                    args: [
                        escrowData.seller,
                        escrowData.arbiter,
                        amountBigInt,
                        tokenAddress,
                        escrowData.description,
                        acceptancePeriod,
                        deliveryPeriod
                    ],
                    value: isNativeETH ? amountBigInt : 0n,
                    account: address
                })

                const tx = await writeContractAsync(request)
                const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
                devLog("Escrow Created:", tx)

                const log = receipt.logs.find(x => x.address.toLowerCase() === ESCROW_ADDRESS.toLowerCase())
                const decodedLog = decodeEventLog({
                    abi: EscrowABI,
                    data: log.data,
                    topics: log.topics
                })

                const newEscrowId = decodedLog.args.escrowId
                devLog("New Escrow ID:", newEscrowId)

                // Refresh actions...
                loadEscrows()
                setTimeout(() => loadEscrows(true), 3000)
                setTimeout(() => loadEscrows(true), 8000)

                // Sub-task: Update call site in createEscrow
                notifyAddress(escrowData.seller, "New Deal Offer", `Someone offered ${escrowData.amount} ${escrowData.token} for a deal.`, newEscrowId)

                return newEscrowId

            }

        } catch (err) {
            console.error("Creation failed:", err)
            throw err
        }
    }, [address, walletClient, publicClient, writeContractAsync, sendCallsAsync, capabilities, activeChainId, ESCROW_ADDRESS, loadEscrows])

    // Notify Helper
    const notifyAddress = async (targetAddress, title, body, dealId) => {
        try {
            if (!targetAddress || !supabase) return

            const { data: userData } = await supabase
                .from('users')
                .select('fid')
                .eq('address', targetAddress.toLowerCase())
                .single()

            if (userData && userData.fid) {
                const targetUrl = dealId ? `${window.location.origin}/deal/${dealId}` : window.location.origin

                await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_NOTIFICATION_SECRET}` },
                    body: JSON.stringify({
                        fid: userData.fid,
                        title,
                        body,
                        targetUrl
                    })
                })
                devLog(`🔔 Notification sent to ${targetAddress} (FID: ${userData.fid})`)
            }
        } catch (err) {
            console.warn("Notification failed:", err)
        }
    }

    // Helper to map generic update to specific functions
    const updateEscrowState = useCallback(async (id, newState, proof = '') => {
        if (!publicClient || !ESCROW_ADDRESS) return

        // Find escrow to verify state
        const escrow = escrows.find(e => e.id === id)
        if (!escrow) {
            console.error("Escrow not found locally", id)
            return
        }

        devLog(`Updating Escrow ${id}: Current State ${escrow.state} -> New State ${newState}`)

        let functionName = ''
        let args = [BigInt(id)]
        let notification = null

        // Map UI State Transition to Contract Function
        if (newState === EscrowState.AWAITING_DELIVERY) {
            if (escrow.state === EscrowState.AWAITING_ACCEPTANCE) {
                functionName = 'acceptDeal'
                notification = { target: escrow.buyer, title: "Deal Accepted", body: "Seller accepted your deal!" }
            } else {
                console.error("Invalid transition: Cannot accept, already in state", escrow.state)
                return
            }
        }
        else if (newState === EscrowState.DELIVERED) {
            if (escrow.state === EscrowState.AWAITING_DELIVERY) {
                functionName = 'markDelivered'
                args = [BigInt(id), proof || '']
                notification = { target: escrow.buyer, title: "Order Delivered", body: "Seller marked order as delivered. Please confirm." }
            } else {
                console.error("Invalid transition to DELIVERED from", escrow.state)
                return
            }
        }
        else if (newState === EscrowState.COMPLETED) {
            // 1. AUTO-RELEASE (Seller claims after 72h)
            if (escrow.state === EscrowState.DELIVERED && Date.now() > escrow.deliveryTimestamp + (3 * 24 * 60 * 60 * 1000)) {
                functionName = 'claimAutoRelease'
            }
            // 2. Buyer releasing
            else if (escrow.state === EscrowState.AWAITING_DELIVERY || escrow.state === EscrowState.DELIVERED) {
                functionName = 'release'
                args = [BigInt(id)]
                notification = { target: escrow.seller, title: "Funds Released", body: "Buyer released the funds to you!" }
            }
            // 3. Arbiter resolving to Seller
            else if (escrow.state === EscrowState.DISPUTED) {
                functionName = 'resolveDispute'
                args = [BigInt(id), escrow.seller]
            }
            else {
                console.error("Invalid transition to COMPLETE from", escrow.state)
                return
            }
        }
        else if (newState === EscrowState.DISPUTED) {
            functionName = 'raiseDispute'
            notification = { target: escrow.seller, title: "Dispute Opened", body: "Buyer opened a dispute on the deal." }
        }
        else if (newState === EscrowState.REFUNDED) {
            const isBuyer = address && escrow.buyer && address.toLowerCase() === escrow.buyer.toLowerCase()
            const isSeller = address && escrow.seller && address.toLowerCase() === escrow.seller.toLowerCase()

            // 1. Buyer Cancelling Deal (before seller accepts)
            if (escrow.state === EscrowState.AWAITING_ACCEPTANCE && isBuyer) {
                functionName = 'claimRefund'
                notification = { target: escrow.seller, title: "Deal Cancelled", body: "Buyer cancelled the offer." }
            }
            // 2. Seller Refusing Deal
            else if (escrow.state === EscrowState.AWAITING_ACCEPTANCE && isSeller) {
                functionName = 'rejectDeal'
                notification = { target: escrow.buyer, title: "Deal Rejected", body: "Seller rejected your offer." }
            }
            // 3. Arbiter resolving to Buyer
            else if (escrow.state === EscrowState.DISPUTED) {
                functionName = 'resolveDispute'
                args = [BigInt(id), escrow.buyer]
                notification = { target: escrow.seller, title: "Dispute Resolved", body: "Arbiter resolved dispute in favor of Buyer." }
            }
            else {
                console.error("Invalid transition to REFUND from", escrow.state, { address, isBuyer, isSeller })
                return
            }
        }

        if (!functionName) {
            console.error("No function mapped for state transition")
            return
        }

        try {
            devLog(`Calling Contract: ${functionName}`, args)
            const tx = await writeContractAsync({
                address: ESCROW_ADDRESS,
                abi: EscrowABI,
                functionName,
                args
            })
            devLog("Transaction sent:", tx)

            await publicClient.waitForTransactionReceipt({ hash: tx })
            devLog("Transaction confirmed!")

            // Refresh immediately + retries for Graph indexing
            loadEscrows()
            setTimeout(() => loadEscrows(true), 3000)
            setTimeout(() => loadEscrows(true), 8000)

            // Send Notification
            if (notification) {
                notifyAddress(notification.target, notification.title, notification.body, id)
            }

        } catch (err) {
            console.error("Contract Call Failed:", err)
            // Parse error for user-friendly message
            const errorMessage = err?.message || err?.toString() || 'Unknown error'
            const friendlyError = Object.entries(ERROR_MESSAGES).find(([key]) =>
                errorMessage.toLowerCase().includes(key.toLowerCase())
            )?.[1] || `Transaction failed: ${errorMessage.slice(0, 100)}`

            const enhancedError = new Error(friendlyError)
            enhancedError.originalError = err
            throw enhancedError
        }
    }, [escrows, publicClient, ESCROW_ADDRESS, writeContractAsync, loadEscrows, address])



    const getMyEscrows = useCallback(() => {
        if (!address) return []
        return escrows.filter(e =>
            e.buyer.toLowerCase() === address.toLowerCase() ||
            e.seller.toLowerCase() === address.toLowerCase() ||
            e.arbiter.toLowerCase() === address.toLowerCase()
        )
    }, [escrows, address])

    const fetchDealById = useCallback(async (id) => {
        if (!publicClient || !ESCROW_ADDRESS) return null

        try {
            const data = await publicClient.readContract({
                address: ESCROW_ADDRESS,
                abi: EscrowABI,
                functionName: 'escrows',
                args: [BigInt(id)]
            })

            // Struct order: 0:buyer, 1:seller, 2:arbiter, 3:token, 4:amount, 5:state, ...
            const tokenAddr = data[3].toLowerCase()
            const isETH = tokenAddr === '0x0000000000000000000000000000000000000000'
            const isUSDC = tokenAddr === addresses.USDC?.toLowerCase() || tokenAddr === addresses['8453']?.USDC?.toLowerCase()

            const decimals = isETH ? 18 : 6
            const symbol = isETH ? 'ETH' : (isUSDC ? 'USDC' : 'Token')

            const deal = {
                id: Number(id),
                buyer: data[0],
                seller: data[1],
                arbiter: data[2],
                amount: formatUnits(data[4], decimals),
                token: symbol,
                description: data[11],
                state: Number(data[5]),
                deadline: (Number(data[5]) === 0 ? Number(data[6]) : Number(data[7])) * 1000,
                deliveryTimestamp: Number(data[8]) * 1000,
                proofOfDelivery: data[12],
            }

            // Optional: Merge with Supabase if needed (omitted for speed in public view)
            return deal
        } catch (err) {
            console.error("Failed to fetch deal:", id, err)
            return null
        }
    }, [publicClient, ESCROW_ADDRESS])

    const getUserStats = useCallback(async (userAddress) => {
        if (!supabase || !userAddress) return { completed: 0, volume: 0, recentDeals: [] }

        try {
            // Fetch completed deals for volume calculation
            const { data, error } = await supabase
                .from('escrows')
                .select('*')
                .or(`seller_address.eq.${userAddress.toLowerCase()},buyer_address.eq.${userAddress.toLowerCase()}`)
                .eq('state', EscrowState.COMPLETED)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Calculate Volume (simplified: sum of amounts, ignoring token diffs for MVP or assuming $1 parity for stablecoins, ETH separate)
            // Ideally we'd convert using historical price, but for MVP let's just sum specific tokens or provide a breakdown.
            // Let's return a breakdown.

            let ethVolume = 0
            let stableVolume = 0

            data.forEach(deal => {
                const amount = parseFloat(deal.amount || 0)
                if (deal.token === 'ETH') ethVolume += amount
                else stableVolume += amount // USDC/USDT
            })

            return {
                completed: data.length,
                ethVolume,
                stableVolume,
                recentDeals: data.slice(0, 5)
            }
        } catch (err) {
            console.error("Failed to fetch user stats:", err)
            return { completed: 0, volume: 0, recentDeals: [] }
        }
    }, [])

    const value = {
        escrows,
        loading,
        createEscrow,
        updateEscrowState,
        getMyEscrows,
        getUserStats,
        fetchDealById,
        refreshEscrows: loadEscrows,
    }

    return (
        <EscrowsContext.Provider value={value}>
            {children}
        </EscrowsContext.Provider>
    )
}

export function useEscrows() {
    return useContext(EscrowsContext)
}
