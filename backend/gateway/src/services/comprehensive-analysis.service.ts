import { aggregateTokenPrice, getDetailedPriceComparison } from './price-aggregator.service';
import { calculateRiskScore, generateRiskReport } from './risk-scoring.service';
import { getComprehensiveSecurityCheck } from '../integrations/goplus';
import { analyzeHolderDistribution, getSolscanTokenMeta } from '../integrations/solscan';
import { getDexScreenerTokenData } from '../integrations/dexscreener';
import { getTokenInfo } from '../integrations/helius';
import { checkTokenSecurity } from '../integrations/rugcheck';

export interface ComprehensiveTokenAnalysis {
    tokenAddress: string;
    basicInfo: {
        name?: string;
        symbol?: string;
        decimals?: number;
    };
    priceData: {
        price: number;
        confidence: number;
        sources: number;
        recommendation: string;
        priceComparison?: any;
    };
    riskAssessment: {
        score: number;
        level: string;
        tradable: boolean;
        recommendation: string;
        factors: any[];
    };
    marketData: {
        liquidity: number;
        volume24h: number;
        marketCap: number;
        fdv: number;
        priceChange24h: number;
    };
    holderAnalysis?: {
        topHolderPercentage: number;
        top10Percentage: number;
        concentrationRisk: number;
        riskLevel: string;
    };
    securityData?: {
        riskScore: number;
        riskLevel: string;
        isHoneypot: boolean;
        isMintable: boolean;
        buyTax: number;
        sellTax: number;
        risks: string[];
    };
    warnings: string[];
    timestamp: number;
}

/**
 * Perform comprehensive token analysis using all available data sources
 * @param tokenAddress Solana token mint address
 * @returns Complete analysis report
 */
export async function performComprehensiveAnalysis(
    tokenAddress: string
): Promise<ComprehensiveTokenAnalysis> {
    const warnings: string[] = [];
    const timestamp = Date.now();

    console.log('[COMPREHENSIVE] Starting analysis for token:', tokenAddress);

    // Fetch all data in parallel
    const [
        priceAggregation,
        priceComparison,
        riskScore,
        securityCheck,
        holderDistribution,
        dexData,
        heliusInfo,
        solscanMeta,
        rugCheck
    ] = await Promise.all([
        aggregateTokenPrice(tokenAddress).catch(err => {
            warnings.push('Failed to fetch price aggregation');
            return null;
        }),
        getDetailedPriceComparison(tokenAddress).catch(() => null),
        calculateRiskScore(tokenAddress).catch(err => {
            warnings.push('Failed to calculate risk score');
            return null;
        }),
        getComprehensiveSecurityCheck(tokenAddress).catch(() => null),
        analyzeHolderDistribution(tokenAddress).catch(() => null),
        getDexScreenerTokenData(tokenAddress).catch(() => null),
        getTokenInfo(tokenAddress).catch(() => null),
        getSolscanTokenMeta(tokenAddress).catch(() => null),
        checkTokenSecurity(tokenAddress).catch(() => null)
    ]);

    // Extract basic token info
    const basicInfo = {
        name: solscanMeta?.name || heliusInfo?.name || 'Unknown',
        symbol: solscanMeta?.symbol || heliusInfo?.symbol || 'UNKNOWN',
        decimals: solscanMeta?.decimals || heliusInfo?.decimals || 9
    };

    // Price data
    const priceData = {
        price: priceAggregation?.price || 0,
        confidence: priceAggregation?.confidence || 0,
        sources: priceAggregation?.sources.length || 0,
        recommendation: priceAggregation?.recommendation || 'No price data available',
        priceComparison: priceComparison || undefined
    };

    if (!priceAggregation || priceAggregation.price === 0) {
        warnings.push('⚠️ Unable to verify token price from any source');
    }

    // Risk assessment
    const riskAssessment = {
        score: riskScore?.overallScore || 100,
        level: riskScore?.riskLevel || 'UNKNOWN',
        tradable: riskScore?.tradable || false,
        recommendation: riskScore?.recommendation || 'Unable to assess risk',
        factors: riskScore?.factors || []
    };

    // Market data
    const marketData = {
        liquidity: dexData?.totalLiquidity || 0,
        volume24h: dexData?.totalVolume24h || 0,
        marketCap: dexData?.marketCap || solscanMeta?.market_cap || 0,
        fdv: dexData?.fdv || 0,
        priceChange24h: dexData?.priceChange24h || solscanMeta?.price_change_24h || 0
    };

    if (marketData.liquidity === 0) {
        warnings.push('⚠️ No liquidity data available');
    }

    if (marketData.liquidity > 0 && marketData.liquidity < 5000) {
        warnings.push(`🚨 Very low liquidity: $${marketData.liquidity.toFixed(0)}`);
    }

    // Holder analysis
    const holderAnalysis = holderDistribution ? {
        topHolderPercentage: holderDistribution.topHolderPercentage,
        top10Percentage: holderDistribution.top10Percentage,
        concentrationRisk: holderDistribution.concentrationRisk,
        riskLevel: holderDistribution.riskLevel
    } : undefined;

    if (holderDistribution && holderDistribution.concentrationRisk > 60) {
        warnings.push(`⚠️ High holder concentration detected`);
    }

    // Security data
    const securityData = securityCheck?.analysis ? {
        riskScore: securityCheck.analysis.riskScore,
        riskLevel: securityCheck.analysis.riskLevel,
        isHoneypot: securityCheck.analysis.isHoneypot,
        isMintable: securityCheck.analysis.isMintable,
        buyTax: securityCheck.analysis.buyTax,
        sellTax: securityCheck.analysis.sellTax,
        risks: securityCheck.analysis.risks
    } : undefined;

    if (securityData?.isHoneypot) {
        warnings.push('🚨 HONEYPOT DETECTED - DO NOT TRADE');
    }

    if (securityData && (securityData.buyTax > 10 || securityData.sellTax > 10)) {
        warnings.push(`⚠️ High taxes - Buy: ${securityData.buyTax}%, Sell: ${securityData.sellTax}%`);
    }

    if (rugCheck && rugCheck.flags && rugCheck.flags.length > 0) {
        warnings.push(`⚠️ RugCheck found ${rugCheck.flags.length} potential issues`);
    }

    console.log('[COMPREHENSIVE] Analysis complete');

    return {
        tokenAddress,
        basicInfo,
        priceData,
        riskAssessment,
        marketData,
        holderAnalysis,
        securityData,
        warnings,
        timestamp
    };
}

/**
 * Generate human-readable analysis summary for AI
 * @param analysis Comprehensive analysis data
 * @returns Formatted summary string
 */
export function generateAnalysisSummary(analysis: ComprehensiveTokenAnalysis): string {
    let summary = `TOKEN ANALYSIS SUMMARY\n`;
    summary += `${'='.repeat(50)}\n\n`;

    summary += `Token: ${analysis.basicInfo.name} (${analysis.basicInfo.symbol})\n`;
    summary += `Address: ${analysis.tokenAddress}\n\n`;

    summary += `PRICE DATA:\n`;
    summary += `Current Price: $${analysis.priceData.price.toFixed(8)}\n`;
    summary += `Confidence: ${analysis.priceData.confidence}% (${analysis.priceData.sources} sources)\n`;
    summary += `${analysis.priceData.recommendation}\n\n`;

    summary += `MARKET METRICS:\n`;
    summary += `Liquidity: $${analysis.marketData.liquidity.toLocaleString()}\n`;
    summary += `24h Volume: $${analysis.marketData.volume24h.toLocaleString()}\n`;
    summary += `Market Cap: $${analysis.marketData.marketCap.toLocaleString()}\n`;
    summary += `24h Change: ${analysis.marketData.priceChange24h.toFixed(2)}%\n\n`;

    summary += `RISK ASSESSMENT:\n`;
    summary += `Risk Score: ${analysis.riskAssessment.score}/100 (${analysis.riskAssessment.level})\n`;
    summary += `Tradable: ${analysis.riskAssessment.tradable ? '✅ Yes' : '🚫 No'}\n`;
    summary += `${analysis.riskAssessment.recommendation}\n\n`;

    if (analysis.holderAnalysis) {
        summary += `HOLDER DISTRIBUTION:\n`;
        summary += `Top Holder: ${analysis.holderAnalysis.topHolderPercentage.toFixed(1)}%\n`;
        summary += `Top 10 Holders: ${analysis.holderAnalysis.top10Percentage.toFixed(1)}%\n`;
        summary += `Concentration Risk: ${analysis.holderAnalysis.riskLevel}\n\n`;
    }

    if (analysis.securityData) {
        summary += `SECURITY ANALYSIS:\n`;
        summary += `Security Risk: ${analysis.securityData.riskLevel}\n`;
        summary += `Honeypot: ${analysis.securityData.isHoneypot ? '🚨 YES' : '✅ No'}\n`;
        summary += `Mintable: ${analysis.securityData.isMintable ? '⚠️ Yes' : '✅ No'}\n`;
        summary += `Buy Tax: ${analysis.securityData.buyTax.toFixed(1)}%\n`;
        summary += `Sell Tax: ${analysis.securityData.sellTax.toFixed(1)}%\n\n`;
    }

    if (analysis.warnings.length > 0) {
        summary += `WARNINGS:\n`;
        analysis.warnings.forEach(warning => {
            summary += `${warning}\n`;
        });
        summary += `\n`;
    }

    summary += `${'='.repeat(50)}\n`;

    return summary;
}
