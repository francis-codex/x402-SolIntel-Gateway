import axios from 'axios';
import config from '../config';
import { HeliusTokenInfo } from '@x402-solintel/types';
import { cache } from '../utils/cache';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;
const CACHE_TTL = 120000; // 2 minutes for holder data
const TOKEN_INFO_CACHE_TTL = 300000; // 5 minutes for token info

// Rate limiting configuration
const RATE_LIMIT_DELAY = 100; // 100ms between requests
const MAX_BATCH_SIZE = 100; // Maximum tokens per batch request
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Request queue for throttling
let requestQueue: Promise<any> = Promise.resolve();
let lastRequestTime = 0;

export interface TokenHolder {
    address: string;
    amount: string;
    uiAmount: number;
    decimals: number;
    percentage: number;
    rank: number;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Throttle requests to avoid rate limiting
 */
async function throttleRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await sleep(RATE_LIMIT_DELAY - timeSinceLastRequest);
      }

      lastRequestTime = Date.now();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) {
      throw error;
    }

    // Check if it's a rate limit error
    if (error.response?.status === 429 || error.code === 'ECONNRESET' || error.message?.includes('EPROTO')) {
      console.log(`[HELIUS] Rate limited or connection error, retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}

/**
 * Get token information from Helius (with caching and rate limiting)
 */
export async function getTokenInfo(tokenAddress: string): Promise<HeliusTokenInfo> {
  const cacheKey = `helius:token:${tokenAddress}`;

  // Check cache first
  const cached = cache.get<HeliusTokenInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const result = await throttleRequest(() =>
      retryWithBackoff(async () => {
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
          }, {
            timeout: 5000,
          });

          if (response.data?.result) {
            const asset = response.data.result;
            const tokenInfo: HeliusTokenInfo = {
              symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
              name: asset.content?.metadata?.name || 'Unknown Token',
              decimals: asset.token_info?.decimals || 9,
              supply: asset.token_info?.supply || '0',
              holders: 0,
            };

            // Cache the result
            cache.set(cacheKey, tokenInfo, TOKEN_INFO_CACHE_TTL);
            return tokenInfo;
          }
        } catch (dasError: any) {
          // Only log non-rate-limit errors
          if (dasError.response?.status !== 429) {
            console.log('[HELIUS] DAS API failed, trying token-metadata...');
          }
          throw dasError; // Re-throw to trigger fallback
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
            timeout: 5000,
          }
        );

        const tokenData = response.data?.[0];

        if (tokenData) {
          const tokenInfo: HeliusTokenInfo = {
            symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || tokenData.account || 'UNKNOWN',
            name: tokenData.onChainMetadata?.metadata?.data?.name || tokenData.account || 'Unknown Token',
            decimals: tokenData.onChainMetadata?.mint?.decimals || 9,
            supply: tokenData.onChainMetadata?.mint?.supply || '0',
            holders: 0,
          };

          // Cache the result
          cache.set(cacheKey, tokenInfo, TOKEN_INFO_CACHE_TTL);
          return tokenInfo;
        }

        throw new Error('No token data found');
      })
    );

    return result;
  } catch (error: any) {
    // Only log actual errors, not fallbacks
    if (error.response?.status !== 429) {
      console.error('[HELIUS] Error fetching token info:', error.message);
    }

    // Return fallback instead of throwing
    const fallback: HeliusTokenInfo = {
      symbol: tokenAddress.substring(0, 6),
      name: `Token ${tokenAddress.substring(0, 8)}...`,
      decimals: 9,
      supply: '1000000000',
      holders: 0,
    };

    // Cache fallback for a shorter time to retry later
    cache.set(cacheKey, fallback, 30000); // 30 seconds

    return fallback;
  }
}

/**
 * Get multiple token information in batch (reduces API calls)
 */
export async function getBatchTokenInfo(tokenAddresses: string[]): Promise<Map<string, HeliusTokenInfo>> {
  const results = new Map<string, HeliusTokenInfo>();
  const uncachedTokens: string[] = [];

  // Check cache for all tokens first
  for (const address of tokenAddresses) {
    const cacheKey = `helius:token:${address}`;
    const cached = cache.get<HeliusTokenInfo>(cacheKey);
    if (cached) {
      results.set(address, cached);
    } else {
      uncachedTokens.push(address);
    }
  }

  if (uncachedTokens.length === 0) {
    return results;
  }

  // Process uncached tokens in batches
  const batches = [];
  for (let i = 0; i < uncachedTokens.length; i += MAX_BATCH_SIZE) {
    batches.push(uncachedTokens.slice(i, i + MAX_BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const batchResults = await throttleRequest(() =>
        retryWithBackoff(async () => {
          const url = `${HELIUS_API_BASE}/token-metadata`;
          const response = await axios.post(
            url,
            {
              mintAccounts: batch,
            },
            {
              params: { 'api-key': config.heliusApiKey },
              timeout: 10000,
            }
          );

          return response.data || [];
        })
      );

      // Process batch results
      for (let i = 0; i < batch.length; i++) {
        const tokenAddress = batch[i];
        const tokenData = batchResults[i];

        let tokenInfo: HeliusTokenInfo;

        if (tokenData) {
          tokenInfo = {
            symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || tokenData.account || 'UNKNOWN',
            name: tokenData.onChainMetadata?.metadata?.data?.name || tokenData.account || 'Unknown Token',
            decimals: tokenData.onChainMetadata?.mint?.decimals || 9,
            supply: tokenData.onChainMetadata?.mint?.supply || '0',
            holders: 0,
          };
        } else {
          tokenInfo = {
            symbol: tokenAddress.substring(0, 6),
            name: `Token ${tokenAddress.substring(0, 8)}...`,
            decimals: 9,
            supply: '1000000000',
            holders: 0,
          };
        }

        const cacheKey = `helius:token:${tokenAddress}`;
        cache.set(cacheKey, tokenInfo, TOKEN_INFO_CACHE_TTL);
        results.set(tokenAddress, tokenInfo);
      }
    } catch (error: any) {
      console.error('[HELIUS] Error fetching batch token info:', error.message);

      // Add fallback for failed batch
      for (const tokenAddress of batch) {
        if (!results.has(tokenAddress)) {
          const fallback: HeliusTokenInfo = {
            symbol: tokenAddress.substring(0, 6),
            name: `Token ${tokenAddress.substring(0, 8)}...`,
            decimals: 9,
            supply: '1000000000',
            holders: 0,
          };
          results.set(tokenAddress, fallback);
        }
      }
    }
  }

  return results;
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
