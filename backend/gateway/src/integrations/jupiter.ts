import axios from 'axios';
import { cache } from '../utils/cache';

const JUPITER_PRICE_API_V3 = 'https://lite-api.jup.ag/price/v3';
const CACHE_TTL = 30000; // 30 seconds for price data

export interface JupiterPriceData {
    usdPrice: number;
    blockId: number;
    decimals: number;
    priceChange24h: number;
}

export interface JupiterPriceResponse {
    [tokenAddress: string]: JupiterPriceData;
}

/**
 * Fetch price data from Jupiter Price API V3
 * @param tokenAddress Solana token mint address
 * @returns Price data or null if unavailable
 */
export async function getJupiterPrice(tokenAddress: string): Promise<JupiterPriceData | null> {
    const cacheKey = `jupiter:price:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<JupiterPriceData>(cacheKey);
    if (cached) {
        console.log('[JUPITER] Using cached price data');
        return cached;
    }

    try {
        console.log('[JUPITER] Fetching price data...');
        const response = await axios.get<JupiterPriceResponse>(JUPITER_PRICE_API_V3, {
            params: {
                ids: tokenAddress
            },
            timeout: 5000
        });

        const priceData = response.data[tokenAddress];

        if (!priceData) {
            console.log('[JUPITER] No price data available for token');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, priceData, CACHE_TTL);

        console.log('[JUPITER] Price fetched successfully:', priceData.usdPrice);
        return priceData;
    } catch (error: any) {
        console.error('[JUPITER] Error fetching price:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Fetch prices for multiple tokens at once (up to 50)
 * @param tokenAddresses Array of Solana token mint addresses
 * @returns Map of token addresses to price data
 */
export async function getJupiterPrices(tokenAddresses: string[]): Promise<Map<string, JupiterPriceData>> {
    if (tokenAddresses.length === 0) {
        return new Map();
    }

    if (tokenAddresses.length > 50) {
        throw new Error('Jupiter API supports maximum 50 token addresses per request');
    }

    const result = new Map<string, JupiterPriceData>();
    const uncachedTokens: string[] = [];

    // Check cache for each token
    for (const address of tokenAddresses) {
        const cacheKey = `jupiter:price:${address}`;
        const cached = cache.get<JupiterPriceData>(cacheKey);

        if (cached) {
            result.set(address, cached);
        } else {
            uncachedTokens.push(address);
        }
    }

    // If all tokens were cached, return early
    if (uncachedTokens.length === 0) {
        console.log('[JUPITER] All prices from cache');
        return result;
    }

    try {
        console.log(`[JUPITER] Fetching prices for ${uncachedTokens.length} tokens...`);
        const response = await axios.get<JupiterPriceResponse>(JUPITER_PRICE_API_V3, {
            params: {
                ids: uncachedTokens.join(',')
            },
            timeout: 5000
        });

        // Process and cache each result
        for (const [address, priceData] of Object.entries(response.data)) {
            result.set(address, priceData);
            cache.set(`jupiter:price:${address}`, priceData, CACHE_TTL);
        }

        console.log(`[JUPITER] Fetched ${Object.keys(response.data).length} prices successfully`);
        return result;
    } catch (error: any) {
        console.error('[JUPITER] Error fetching prices:', {
            message: error.message,
            status: error.response?.status
        });
        return result; // Return cached results if API fails
    }
}
