import axios from 'axios';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Get token price from CoinGecko (free, no API key needed)
 */
export async function getCoinGeckoPrice(tokenAddress: string): Promise<{ price: number } | null> {
  try {
    const url = `${COINGECKO_API_BASE}/simple/token_price/solana`;
    const response = await axios.get(url, {
      params: {
        contract_addresses: tokenAddress,
        vs_currencies: 'usd'
      },
      timeout: 5000
    });

    const price = response.data?.[tokenAddress.toLowerCase()]?.usd;
    
    if (!price) {
      return null;
    }

    console.log('[COINGECKO] Price fetched successfully:', price);
    return { price };
  } catch (error: any) {
    console.error('[COINGECKO] Error fetching price:', error.message);
    return null;
  }
}
