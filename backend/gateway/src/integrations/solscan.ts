import axios from 'axios';
import { cache } from '../utils/cache';

const SOLSCAN_API_BASE = 'https://pro-api.solscan.io/v2.0';
const CACHE_TTL = 120000; // 2 minutes for holder data (changes slowly)

export interface SolscanHolder {
    address: string;
    amount: number;
    decimals: number;
    owner: string;
    rank: number;
    value: number;
    percentage: number;
}

export interface SolscanHoldersResponse {
    success: boolean;
    data: {
        total: number;
        items: SolscanHolder[];
    };
}

export interface SolscanTokenMeta {
    address: string;
    name: string;
    symbol: string;
    icon: string;
    decimals: number;
    price: number;
    volume_24h: number;
    market_cap: number;
    market_cap_rank: number;
    price_change_24h: number;
    supply: number;
    holder: number;
    creator: string;
    create_tx: string;
    created_time: number;
    first_mint_tx: string;
    first_mint_time: number;
}

export interface SolscanTokenMetaResponse {
    success: boolean;
    data: SolscanTokenMeta;
}

/**
 * Get token metadata from Solscan
 * @param tokenAddress Solana token mint address
 * @returns Token metadata or null if unavailable
 */
export async function getSolscanTokenMeta(tokenAddress: string): Promise<SolscanTokenMeta | null> {
    const apiKey = process.env.SOLSCAN_API_KEY;

    if (!apiKey) {
        console.log('[SOLSCAN] API key not configured, skipping metadata fetch');
        return null;
    }

    const cacheKey = `solscan:meta:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<SolscanTokenMeta>(cacheKey);
    if (cached) {
        console.log('[SOLSCAN] Using cached token metadata');
        return cached;
    }

    try {
        console.log('[SOLSCAN] Fetching token metadata...');
        const response = await axios.get<SolscanTokenMetaResponse>(
            `${SOLSCAN_API_BASE}/token/meta`,
            {
                params: { address: tokenAddress },
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 5000
            }
        );

        if (!response.data.success || !response.data.data) {
            console.log('[SOLSCAN] No metadata available');
            return null;
        }

        const metadata = response.data.data;

        // Cache the result
        cache.set(cacheKey, metadata, CACHE_TTL);

        console.log('[SOLSCAN] Token metadata fetched successfully');
        return metadata;
    } catch (error: any) {
        console.error('[SOLSCAN] Error fetching token metadata:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Get token holders from Solscan
 * @param tokenAddress Solana token mint address
 * @param page Page number (default: 1)
 * @param pageSize Number of items per page (10, 20, 30, 40)
 * @returns Holder data or null if unavailable
 */
export async function getSolscanHolders(
    tokenAddress: string,
    page: number = 1,
    pageSize: number = 40
): Promise<SolscanHolder[] | null> {
    const apiKey = process.env.SOLSCAN_API_KEY;

    if (!apiKey) {
        console.log('[SOLSCAN] API key not configured, skipping holder fetch');
        return null;
    }

    const cacheKey = `solscan:holders:${tokenAddress}:${page}:${pageSize}`;

    // Check cache first
    const cached = cache.get<SolscanHolder[]>(cacheKey);
    if (cached) {
        console.log('[SOLSCAN] Using cached holder data');
        return cached;
    }

    try {
        console.log('[SOLSCAN] Fetching token holders...');
        const response = await axios.get<SolscanHoldersResponse>(
            `${SOLSCAN_API_BASE}/token/holders`,
            {
                params: {
                    address: tokenAddress,
                    page,
                    page_size: pageSize
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 5000
            }
        );

        if (!response.data.success || !response.data.data) {
            console.log('[SOLSCAN] No holder data available');
            return null;
        }

        const holders = response.data.data.items;

        // Cache the result
        cache.set(cacheKey, holders, CACHE_TTL);

        console.log(`[SOLSCAN] Fetched ${holders.length} holders`);
        return holders;
    } catch (error: any) {
        console.error('[SOLSCAN] Error fetching holders:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Analyze holder distribution (concentration risk)
 * @param tokenAddress Solana token mint address
 * @returns Holder analysis or null if unavailable
 */
export async function analyzeHolderDistribution(tokenAddress: string) {
    const holders = await getSolscanHolders(tokenAddress, 1, 40);

    if (!holders || holders.length === 0) {
        return null;
    }

    // Calculate top holder concentration
    const top10Percentage = holders
        .slice(0, 10)
        .reduce((sum, holder) => sum + holder.percentage, 0);

    const top5Percentage = holders
        .slice(0, 5)
        .reduce((sum, holder) => sum + holder.percentage, 0);

    const topHolderPercentage = holders[0]?.percentage || 0;

    // Calculate distribution risk score (0-100, lower is better)
    let concentrationRisk = 0;

    if (topHolderPercentage > 50) concentrationRisk += 40;
    else if (topHolderPercentage > 30) concentrationRisk += 25;
    else if (topHolderPercentage > 10) concentrationRisk += 10;

    if (top5Percentage > 70) concentrationRisk += 30;
    else if (top5Percentage > 50) concentrationRisk += 20;
    else if (top5Percentage > 30) concentrationRisk += 10;

    if (top10Percentage > 80) concentrationRisk += 30;
    else if (top10Percentage > 60) concentrationRisk += 20;
    else if (top10Percentage > 40) concentrationRisk += 10;

    return {
        totalHolders: holders.length,
        topHolderPercentage,
        top5Percentage,
        top10Percentage,
        concentrationRisk,
        riskLevel:
            concentrationRisk > 70 ? 'CRITICAL' :
            concentrationRisk > 50 ? 'HIGH' :
            concentrationRisk > 30 ? 'MEDIUM' :
            'LOW',
        topHolders: holders.slice(0, 10)
    };
}
