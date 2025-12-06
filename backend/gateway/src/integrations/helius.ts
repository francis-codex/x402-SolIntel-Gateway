import axios from 'axios';
import config from '../config';
import { HeliusTokenInfo } from '@x402-solintel/types';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';

/**
 * Get token information from Helius
 */
export async function getTokenInfo(tokenAddress: string): Promise<HeliusTokenInfo> {
  try {
    const url = `${HELIUS_API_BASE}/token-metadata?api-key=${config.heliusApiKey}`;

    const response = await axios.get(url, {
      params: {
        mintAccounts: [tokenAddress]
      }
    });

    const tokenData = response.data[0];

    if (!tokenData) {
      throw new Error('Token not found');
    }

    return {
      symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || 'UNKNOWN',
      name: tokenData.onChainMetadata?.metadata?.data?.name || 'Unknown Token',
      decimals: tokenData.onChainMetadata?.mint?.decimals || 9,
      supply: tokenData.onChainMetadata?.mint?.supply || '0',
      holders: 0, // Need to fetch from another endpoint
    };
  } catch (error) {
    console.error('[HELIUS] Error fetching token info:', error);
    throw error;
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
