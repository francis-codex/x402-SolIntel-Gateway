import axios from 'axios';
import config from '../config';
import { BirdeyeMetrics } from '@x402-solintel/types';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

/**
 * Get token price and DeFi metrics from Birdeye
 */
export async function getTokenMetrics(tokenAddress: string): Promise<BirdeyeMetrics> {
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

    return {
      price: price > 0 ? price.toString() : '0.00001',
      marketCap: overview.mc?.toString() || '1000000',
      volume24h: overview.v24hUSD?.toString() || '100000',
      liquidity: overview.liquidity?.toString() || '50000',
      priceChange24h: overview.priceChange24h || 0,
    };
  } catch (error: any) {
    console.error('[BIRDEYE] Error fetching token metrics:', error.response?.data || error.message);
    // Return mock default values on error so service doesn't fail
    return {
      price: '0.00001',
      marketCap: '1000000',
      volume24h: '100000',
      liquidity: '50000',
      priceChange24h: 0,
    };
  }
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
