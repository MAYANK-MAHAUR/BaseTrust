/**
 * HeyElsa x402 API Client
 * DeFi API integration with micropayments for token prices and wallet analysis
 * 
 * Powered by HeyElsa - https://x402.heyelsa.ai
 * Official Docs: https://x402.heyelsa.ai/docs
 * 
 * x402 Payment Protocol:
 * 1. Initial request returns 402 with payment requirements
 * 2. Client signs a USDC payment authorization
 * 3. Retry request with X-PAYMENT header
 * 4. Server verifies and returns data
 */

import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Use proxy in production to bypass CORS, direct API in development (if CORS allows)
const IS_PRODUCTION = import.meta.env.PROD;
const HEYELSA_PROXY_URL = '/api/heyelsa';
// Correct Base URL from Docs
const HEYELSA_DIRECT_URL = import.meta.env.VITE_HEYELSA_API_URL || 'https://x402-api.heyelsa.ai';
const PAYMENT_PRIVATE_KEY = import.meta.env.VITE_HEYELSA_PAYMENT_KEY;

// Token address mappings for Base chain
const TOKEN_ADDRESSES = {
    ETH: '0x4200000000000000000000000000000000000006', // WETH on Base
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
};

// USDC contract address on Base for payments
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * Create a payment signature for x402
 * @param {object} paymentDetails - Payment requirements from 402 response
 * @returns {string} Signed payment header
 */
async function createPaymentSignature(paymentDetails) {
    if (!PAYMENT_PRIVATE_KEY) {
        console.warn('[HeyElsa x402] No payment key configured, skipping payment');
        return null;
    }

    try {
        const account = privateKeyToAccount(PAYMENT_PRIVATE_KEY);
        const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http(),
        });

        const { recipient, payTo, amount, maxAmountRequired, nonce, expires } = paymentDetails || {};

        // Map fields with fallbacks
        const finalRecipient = recipient || payTo;
        const finalAmount = amount || maxAmountRequired;
        const finalNonce = nonce || Date.now().toString(); // Generate nonce if missing
        const finalExpires = expires || (Date.now() + 3600 * 1000).toString(); // Default 1h expiry

        if (!finalAmount || !finalRecipient) {
            // Check if nested in 'requirements'
            if (paymentDetails?.requirements) {
                return createPaymentSignature(paymentDetails.requirements);
            }
            // Check if nested in 'accepts' array (Standard x402)
            if (Array.isArray(paymentDetails?.accepts) && paymentDetails.accepts.length > 0) {
                console.log('[HeyElsa x402] Found payment requirements in accepts[0]:', paymentDetails.accepts[0]);
                return createPaymentSignature(paymentDetails.accepts[0]);
            }
            console.error('[HeyElsa x402] Invalid payment requirements structure:', paymentDetails);
            return null;
        }

        const amountWei = BigInt(finalAmount.toString()); // Amount is likely in atomic units (wei)

        // EIP-3009 TransferWithAuthorization Domain
        const domain = {
            name: "USD Coin",
            version: "2",
            chainId: 8453, // Base
            verifyingContract: USDC_ADDRESS,
        };

        // EIP-3009 Types
        const types = {
            TransferWithAuthorization: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "validAfter", type: "uint256" },
                { name: "validBefore", type: "uint256" },
                { name: "nonce", type: "bytes32" },
            ],
        };

        // Payment values
        const values = {
            from: account.address,
            to: finalRecipient,
            value: amountWei,
            validAfter: 0n,
            validBefore: BigInt(finalExpires), // 1h expiry
            nonce: pad(toHex(BigInt(finalNonce)), { size: 32 }), // pad nonce to bytes32
        };

        console.log('[HeyElsa x402] Signing EIP-3009 TransferWithAuthorization:', values);

        // Sign the typed data
        const signature = await walletClient.signTypedData({
            domain,
            types,
            primaryType: 'TransferWithAuthorization',
            message: values,
        });

        // Create the X-PAYMENT header value
        // Server expects the signed message params to verify/execute
        const paymentHeader = btoa(JSON.stringify({
            version: '1',
            message: {
                ...values,
                value: values.value.toString(),
                validAfter: values.validAfter.toString(),
                validBefore: values.validBefore.toString(),
            },
            signature,
            payer: account.address,
        }));

        console.log('[HeyElsa x402] Payment signed for:', amount, 'USDC');
        return paymentHeader;
    } catch (error) {
        console.error('[HeyElsa x402] Failed to create payment:', error.message);
        return null;
    }
}

// x402-enabled client wrapper
class HeyElsaClient {
    constructor() {
        this.useProxy = IS_PRODUCTION;
        this.cache = new Map();
        this.cacheTTL = 60000; // 1 minute cache
        this.x402Enabled = !!PAYMENT_PRIVATE_KEY;

        if (this.useProxy) {
            console.log('[HeyElsa] Using Vercel proxy (production)');
        } else {
            console.log('[HeyElsa] Using direct API (development)');
        }
    }

    /**
     * Make an x402 API request with automatic payment handling
     * @param {string} endpoint - API endpoint (e.g., /api/get_token_price)
     * @param {object} body - JSON payload
     * @returns {object} API response data
     */
    async request(endpoint, body = {}) {
        const cacheKey = `${endpoint}:${JSON.stringify(body)}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            console.log('[HeyElsa] Using cached response for:', endpoint);
            return cached.data;
        }

        // Build URL based on environment
        let url;
        let fetchOptions = {
            method: 'POST', // API uses POST for everything
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        };

        if (this.useProxy) {
            // Use Vercel proxy - pass endpoint as query param, body as POST body
            url = new URL(HEYELSA_PROXY_URL, window.location.origin);
            url.searchParams.append('endpoint', endpoint);
        } else {
            // Direct API call (development)
            url = new URL(`${HEYELSA_DIRECT_URL}${endpoint}`);
        }

        console.log('[HeyElsa] Requesting:', url.toString(), 'Body:', body);

        try {
            // First attempt - may return 402 Payment Required
            let response = await fetch(url.toString(), fetchOptions);

            // Handle x402 Payment Required
            if (response.status === 402 && this.x402Enabled) {
                console.log('[HeyElsa x402] Payment required, processing...');

                const paymentInfo = await response.json();
                console.log('[HeyElsa x402] Payment requirements:', paymentInfo); // DEBUG: Log actual structure

                const paymentHeader = await createPaymentSignature(paymentInfo);

                if (paymentHeader) {
                    // Retry with payment header
                    fetchOptions.headers['X-PAYMENT'] = paymentHeader;
                    response = await fetch(url.toString(), fetchOptions);
                    console.log('[HeyElsa x402] Retry status:', response.status);
                }
            }

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorText = await response.text();
                    errorDetails = errorText ? ` - Body: ${errorText.substring(0, 200)}` : '';
                    console.error(`[HeyElsa] API Error (${response.status}):`, errorText);
                } catch (e) {
                    console.error(`[HeyElsa] API Error (${response.status}) - Could not read body`);
                }

                throw new Error(`HeyElsa API error: ${response.status}${errorDetails}`);
            }

            const data = await response.json();

            // Cache successful responses
            this.cache.set(cacheKey, { data, timestamp: Date.now() });

            return data;
        } catch (error) {
            console.warn('[HeyElsa] API request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get token price in USD
     * Endpoint: /api/get_token_price
     */
    async getTokenPrice(tokenSymbol, chain = 'base') {
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol.toUpperCase()];
        if (!tokenAddress) {
            console.warn('[HeyElsa] Unknown token:', tokenSymbol);
            return null;
        }

        try {
            const response = await this.request('/api/get_token_price', {
                token_address: tokenAddress,
                chain: chain,
            });

            // Handle response format variations (check docs/response)
            const price = response?.price_usd || response?.price || response?.result?.priceUSD;
            if (!price) return null;

            return {
                price: parseFloat(price),
                symbol: tokenSymbol,
                source: 'heyelsa',
            };
        } catch (error) {
            console.warn('[HeyElsa] getTokenPrice failed:', error.message);
            return null;
        }
    }

    /**
     * Analyze a wallet's behavior and risk
     * Endpoint: /api/analyze_wallet
     */
    async analyzeWallet(walletAddress, chain = 'base') {
        try {
            const response = await this.request('/api/analyze_wallet', {
                wallet_address: walletAddress,
                chain: chain,
            });

            return {
                riskLevel: response?.risk_level || 'unknown',
                riskScore: response?.risk_score || 0,
                // Map other fields as needed based on actual API response
                source: 'heyelsa',
                raw: response
            };
        } catch (error) {
            console.warn('[HeyElsa] analyzeWallet failed:', error.message);
            return null;
        }
    }

    /**
     * Get portfolio balances
     * Endpoint: /api/get_portfolio
     */
    async getPortfolio(walletAddress, chain = 'base') {
        try {
            const response = await this.request('/api/get_portfolio', {
                wallet_address: walletAddress,
                chain: chain,
            });

            return {
                totalUsd: response?.total_value_usd || 0,
                chains: response?.chains || [],
                portfolio: response?.portfolio || {},
                source: 'heyelsa',
            };
        } catch (error) {
            console.warn('[HeyElsa] getPortfolio failed:', error.message);
            return null;
        }
    }

    /**
     * Search for tokens
     * Endpoint: /api/search_token
     */
    async searchToken(query, limit = 5) {
        try {
            const response = await this.request('/api/search_token', {
                symbol_or_address: query,
                limit: limit,
            });

            return response?.result?.results || [];
        } catch (error) {
            console.warn('[HeyElsa] searchToken failed:', error.message);
            return [];
        }
    }

    isPaymentEnabled() {
        return this.x402Enabled;
    }
}

export const heyelsa = new HeyElsaClient();

export const getTokenPrice = (symbol, chain) => heyelsa.getTokenPrice(symbol, chain);
export const analyzeWallet = (address, chain) => heyelsa.analyzeWallet(address, chain);
export const getPortfolio = (address, chain) => heyelsa.getPortfolio(address, chain);
export const searchToken = (query, limit) => heyelsa.searchToken(query, limit);
export const isPaymentEnabled = () => heyelsa.isPaymentEnabled();

// Fallback price fetcher using CoinGecko (unchanged)
export async function getPriceWithFallback(tokenSymbol) {
    const elsaPrice = await getTokenPrice(tokenSymbol);
    if (elsaPrice?.price) {
        return { ...elsaPrice, source: 'heyelsa' };
    }

    console.log('[HeyElsa] Falling back to CoinGecko for:', tokenSymbol);
    try {
        const ids = {
            ETH: 'ethereum',
            USDC: 'usd-coin',
            USDT: 'tether',
        };
        const coinId = ids[tokenSymbol.toUpperCase()];
        if (!coinId) return null;

        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await res.json();

        return {
            price: data[coinId]?.usd || null,
            symbol: tokenSymbol,
            source: 'coingecko',
        };
    } catch (error) {
        console.warn('[HeyElsa] CoinGecko fallback failed:', error.message);
        return null;
    }
}

export default heyelsa;
