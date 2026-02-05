/**
 * HeyElsa x402 API Client
 * DeFi API integration with micropayments for token prices and wallet analysis
 * 
 * Powered by HeyElsa - https://x402-api.heyelsa.ai
 * 
 * x402 Payment Protocol:
 * 1. Initial request returns 402 with payment requirements
 * 2. Client signs a USDC payment authorization
 * 3. Retry request with X-PAYMENT header
 * 4. Server verifies and returns data
 */

import { createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Use proxy in production to bypass CORS, direct API in development for testing
const IS_PRODUCTION = import.meta.env.PROD;
const HEYELSA_PROXY_URL = '/api/heyelsa';
// UPDATED: Correct API URL from HeyElsa documentation
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

        // Extract payment info
        const { recipient, amount, nonce, expires } = paymentDetails;
        const amountWei = parseUnits(amount.toString(), 6); // USDC has 6 decimals

        // Create payment message to sign
        const message = JSON.stringify({
            version: '1',
            type: 'x402-payment',
            chain: 'base',
            token: USDC_ADDRESS,
            recipient,
            amount: amountWei.toString(),
            nonce,
            expires,
            payer: account.address,
        });

        // Sign the payment authorization
        const signature = await walletClient.signMessage({
            message,
        });

        // Create the X-PAYMENT header value
        const paymentHeader = btoa(JSON.stringify({
            version: '1',
            message,
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

        if (this.x402Enabled) {
            console.log('[HeyElsa] x402 payments ENABLED');
        } else {
            console.log('[HeyElsa] x402 payments DISABLED (no VITE_HEYELSA_PAYMENT_KEY)');
        }
    }

    /**
     * Make an x402 API request with automatic payment handling
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @returns {object} API response data
     */
    async request(endpoint, params = {}) {
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            console.log('[HeyElsa] Using cached response for:', endpoint);
            return cached.data;
        }

        // Build URL based on environment
        let url;
        if (this.useProxy) {
            // Use Vercel proxy - pass endpoint as query param
            url = new URL(HEYELSA_PROXY_URL, window.location.origin);
            url.searchParams.append('endpoint', endpoint);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
        } else {
            // Direct API call (development)
            url = new URL(`${HEYELSA_DIRECT_URL}${endpoint}`);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
        }

        console.log('[HeyElsa] Requesting:', url.toString());

        try {
            // First attempt - may return 402 Payment Required
            let response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            // Handle x402 Payment Required
            if (response.status === 402 && this.x402Enabled) {
                console.log('[HeyElsa x402] Payment required, processing...');

                const paymentInfo = await response.json();
                const paymentHeader = await createPaymentSignature(paymentInfo);

                if (paymentHeader) {
                    // Retry with payment header
                    response = await fetch(url.toString(), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-PAYMENT': paymentHeader,
                        },
                    });

                    console.log('[HeyElsa x402] Retry status:', response.status);
                }
            }

            if (!response.ok) {
                // Try to read error body for better debugging of Vercel proxy errors
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

            console.log('[HeyElsa] Response:', data);
            return data;
        } catch (error) {
            console.warn('[HeyElsa] API request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get token price in USD
     * @param {string} tokenSymbol - Token symbol (ETH, USDC, USDT)
     * @param {string} chain - Chain name (default: base)
     */
    async getTokenPrice(tokenSymbol, chain = 'base') {
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol.toUpperCase()];
        if (!tokenAddress) {
            console.warn('[HeyElsa] Unknown token:', tokenSymbol);
            return null;
        }

        try {
            const response = await this.request('/v1/token/price', {
                token_address: tokenAddress,
                chain: chain,
            });

            return {
                price: response?.price_usd || response?.price || null,
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
     * @param {string} walletAddress - Wallet address to analyze
     * @param {string} chain - Chain name (default: base)
     */
    async analyzeWallet(walletAddress, chain = 'base') {
        try {
            const response = await this.request('/v1/wallet/analyze', {
                wallet_address: walletAddress,
                chain: chain,
            });

            return {
                riskLevel: response?.risk_level || 'unknown',
                riskScore: response?.risk_score || 0,
                walletAge: response?.wallet_age_days || null,
                txCount: response?.transaction_count || 0,
                portfolio: response?.portfolio_usd || 0,
                labels: response?.labels || [],
                source: 'heyelsa',
            };
        } catch (error) {
            console.warn('[HeyElsa] analyzeWallet failed:', error.message);
            return null;
        }
    }

    /**
     * Get portfolio balances for a wallet
     * @param {string} walletAddress - Wallet address
     * @param {string} chain - Chain name (default: base)
     */
    async getPortfolio(walletAddress, chain = 'base') {
        try {
            const response = await this.request('/v1/portfolio', {
                wallet_address: walletAddress,
                chain: chain,
            });

            return {
                totalUsd: response?.total_usd || 0,
                tokens: response?.tokens || [],
                source: 'heyelsa',
            };
        } catch (error) {
            console.warn('[HeyElsa] getPortfolio failed:', error.message);
            return null;
        }
    }

    /**
     * Search for tokens by name or symbol
     * @param {string} query - Search query
     * @param {number} limit - Max results (default: 5)
     */
    async searchToken(query, limit = 5) {
        try {
            const response = await this.request('/v1/token/search', {
                query: query,
                limit: limit,
            });

            return response?.tokens || [];
        } catch (error) {
            console.warn('[HeyElsa] searchToken failed:', error.message);
            return [];
        }
    }

    /**
     * Check if x402 payments are enabled
     */
    isPaymentEnabled() {
        return this.x402Enabled;
    }
}

// Export singleton instance
export const heyelsa = new HeyElsaClient();

// Export convenience functions
export const getTokenPrice = (symbol, chain) => heyelsa.getTokenPrice(symbol, chain);
export const analyzeWallet = (address, chain) => heyelsa.analyzeWallet(address, chain);
export const getPortfolio = (address, chain) => heyelsa.getPortfolio(address, chain);
export const searchToken = (query, limit) => heyelsa.searchToken(query, limit);
export const isPaymentEnabled = () => heyelsa.isPaymentEnabled();

// Fallback price fetcher using CoinGecko
export async function getPriceWithFallback(tokenSymbol) {
    // Try HeyElsa first
    const elsaPrice = await getTokenPrice(tokenSymbol);
    if (elsaPrice?.price) {
        return { ...elsaPrice, source: 'heyelsa' };
    }

    // Fallback to CoinGecko
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
