import axios from 'axios';
import config from '../config';
import { BirdeyeMetrics } from '@x402-solintel/types';
import { cache } from '../utils/cache';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';
const CACHE_TTL = 60000; // 1 minute

/**
 * Get token price and DeFi metrics from Birdeye
 */
export async function getTokenMetrics(tokenAddress: string): Promise<BirdeyeMetrics & { isMock?: boolean }> {
  const cacheKey = `birdeye:metrics:${tokenAddress}`;

  // Check cache first
  const cached = cache.get<BirdeyeMetrics & { isMock?: boolean }>(cacheKey);
  if (cached) {
    console.log('[BIRDEYE] Using cached metrics');
    return cached;
  }

  try {
    const headers = {
      'X-API-KEY': config.birdeyeApiKey,
      'x-chain': 'solana',
    };

    // Get price data
    const priceUrl = `${BIRDEYE_API_BASE}/defi/price`;
    const priceResponse = await axios.get(priceUrl, {
      headers,
      params: { address: tokenAddress },
      timeout: 5000,
    });

    const price = priceResponse.data?.data?.value || 0;

    // Get token overview
    const overviewUrl = `${BIRDEYE_API_BASE}/defi/token_overview`;
    const overviewResponse = await axios.get(overviewUrl, {
      headers,
      params: { address: tokenAddress },
      timeout: 5000,
    });

    const overview = overviewResponse.data?.data || {};

    const metrics = {
      price: price > 0 ? price.toString() : '0.00001',
      marketCap: overview.mc?.toString() || '1000000',
      volume24h: overview.v24hUSD?.toString() || '100000',
      liquidity: overview.liquidity?.toString() || '50000',
      priceChange24h: overview.priceChange24h || 0,
      isMock: false
    };

    // Cache the result
    cache.set(cacheKey, metrics, CACHE_TTL);

    return metrics;
  } catch (error: any) {
    console.error('[BIRDEYE] Error fetching token metrics:', error.response?.data || error.message);
    // Return mock default values on error so service doesn't fail
    console.log('[BIRDEYE] ⚠️ USING MOCK DATA - Real data unavailable');
    return {
      price: '0.00001',
      marketCap: '1000000',
      volume24h: '100000',
      liquidity: '50000',
      priceChange24h: 0,
      isMock: true
    };
  }
}

/**
 * Get token price from Birdeye (for price aggregation)
 */
export async function getBirdeyePrice(tokenAddress: string): Promise<{ price: number; isMock: boolean } | null> {
  const metrics = await getTokenMetrics(tokenAddress);

  if (!metrics) {
    return null;
  }

  return {
    price: parseFloat(metrics.price),
    isMock: metrics.isMock || false
  };
}

/**
 * Get token security info
 */
export async function getTokenSecurity(tokenAddress: string): Promise<any> {
  try {
    const headers = {
      'X-API-KEY': config.birdeyeApiKey,
    };

    const url = `${BIRDEYE_API_BASE}/defi/token_security?address=${tokenAddress}`;
    const response = await axios.get(url, { headers });

    return response.data?.data || {};
  } catch (error) {
    console.error('[BIRDEYE] Error fetching token security:', error);
    return {};
  }
}
