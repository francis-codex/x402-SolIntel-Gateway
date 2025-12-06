import axios from 'axios';
import config from '../config';
import { HeliusTokenInfo } from '@x402-solintel/types';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';

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
