import axios from 'axios';
import { cache } from '../utils/cache';

const DEXSCREENER_API_BASE = 'https://api.dexscreener.com';
const CACHE_TTL = 60000; // 1 minute

export interface DexScreenerToken {
    address: string;
    name: string;
    symbol: string;
}

export interface DexScreenerTxns {
    buys: number;
    sells: number;
}

export interface DexScreenerPair {
    chainId: string;
    dexId: string;
    pairAddress: string;
    baseToken: DexScreenerToken;
    quoteToken: DexScreenerToken;
    priceNative: string;
    priceUsd: string;
    txns: {
        m5: DexScreenerTxns;
        h1: DexScreenerTxns;
        h6: DexScreenerTxns;
        h24: DexScreenerTxns;
    };
    volume: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    priceChange: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    liquidity: {
        usd: number;
        base: number;
        quote: number;
    };
    fdv: number;
    marketCap: number;
    pairCreatedAt: number;
    info?: {
        imageUrl?: string;
        websites?: Array<{ url: string }>;
        socials?: Array<{ type: string; url: string }>;
    };
    boosts?: {
        active: number;
    };
}

export interface DexScreenerResponse {
    schemaVersion: string;
    pairs: DexScreenerPair[];
}

/**
 * Get token pairs from DexScreener
 * @param tokenAddress Solana token mint address
 * @returns Array of trading pairs or null if unavailable
 */
export async function getDexScreenerPairs(tokenAddress: string): Promise<DexScreenerPair[] | null> {
    const cacheKey = `dexscreener:pairs:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<DexScreenerPair[]>(cacheKey);
    if (cached) {
        console.log('[DEXSCREENER] Using cached pair data');
        return cached;
    }

    try {
        console.log('[DEXSCREENER] Fetching token pairs...');
        const response = await axios.get<DexScreenerResponse>(
            `${DEXSCREENER_API_BASE}/latest/dex/tokens/${tokenAddress}`,
            { timeout: 5000 }
        );

        const pairs = response.data.pairs || [];

        if (pairs.length === 0) {
            console.log('[DEXSCREENER] No pairs found for token');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, pairs, CACHE_TTL);

        console.log(`[DEXSCREENER] Found ${pairs.length} trading pairs`);
        return pairs;
    } catch (error: any) {
        console.error('[DEXSCREENER] Error fetching pairs:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Get token data (combines all pairs for a token)
 * @param tokenAddress Solana token mint address
 * @returns Token data summary or null if unavailable
 */
export async function getDexScreenerTokenData(tokenAddress: string) {
    const pairs = await getDexScreenerPairs(tokenAddress);

    if (!pairs || pairs.length === 0) {
        return null;
    }

    // Find the main pair (usually the one with highest liquidity)
    const mainPair = pairs.reduce((max, pair) =>
        (pair.liquidity?.usd || 0) > (max.liquidity?.usd || 0) ? pair : max
    );

    return {
        mainPair,
        allPairs: pairs,
        totalLiquidity: pairs.reduce((sum, pair) => sum + (pair.liquidity?.usd || 0), 0),
        totalVolume24h: pairs.reduce((sum, pair) => sum + (pair.volume?.h24 || 0), 0),
        averagePrice: mainPair.priceUsd,
        priceChange24h: mainPair.priceChange?.h24 || 0,
        marketCap: mainPair.marketCap,
        fdv: mainPair.fdv
    };
}

/**
 * Search for tokens by query
 * @param query Search query (token name, symbol, or address)
 * @returns Array of matching pairs
 */
export async function searchDexScreener(query: string): Promise<DexScreenerPair[] | null> {
    const cacheKey = `dexscreener:search:${query}`;

    // Check cache first
    const cached = cache.get<DexScreenerPair[]>(cacheKey);
    if (cached) {
        console.log('[DEXSCREENER] Using cached search results');
        return cached;
    }

    try {
        console.log(`[DEXSCREENER] Searching for: ${query}`);
        const response = await axios.get<DexScreenerResponse>(
            `${DEXSCREENER_API_BASE}/latest/dex/search`,
            {
                params: { q: query },
                timeout: 5000
            }
        );

        const pairs = response.data.pairs || [];

        // Cache the result
        cache.set(cacheKey, pairs, CACHE_TTL);

        console.log(`[DEXSCREENER] Found ${pairs.length} results`);
        return pairs;
    } catch (error: any) {
        console.error('[DEXSCREENER] Error searching:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}
