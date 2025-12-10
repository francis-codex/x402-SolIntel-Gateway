import axios from 'axios';
import config from '../config';
import { HeliusTokenInfo } from '@x402-solintel/types';
import { cache } from '../utils/cache';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;
const CACHE_TTL = 120000; // 2 minutes for holder data

export interface TokenHolder {
    address: string;
    amount: string;
    uiAmount: number;
    decimals: number;
    percentage: number;
    rank: number;
}

/**
 * Get token information from Helius
 */
export async function getTokenInfo(tokenAddress: string): Promise<HeliusTokenInfo> {
  try {
    // Method 1: Try DAS API (newer Helius API)
    try {
      const url = `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getAsset',
        params: {
          id: tokenAddress,
        },
      });

      if (response.data?.result) {
        const asset = response.data.result;
        return {
          symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
          name: asset.content?.metadata?.name || 'Unknown Token',
          decimals: asset.token_info?.decimals || 9,
          supply: asset.token_info?.supply || '0',
          holders: 0,
        };
      }
    } catch (dasError) {
      console.log('[HELIUS] DAS API failed, trying token-metadata...');
    }

    // Method 2: Try legacy token-metadata endpoint
    const url = `${HELIUS_API_BASE}/token-metadata`;
    const response = await axios.post(
      url,
      {
        mintAccounts: [tokenAddress],
      },
      {
        params: { 'api-key': config.heliusApiKey },
      }
    );

    const tokenData = response.data?.[0];

    if (tokenData) {
      return {
        symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || tokenData.account || 'UNKNOWN',
        name: tokenData.onChainMetadata?.metadata?.data?.name || tokenData.account || 'Unknown Token',
        decimals: tokenData.onChainMetadata?.mint?.decimals || 9,
        supply: tokenData.onChainMetadata?.mint?.supply || '0',
        holders: 0,
      };
    }

    // Fallback: Return basic info with token address
    console.warn('[HELIUS] Using fallback token info');
    return {
      symbol: tokenAddress.substring(0, 6),
      name: `Token ${tokenAddress.substring(0, 8)}...`,
      decimals: 9,
      supply: '0',
      holders: 0,
    };
  } catch (error: any) {
    console.error('[HELIUS] Error fetching token info:', error.message);
    // Return fallback instead of throwing
    return {
      symbol: tokenAddress.substring(0, 6),
      name: `Token ${tokenAddress.substring(0, 8)}...`,
      decimals: 9,
      supply: '1000000000',
      holders: 0,
    };
  }
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions(
  walletAddress: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const url = `${HELIUS_API_BASE}/addresses/${walletAddress}/transactions?api-key=${config.heliusApiKey}`;

    const response = await axios.get(url, {
      params: {
        limit
      }
    });

    return response.data || [];
  } catch (error) {
    console.error('[HELIUS] Error fetching wallet transactions:', error);
    return [];
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(walletAddress: string): Promise<any> {
  try {
    const url = `${HELIUS_API_BASE}/addresses/${walletAddress}/balances?api-key=${config.heliusApiKey}`;

    const response = await axios.get(url);

    return {
      totalUSD: response.data.totalValue || 0,
      sol: response.data.nativeBalance || 0,
      tokens: response.data.tokens?.length || 0,
    };
  } catch (error) {
    console.error('[HELIUS] Error fetching wallet balance:', error);
    return {
      totalUSD: 0,
      sol: 0,
      tokens: 0,
    };
  }
}

/**
 * Get token largest holders using Helius RPC (FREE - no extra API key needed!)
 * @param tokenAddress Solana token mint address
 * @returns Array of top token holders or null if unavailable
 */
export async function getTokenLargestHolders(tokenAddress: string): Promise<TokenHolder[] | null> {
    const cacheKey = `helius:holders:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<TokenHolder[]>(cacheKey);
    if (cached) {
        console.log('[HELIUS] Using cached holder data');
        return cached;
    }

    try {
        console.log('[HELIUS] Fetching token holders...');
        const response = await axios.post(HELIUS_RPC_URL, {
            jsonrpc: '2.0',
            id: 'get-holders',
            method: 'getTokenLargestAccounts',
            params: [tokenAddress]
        });

        if (!response.data?.result?.value) {
            console.log('[HELIUS] No holder data available');
            return null;
        }

        const holders = response.data.result.value;

        // Get total supply to calculate percentages
        const totalSupply = holders.reduce((sum: number, h: any) => sum + parseFloat(h.amount), 0);

        // Transform to TokenHolder format with percentages
        const formattedHolders: TokenHolder[] = holders.map((holder: any, index: number) => ({
            address: holder.address,
            amount: holder.amount,
            uiAmount: holder.uiAmount,
            decimals: holder.decimals,
            percentage: (parseFloat(holder.amount) / totalSupply) * 100,
            rank: index + 1
        }));

        // Cache the result
        cache.set(cacheKey, formattedHolders, CACHE_TTL);

        console.log(`[HELIUS] Fetched ${formattedHolders.length} token holders`);
        return formattedHolders;
    } catch (error: any) {
        console.error('[HELIUS] Error fetching token holders:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Analyze token holder distribution (concentration risk)
 * @param tokenAddress Solana token mint address
 * @returns Holder analysis or null if unavailable
 */
export async function analyzeTokenHolderDistribution(tokenAddress: string) {
    const holders = await getTokenLargestHolders(tokenAddress);

    if (!holders || holders.length === 0) {
        return null;
    }

    // Calculate top holder concentration
    const top10Percentage = holders
        .slice(0, Math.min(10, holders.length))
        .reduce((sum, holder) => sum + holder.percentage, 0);

    const top5Percentage = holders
        .slice(0, Math.min(5, holders.length))
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
