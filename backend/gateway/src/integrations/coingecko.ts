import axios from 'axios';
import { cache } from '../utils/cache';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 60000; // 1 minute for price data

export interface CoinGeckoTokenPrice {
    usd: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    usd_24h_change?: number;
}

export interface CoinGeckoTokenData {
    id: string;
    address: string;
    name: string;
    symbol: string;
    price_usd: number;
    fdv_usd: number;
    total_reserve_in_usd: number;
    volume_usd: {
        h24: number;
    };
    market_cap_usd: number;
}

/**
 * Get token price from CoinGecko
 * @param tokenAddress Solana token mint address
 * @returns Price data or null if unavailable
 */
export async function getCoinGeckoPrice(tokenAddress: string): Promise<CoinGeckoTokenPrice | null> {
    const apiKey = process.env.COINGECKO_API_KEY;
    const cacheKey = `coingecko:price:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<CoinGeckoTokenPrice>(cacheKey);
    if (cached) {
        console.log('[COINGECKO] Using cached price data');
        return cached;
    }

    try {
        console.log('[COINGECKO] Fetching token price...');
        const config: any = {
            params: {
                contract_addresses: tokenAddress,
                vs_currencies: 'usd',
                include_market_cap: 'true',
                include_24hr_vol: 'true',
                include_24hr_change: 'true'
            },
            timeout: 5000
        };

        // Add API key if available (for higher rate limits)
        if (apiKey) {
            config.headers = { 'x-cg-pro-api-key': apiKey };
        }

        const response = await axios.get(
            `${COINGECKO_API_BASE}/simple/token_price/solana`,
            config
        );

        const priceData = response.data[tokenAddress.toLowerCase()];

        if (!priceData) {
            console.log('[COINGECKO] No price data available');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, priceData, CACHE_TTL);

        console.log('[COINGECKO] Price fetched successfully:', priceData.usd);
        return priceData;
    } catch (error: any) {
        // Don't log 404s or rate limits as errors (common for new tokens)
        if (error.response?.status === 404) {
            console.log('[COINGECKO] Token not found in CoinGecko database');
        } else if (error.response?.status === 429) {
            console.log('[COINGECKO] Rate limit exceeded');
        } else {
            console.error('[COINGECKO] Error fetching price:', {
                message: error.message,
                status: error.response?.status
            });
        }
        return null;
    }
}

/**
 * Get comprehensive token data from CoinGecko onchain API
 * @param tokenAddress Solana token mint address
 * @returns Token data or null if unavailable
 */
export async function getCoinGeckoTokenData(tokenAddress: string): Promise<CoinGeckoTokenData | null> {
    const apiKey = process.env.COINGECKO_API_KEY;

    if (!apiKey) {
        console.log('[COINGECKO] API key not configured, using simple price endpoint');
        const priceData = await getCoinGeckoPrice(tokenAddress);
        if (!priceData) return null;

        return {
            id: '',
            address: tokenAddress,
            name: '',
            symbol: '',
            price_usd: priceData.usd,
            fdv_usd: priceData.usd_market_cap || 0,
            total_reserve_in_usd: 0,
            volume_usd: {
                h24: priceData.usd_24h_vol || 0
            },
            market_cap_usd: priceData.usd_market_cap || 0
        };
    }

    const cacheKey = `coingecko:tokendata:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<CoinGeckoTokenData>(cacheKey);
    if (cached) {
        console.log('[COINGECKO] Using cached token data');
        return cached;
    }

    try {
        console.log('[COINGECKO] Fetching comprehensive token data...');
        const response = await axios.get(
            `${COINGECKO_API_BASE}/onchain/networks/solana/tokens/multi/${tokenAddress}`,
            {
                headers: { 'x-cg-pro-api-key': apiKey },
                timeout: 5000
            }
        );

        const tokenData = response.data.data;

        if (!tokenData) {
            console.log('[COINGECKO] No token data available');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, tokenData, CACHE_TTL);

        console.log('[COINGECKO] Token data fetched successfully');
        return tokenData;
    } catch (error: any) {
        console.error('[COINGECKO] Error fetching token data:', {
            message: error.message,
            status: error.response?.status
        });

        // Fallback to simple price endpoint
        return null;
    }
}
