import { getJupiterPrice } from '../integrations/jupiter';
import { getDexScreenerTokenData } from '../integrations/dexscreener';
import { getBirdeyePrice } from '../integrations/birdeye';

export interface PriceSource {
    source: string;
    price: number;
    reliable: boolean;
    timestamp: number;
}

export interface AggregatedPrice {
    price: number;
    sources: PriceSource[];
    confidence: number; // 0-100
    deviation: number; // Price deviation percentage
    isReliable: boolean;
    recommendation: string;
}

/**
 * Aggregate price data from multiple sources for verification
 * @param tokenAddress Solana token mint address
 * @returns Aggregated price data with confidence score
 */
export async function aggregateTokenPrice(tokenAddress: string): Promise<AggregatedPrice> {
    const sources: PriceSource[] = [];
    const timestamp = Date.now();

    // Fetch from all sources in parallel
    const [jupiterData, dexScreenerData, birdeyeData] = await Promise.all([
        getJupiterPrice(tokenAddress).catch(() => null),
        getDexScreenerTokenData(tokenAddress).catch(() => null),
        getBirdeyePrice(tokenAddress).catch(() => null)
    ]);

    // Collect prices from each source
    if (jupiterData && jupiterData.usdPrice > 0) {
        sources.push({
            source: 'Jupiter',
            price: jupiterData.usdPrice,
            reliable: true,
            timestamp
        });
    }

    if (dexScreenerData && parseFloat(dexScreenerData.averagePrice) > 0) {
        sources.push({
            source: 'DexScreener',
            price: parseFloat(dexScreenerData.averagePrice),
            reliable: true,
            timestamp
        });
    }

    if (birdeyeData && birdeyeData.price > 0 && !birdeyeData.isMock) {
        sources.push({
            source: 'Birdeye',
            price: birdeyeData.price,
            reliable: true,
            timestamp
        });
    } else if (birdeyeData?.isMock) {
        console.log('[PRICE_AGGREGATOR] Excluding Birdeye mock data from price verification');
    }

    // No sources available
    if (sources.length === 0) {
        return {
            price: 0,
            sources: [],
            confidence: 0,
            deviation: 0,
            isReliable: false,
            recommendation: '🚫 Unable to verify price - no reliable data sources available'
        };
    }

    // Calculate aggregated price (weighted by source reliability)
    const prices = sources.map(s => s.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Calculate price deviation (standard deviation)
    const deviations = prices.map(p => Math.abs(p - avgPrice) / avgPrice * 100);
    const maxDeviation = Math.max(...deviations);

    // Calculate confidence score
    let confidence = 100;

    // Reduce confidence based on:
    // 1. Number of sources (fewer sources = lower confidence)
    if (sources.length === 1) confidence -= 40;
    else if (sources.length === 2) confidence -= 20;
    else if (sources.length === 3) confidence -= 10;

    // 2. Price deviation (high deviation = lower confidence)
    if (maxDeviation > 50) confidence -= 40;
    else if (maxDeviation > 20) confidence -= 25;
    else if (maxDeviation > 10) confidence -= 15;
    else if (maxDeviation > 5) confidence -= 10;

    confidence = Math.max(0, confidence);

    // Determine if price is reliable
    const isReliable = sources.length >= 2 && maxDeviation < 20;

    // Generate recommendation
    let recommendation = '';
    if (!isReliable) {
        if (sources.length === 1) {
            recommendation = '⚠️ Only one price source available - verify independently';
        } else if (maxDeviation > 20) {
            recommendation = `⚠️ High price variance (${maxDeviation.toFixed(1)}%) across sources - exercise caution`;
        }
    } else if (confidence >= 80) {
        recommendation = '✅ Price verified across multiple sources with high confidence';
    } else if (confidence >= 60) {
        recommendation = '✓ Price verified across sources with moderate confidence';
    } else {
        recommendation = '⚠️ Price data available but confidence is low';
    }

    return {
        price: avgPrice,
        sources,
        confidence,
        deviation: maxDeviation,
        isReliable,
        recommendation
    };
}

/**
 * Get detailed price comparison across all sources
 * @param tokenAddress Solana token mint address
 * @returns Detailed price comparison
 */
export async function getDetailedPriceComparison(tokenAddress: string) {
    const aggregated = await aggregateTokenPrice(tokenAddress);

    if (aggregated.sources.length === 0) {
        return null;
    }

    const lowestPrice = Math.min(...aggregated.sources.map(s => s.price));
    const highestPrice = Math.max(...aggregated.sources.map(s => s.price));
    const priceSpread = ((highestPrice - lowestPrice) / lowestPrice) * 100;

    return {
        ...aggregated,
        lowestPrice,
        highestPrice,
        priceSpread,
        sourceBreakdown: aggregated.sources.map(s => ({
            source: s.source,
            price: s.price,
            deviationFromAverage: ((s.price - aggregated.price) / aggregated.price * 100).toFixed(2) + '%'
        }))
    };
}
