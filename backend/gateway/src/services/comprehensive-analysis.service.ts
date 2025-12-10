import { aggregateTokenPrice, getDetailedPriceComparison } from './price-aggregator.service';
import { calculateRiskScore, generateRiskReport } from './risk-scoring.service';
import { getComprehensiveSecurityCheck } from '../integrations/goplus';
import { getSolscanTokenMeta } from '../integrations/solscan';
import { analyzeTokenHolderDistribution } from '../integrations/helius';
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

        sourcesUsed: string[];
    };
    apiStatus: { [key: string]: boolean };
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

    // Track API status for reporting
    const apiStatus: { [key: string]: boolean } = {};

    // Fetch core data first (these are used by other services)
    const [heliusInfo, solscanMeta, dexData, securityCheck, holderDistribution, rugCheck] = await Promise.all([
        getTokenInfo(tokenAddress).then(r => { apiStatus['Helius'] = true; return r; }).catch(() => { apiStatus['Helius'] = false; return null; }),
        getSolscanTokenMeta(tokenAddress).then(r => { apiStatus['Solscan Meta'] = true; return r; }).catch(() => { apiStatus['Solscan Meta'] = false; return null; }),
        getDexScreenerTokenData(tokenAddress).then(r => { apiStatus['DexScreener'] = !!r; return r; }).catch(() => { apiStatus['DexScreener'] = false; return null; }),
        getComprehensiveSecurityCheck(tokenAddress).then(r => { apiStatus['GoPlus Security'] = !!r; return r; }).catch(() => { apiStatus['GoPlus Security'] = false; return null; }),
        analyzeTokenHolderDistribution(tokenAddress).then(r => { apiStatus['Helius Holders'] = !!r; return r; }).catch(() => { apiStatus['Helius Holders'] = false; return null; }),
        checkTokenSecurity(tokenAddress).then(r => { apiStatus['RugCheck'] = true; return r; }).catch(() => { apiStatus['RugCheck'] = false; return null; })
    ]);

    // Now fetch price and risk data (these aggregate the above)
    const [priceAggregation, riskScore] = await Promise.all([
        aggregateTokenPrice(tokenAddress).then(r => { apiStatus['Price Aggregation'] = r.sources.length > 0; return r; }).catch(() => { apiStatus['Price Aggregation'] = false; warnings.push('Failed to fetch price aggregation'); return null; }),
        calculateRiskScore(tokenAddress).then(r => { apiStatus['Risk Scoring'] = true; return r; }).catch(() => { apiStatus['Risk Scoring'] = false; warnings.push('Failed to calculate risk score'); return null; })
    ]);

    // Log API status summary
    console.log('[COMPREHENSIVE] API Status Summary:');
    Object.entries(apiStatus).forEach(([api, status]) => {
        console.log(`  ${status ? '✓' : '✗'} ${api}: ${status ? 'SUCCESS' : 'FAILED'}`);
    });

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
        sourcesUsed: priceAggregation?.sources.map(s => s.source) || []
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
    console.log(`[COMPREHENSIVE] Successfully used ${Object.values(apiStatus).filter(Boolean).length}/${Object.keys(apiStatus).length} data sources`);

    return {
        tokenAddress,
        basicInfo,
        priceData,
        riskAssessment,
        marketData,
        holderAnalysis,
        securityData,
        warnings,
        apiStatus,
        timestamp
    };
}

/**
 * Generate human-readable analysis summary for AI
 * @param analysis Comprehensive analysis data
 * @returns Formatted summary string
 */
export function generateAnalysisSummary(analysis: ComprehensiveTokenAnalysis): string {
    let summary = `\n`;
    summary += `╔${'═'.repeat(68)}╗\n`;
    summary += `║${' '.repeat(20)}TOKEN ANALYSIS REPORT${' '.repeat(27)}║\n`;
    summary += `╚${'═'.repeat(68)}╝\n\n`;

    // Token Info
    summary += `📊 TOKEN INFORMATION\n`;
    summary += `${'─'.repeat(70)}\n`;
    summary += `Name:    ${analysis.basicInfo.name} (${analysis.basicInfo.symbol})\n`;
    summary += `Address: ${analysis.tokenAddress}\n\n`;

    // Data Sources Status
    summary += `🔌 DATA SOURCES (${Object.values(analysis.apiStatus).filter(Boolean).length}/${Object.keys(analysis.apiStatus).length} Active)\n`;
    summary += `${'─'.repeat(70)}\n`;
    const statusEntries = Object.entries(analysis.apiStatus);
    for (let i = 0; i < statusEntries.length; i += 2) {
        const [api1, status1] = statusEntries[i];
        const [api2, status2] = statusEntries[i + 1] || ['', null];
        const col1 = `${status1 ? '✓' : '✗'} ${api1}`.padEnd(35);
        const col2 = api2 ? `${status2 ? '✓' : '✗'} ${api2}` : '';
        summary += `${col1}${col2}\n`;
    }
    summary += `\n`;

    // Price Data
    summary += `💰 PRICE VERIFICATION\n`;
    summary += `${'─'.repeat(70)}\n`;
    summary += `Current Price:     $${analysis.priceData.price.toFixed(9)}\n`;
    summary += `Confidence Score:  ${analysis.priceData.confidence}%\n`;
    summary += `Sources Used:      ${analysis.priceData.sourcesUsed.join(', ') || 'None'}\n`;
    summary += `Assessment:        ${analysis.priceData.recommendation}\n\n`;

    // Risk Assessment
    summary += `⚠️  RISK ASSESSMENT\n`;
    summary += `${'─'.repeat(70)}\n`;
    summary += `Overall Risk:      ${analysis.riskAssessment.score}/100 (${analysis.riskAssessment.level})\n`;
    summary += `Tradable:          ${analysis.riskAssessment.tradable ? '✅ YES' : '🚫 NO'}\n`;
    summary += `Recommendation:    ${analysis.riskAssessment.recommendation}\n\n`;

    if (analysis.riskAssessment.factors.length > 0) {
        summary += `Risk Factors:\n`;
        analysis.riskAssessment.factors.slice(0, 5).forEach(factor => {
            summary += `  • [${factor.severity}] ${factor.description}\n`;
        });
        if (analysis.riskAssessment.factors.length > 5) {
            summary += `  ... and ${analysis.riskAssessment.factors.length - 5} more\n`;
        }
        summary += `\n`;
    }

    // Market Metrics
    summary += `📈 MARKET METRICS\n`;
    summary += `${'─'.repeat(70)}\n`;
    summary += `Liquidity:         $${analysis.marketData.liquidity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    summary += `24h Volume:        $${analysis.marketData.volume24h.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    summary += `Market Cap:        $${analysis.marketData.marketCap.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    summary += `24h Price Change:  ${analysis.marketData.priceChange24h > 0 ? '+' : ''}${analysis.marketData.priceChange24h.toFixed(2)}%\n\n`;

    // Holder Distribution
    if (analysis.holderAnalysis) {
        summary += `👥 HOLDER DISTRIBUTION\n`;
        summary += `${'─'.repeat(70)}\n`;
        summary += `Top Holder:        ${analysis.holderAnalysis.topHolderPercentage.toFixed(2)}%\n`;
        summary += `Top 10 Holders:    ${analysis.holderAnalysis.top10Percentage.toFixed(2)}%\n`;
        summary += `Risk Level:        ${analysis.holderAnalysis.riskLevel}\n\n`;
    }

    // Security Analysis
    if (analysis.securityData) {
        summary += `🔒 SECURITY ANALYSIS\n`;
        summary += `${'─'.repeat(70)}\n`;
        summary += `Security Risk:     ${analysis.securityData.riskLevel}\n`;
        summary += `Honeypot:          ${analysis.securityData.isHoneypot ? '🚨 YES - DO NOT TRADE' : '✅ No'}\n`;
        summary += `Mintable:          ${analysis.securityData.isMintable ? '⚠️  Yes (owner can mint)' : '✅ No'}\n`;
        summary += `Buy Tax:           ${analysis.securityData.buyTax.toFixed(1)}%\n`;
        summary += `Sell Tax:          ${analysis.securityData.sellTax.toFixed(1)}%\n\n`;
    }

    // Warnings
    if (analysis.warnings.length > 0) {
        summary += `⚠️  WARNINGS\n`;
        summary += `${'─'.repeat(70)}\n`;
        analysis.warnings.forEach(warning => {
            summary += `${warning}\n`;
        });
        summary += `\n`;
    }

    summary += `${'═'.repeat(70)}\n`;
    summary += `Analysis completed at: ${new Date(analysis.timestamp).toISOString()}\n`;
    summary += `${'═'.repeat(70)}\n\n`;

    return summary;
}
