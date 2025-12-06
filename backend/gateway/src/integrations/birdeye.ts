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
    };

    // Get price data
    const priceUrl = `${BIRDEYE_API_BASE}/defi/price?address=${tokenAddress}`;
    const priceResponse = await axios.get(priceUrl, { headers });

    const price = priceResponse.data?.data?.value || 0;

    // Get token overview
    const overviewUrl = `${BIRDEYE_API_BASE}/defi/token_overview?address=${tokenAddress}`;
    const overviewResponse = await axios.get(overviewUrl, { headers });

    const overview = overviewResponse.data?.data || {};

    return {
      price: price.toString(),
      marketCap: overview.mc?.toString() || '0',
      volume24h: overview.v24hUSD?.toString() || '0',
      liquidity: overview.liquidity?.toString() || '0',
      priceChange24h: overview.priceChange24h || 0,
    };
  } catch (error) {
    console.error('[BIRDEYE] Error fetching token metrics:', error);
    // Return default values on error
    return {
      price: '0',
      marketCap: '0',
      volume24h: '0',
      liquidity: '0',
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
