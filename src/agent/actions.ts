import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { createWalletClient, http, parseEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// Minimal ABI for Escrow contract interaction
const ESCROW_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "seller", "type": "address" },
            { "internalType": "address", "name": "arbiter", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "string", "name": "desc", "type": "string" },
            { "internalType": "uint256", "name": "accPeriod", "type": "uint256" },
            { "internalType": "uint256", "name": "delPeriod", "type": "uint256" }
        ],
        "name": "createEscrow",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "acceptDeal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "string", "name": "proof", "type": "string" }
        ],
        "name": "markDelivered",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "release",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "raiseDispute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "address", "name": "winner", "type": "address" }
        ],
        "name": "resolveDispute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "claimRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "claimAutoRelease",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "getEscrow",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "buyer", "type": "address" },
                    { "internalType": "address", "name": "seller", "type": "address" },
                    { "internalType": "address", "name": "arbiter", "type": "address" },
                    { "internalType": "address", "name": "token", "type": "address" },
                    { "internalType": "uint256", "name": "amount", "type": "uint256" },
                    { "internalType": "uint8", "name": "state", "type": "uint8" },
                    { "internalType": "uint48", "name": "acceptanceDeadline", "type": "uint48" },
                    { "internalType": "uint48", "name": "deliveryDeadline", "type": "uint48" },
                    { "internalType": "uint48", "name": "deliveryTimestamp", "type": "uint48" },
                    { "internalType": "uint48", "name": "disputeTimestamp", "type": "uint48" },
                    { "internalType": "uint48", "name": "deliveryPeriod", "type": "uint48" },
                    { "internalType": "string", "name": "description", "type": "string" },
                    { "internalType": "string", "name": "proofOfDelivery", "type": "string" }
                ],
                "internalType": "struct Escrow.Deal",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Helper to get wallet client
const getWallet = (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("BASE_PRIVATE_KEY") as `0x${string}`;
    if (!privateKey) throw new Error("BASE_PRIVATE_KEY not configured");

    // Validate private key format
    if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
        throw new Error("Invalid BASE_PRIVATE_KEY format. Must start with 0x and be 66 chars.");
    }

    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
        account,
        chain: base,
        transport: http(runtime.getSetting("BASE_RPC_URL") || "https://mainnet.base.org")
    });

    return { account, client };
};

const getEscrowAddress = (runtime: IAgentRuntime) => {
    const addr = runtime.getSetting("ESCROW_CONTRACT_ADDRESS");
    if (!addr) throw new Error("ESCROW_CONTRACT_ADDRESS not configured in env");
    return addr as `0x${string}`;
}

export const createEscrowAction: Action = {
    name: "CREATE_ESCROW",
    similes: ["START_ESCROW", "NEW_DEAL", "CREATE_TRANSACTION"],
    description: "Create a new escrow deal on BaseTrust.",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const content = message.content;
            const seller = (content.seller as string);
            const amountStr = (content.amount as string) || "0.001";
            const amount = parseEther(amountStr);
            const desc = (content.description as string) || "Deal";

            if (!seller) {
                callback?.({ text: "I need a seller address to create an escrow." });
                return false;
            }

            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);
            // Use arbiter from content, or default to zero address (no arbiter)
            const arbiter = (content.arbiter as string) || "0x0000000000000000000000000000000000000000";

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'createEscrow',
                args: [
                    seller as `0x${string}`,
                    arbiter as `0x${string}`,
                    amount,
                    "0x0000000000000000000000000000000000000000", // ETH
                    desc,
                    BigInt(86400 * 3), // 3 days accept
                    BigInt(86400 * 7)  // 7 days deliver
                ],
                value: amount,
                chain: base,
                account
            });

            callback?.({
                text: `Escrow created! Transaction Hash: ${hash}`,
                action: "CREATE_ESCROW_RESPONSE"
            });
            return true;
        } catch (error) {
            elizaLogger.error("Error creating escrow", error);
            callback?.({ text: `Failed to create escrow: ${error.message}` });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Create an escrow deal for 0.01 ETH with seller 0x123..." },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll create that escrow deal now.",
                    action: "CREATE_ESCROW",
                },
            },
        ],
    ],
};

export const acceptDealAction: Action = {
    name: "ACCEPT_DEAL",
    similes: ["ACCEPT_ESCROW", "CONFIRM_DEAL"],
    description: "Accept an existing escrow deal.",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'acceptDeal',
                args: [id],
                chain: base,
                account
            });

            callback?.({ text: `Deal ${id} accepted! Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to accept deal: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const markDeliveredAction: Action = {
    name: "MARK_DELIVERED",
    similes: ["CONFIRM_DELIVERY", "ITEM_SENT"],
    description: "Mark an escrow deal as delivered (for sellers).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const proof = (message.content.proof as string) || "Delivered via Agent";
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'markDelivered',
                args: [id, proof],
                chain: base,
                account
            });

            callback?.({ text: `Marked deal ${id} as delivered. Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to mark delivered: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const releaseFundsAction: Action = {
    name: "RELEASE_FUNDS",
    similes: ["PAY_SELLER", "COMPLETE_DEAL"],
    description: "Release funds to the seller (for buyers).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'release',
                args: [id],
                chain: base,
                account
            });

            callback?.({ text: `Funds released for deal ${id}! Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to release funds: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const raiseDisputeAction: Action = {
    name: "RAISE_DISPUTE",
    similes: ["DISPUTE_DEAL", "OPEN_DISPUTE", "CONTEST"],
    description: "Raise a dispute on a delivered escrow (for buyers only).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'raiseDispute',
                args: [id],
                chain: base,
                account
            });

            callback?.({ text: `Dispute raised for deal ${id}! Hash: ${hash}. Arbiter will review.` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to raise dispute: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const resolveDisputeAction: Action = {
    name: "RESOLVE_DISPUTE",
    similes: ["SETTLE_DISPUTE", "ARBITRATE", "JUDGE"],
    description: "Resolve a dispute as arbiter, choosing winner (buyer or seller).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const winner = message.content.winner as string;
            if (!winner) {
                callback?.({ text: "I need a winner address (buyer or seller) to resolve the dispute." });
                return false;
            }
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'resolveDispute',
                args: [id, winner as `0x${string}`],
                chain: base,
                account
            });

            callback?.({ text: `Dispute resolved for deal ${id}! Winner: ${winner}. Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to resolve dispute: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const claimRefundAction: Action = {
    name: "CLAIM_REFUND",
    similes: ["GET_REFUND", "REFUND_ME", "CANCEL_DEAL"],
    description: "Claim refund for an expired/unaccepted deal (for buyers).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'claimRefund',
                args: [id],
                chain: base,
                account
            });

            callback?.({ text: `Refund claimed for deal ${id}! Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to claim refund: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const claimAutoReleaseAction: Action = {
    name: "CLAIM_AUTO_RELEASE",
    similes: ["AUTO_RELEASE", "CLAIM_72H", "SAFETY_RELEASE"],
    description: "Claim auto-release after 72h if buyer hasn't responded (for sellers).",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("BASE_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const { client, account } = getWallet(runtime);
            const contractAddr = getEscrowAddress(runtime);

            const hash = await client.writeContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'claimAutoRelease',
                args: [id],
                chain: base,
                account
            });

            callback?.({ text: `Auto-release claimed for deal ${id}! Funds released. Hash: ${hash}` });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to claim auto-release: ${error.message}` });
            return false;
        }
    },
    examples: []
};

export const getEscrowAction: Action = {
    name: "GET_ESCROW",
    similes: ["CHECK_DEAL", "ESCROW_STATUS", "DEAL_INFO"],
    description: "Get details of an escrow deal by ID.",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("ESCROW_CONTRACT_ADDRESS");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const id = BigInt((message.content.escrowId as string) || 0);
            const contractAddr = getEscrowAddress(runtime);

            const { createPublicClient } = await import("viem");
            const publicClient = createPublicClient({
                chain: base,
                transport: http(runtime.getSetting("BASE_RPC_URL") || "https://mainnet.base.org")
            });

            const escrow = await publicClient.readContract({
                address: contractAddr,
                abi: ESCROW_ABI,
                functionName: 'getEscrow',
                args: [id]
            }) as { buyer: string; seller: string; amount: bigint; state: number; description: string };

            const states = ['AWAITING_ACCEPTANCE', 'AWAITING_DELIVERY', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'REFUNDED'];
            callback?.({
                text: `Deal #${id}:\n- Buyer: ${escrow.buyer}\n- Seller: ${escrow.seller}\n- Amount: ${escrow.amount}\n- State: ${states[escrow.state] || escrow.state}\n- Description: ${escrow.description}`
            });
            return true;
        } catch (error) {
            callback?.({ text: `Failed to get escrow: ${error.message}` });
            return false;
        }
    },
    examples: []
};

