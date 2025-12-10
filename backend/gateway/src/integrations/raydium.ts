import axios from 'axios';
import { cache } from '../utils/cache';

const RAYDIUM_API_BASE = 'https://api.raydium.io/v2';
const CACHE_TTL = 30000; // 30 seconds for price data

export interface RaydiumPrice {
    [mintAddress: string]: number;
}

export interface RaydiumPairInfo {
    name: string;
    ammId: string;
    lpMint: string;
    baseMint: string;
    quoteMint: string;
    market: string;
    liquidity: number;
    price: number;
    lpPrice: number;
    tokenAmountCoin: number;
    tokenAmountPc: number;
    tokenAmountLp: number;
    volume24h: number;
    volume24hQuote: number;
    fee24h: number;
    fee24hQuote: number;
}

/**
 * Get token price from Raydium (completely FREE, no API key needed!)
 * @param tokenAddress Solana token mint address
 * @returns Price in USD or null if not available
 */
export async function getRaydiumPrice(tokenAddress: string): Promise<number | null> {
    const cacheKey = `raydium:price:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<number>(cacheKey);
    if (cached) {
        console.log('[RAYDIUM] Using cached price data');
        return cached;
    }

    try {
        console.log('[RAYDIUM] Fetching price data...');
        const response = await axios.get<RaydiumPrice>(
            `${RAYDIUM_API_BASE}/main/price`,
            { timeout: 5000 }
        );

        const price = response.data[tokenAddress];

        if (price === undefined || price === 0) {
            console.log('[RAYDIUM] No price data for token');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, price, CACHE_TTL);

        console.log('[RAYDIUM] Price fetched successfully:', price);
        return price;
    } catch (error: any) {
        console.error('[RAYDIUM] Error fetching price:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Get all token pairs and liquidity info from Raydium
 * @returns Array of pair information or null if unavailable
 */
export async function getRaydiumPairs(): Promise<RaydiumPairInfo[] | null> {
    const cacheKey = 'raydium:pairs:all';

    // Check cache first
    const cached = cache.get<RaydiumPairInfo[]>(cacheKey);
    if (cached) {
        console.log('[RAYDIUM] Using cached pairs data');
        return cached;
    }

    try {
        console.log('[RAYDIUM] Fetching pairs data...');
        const response = await axios.get<RaydiumPairInfo[]>(
            `${RAYDIUM_API_BASE}/main/pairs`,
            { timeout: 10000 }
        );

        const pairs = response.data;

        // Cache the result
        cache.set(cacheKey, pairs, CACHE_TTL);

        console.log(`[RAYDIUM] Fetched ${pairs.length} pairs`);
        return pairs;
    } catch (error: any) {
        console.error('[RAYDIUM] Error fetching pairs:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Get liquidity info for a specific token
 * @param tokenAddress Solana token mint address
 * @returns Liquidity data or null if not available
 */
export async function getRaydiumLiquidity(tokenAddress: string) {
    const pairs = await getRaydiumPairs();

    if (!pairs) {
        return null;
    }

    // Find all pairs where this token is either base or quote
    const tokenPairs = pairs.filter(
        pair => pair.baseMint === tokenAddress || pair.quoteMint === tokenAddress
    );

    if (tokenPairs.length === 0) {
        console.log('[RAYDIUM] No pairs found for token');
        return null;
    }

    // Calculate total liquidity and volume across all pairs
    const totalLiquidity = tokenPairs.reduce((sum, pair) => sum + pair.liquidity, 0);
    const totalVolume24h = tokenPairs.reduce((sum, pair) => sum + pair.volume24h, 0);

    // Get main pair (highest liquidity)
    const mainPair = tokenPairs.reduce((max, pair) =>
        pair.liquidity > max.liquidity ? pair : max
    );

    return {
        totalLiquidity,
        totalVolume24h,
        mainPair,
        pairCount: tokenPairs.length,
        price: mainPair.price
    };
}
