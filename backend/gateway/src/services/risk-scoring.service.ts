import { analyzeTokenHolderDistribution } from '../integrations/helius';
import { getComprehensiveSecurityCheck } from '../integrations/goplus';
import { aggregateTokenPrice } from './price-aggregator.service';
import { getDexScreenerTokenData } from '../integrations/dexscreener';
import { checkTokenSecurity } from '../integrations/rugcheck';

export interface RiskFactor {
    category: string;
    risk: number; // 0-100
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
}

export interface RiskScore {
    overallScore: number; // 0-100 (0 = safe, 100 = very risky)
    riskLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: RiskFactor[];
    recommendation: string;
    tradable: boolean;
}

/**
 * Calculate comprehensive risk score from all available data
 * @param tokenAddress Solana token mint address
 * @returns Comprehensive risk assessment
 */
export async function calculateRiskScore(tokenAddress: string): Promise<RiskScore> {
    const factors: RiskFactor[] = [];
    let totalRisk = 0;

    // Fetch all data in parallel
    const [securityCheck, holderDistribution, priceData, dexData, rugCheck] = await Promise.all([
        getComprehensiveSecurityCheck(tokenAddress).catch(() => null),
        analyzeTokenHolderDistribution(tokenAddress).catch(() => null),
        aggregateTokenPrice(tokenAddress).catch(() => null),
        getDexScreenerTokenData(tokenAddress).catch(() => null),
        checkTokenSecurity(tokenAddress).catch(() => null)
    ]);

    // 1. Security Risks (GoPlus)
    if (securityCheck?.analysis) {
        const sec = securityCheck.analysis;

        if (sec.isHoneypot) {
            factors.push({
                category: 'Security',
                risk: 100,
                severity: 'CRITICAL',
                description: '🚨 HONEYPOT DETECTED - Cannot sell tokens'
            });
            totalRisk += 100;
        }

        if (sec.isMintable) {
            factors.push({
                category: 'Security',
                risk: 25,
                severity: 'HIGH',
                description: '⚠️ Unlimited minting enabled'
            });
            totalRisk += 25;
        }

        if (sec.buyTax > 10 || sec.sellTax > 10) {
            const maxTax = Math.max(sec.buyTax, sec.sellTax);
            factors.push({
                category: 'Tokenomics',
                risk: Math.min(maxTax, 30),
                severity: maxTax > 20 ? 'HIGH' : 'MEDIUM',
                description: `⚠️ High taxes - Buy: ${sec.buyTax.toFixed(1)}%, Sell: ${sec.sellTax.toFixed(1)}%`
            });
            totalRisk += Math.min(maxTax, 30);
        }

        // Only penalize closed source for low liquidity tokens (likely new/untested)
        if (!sec.isOpenSource && (!dexData || dexData.totalLiquidity < 100000)) {
            factors.push({
                category: 'Security',
                risk: 15,
                severity: 'MEDIUM',
                description: '⚠️ Contract not open source'
            });
            totalRisk += 15;
        }

        // Add remaining GoPlus risks (reduce severity for established tokens)
        if (sec.risks.length > 0) {
            const hasHighLiquidity = dexData && dexData.totalLiquidity > 500000;
            const riskPenalty = hasHighLiquidity ? 5 : 10; // Halve penalty for established tokens

            sec.risks.forEach((riskText: string) => {
                if (!riskText.includes('HONEYPOT') && !riskText.includes('tax')) {
                    factors.push({
                        category: 'Security',
                        risk: riskPenalty,
                        severity: hasHighLiquidity ? 'LOW' : 'MEDIUM',
                        description: riskText
                    });
                    totalRisk += riskPenalty;
                }
            });
        }
    }

    // 2. Holder Concentration Risk (adjusted for token legitimacy)
    if (holderDistribution) {
        const concentrationRisk = holderDistribution.concentrationRisk;

        // Reduce concentration risk for high liquidity tokens (likely treasury/DAO/exchange wallets)
        let adjustedConcentrationRisk = concentrationRisk;
        const hasHighLiquidity = dexData && dexData.totalLiquidity > 500000;
        const hasHighMarketCap = dexData && dexData.marketCap > 100000000; // $100M+

        console.log('[RISK_SCORING] Holder concentration:', {
            original: concentrationRisk,
            hasHighLiquidity,
            hasHighMarketCap,
            liquidity: dexData?.totalLiquidity,
            marketCap: dexData?.marketCap
        });

        if ((hasHighLiquidity || hasHighMarketCap) && concentrationRisk > 0) {
            // For legitimate large-cap tokens, concentration is often due to treasury/DAO/exchanges
            adjustedConcentrationRisk = Math.round(concentrationRisk * 0.3); // Reduce by 70%
            console.log('[RISK_SCORING] Adjusted concentration risk from', concentrationRisk, 'to', adjustedConcentrationRisk);
        }

        if (adjustedConcentrationRisk > 0) {
            factors.push({
                category: 'Holder Distribution',
                risk: adjustedConcentrationRisk,
                severity: adjustedConcentrationRisk > 60 ? 'HIGH' : adjustedConcentrationRisk > 40 ? 'MEDIUM' : 'LOW',
                description: hasHighLiquidity || hasHighMarketCap ?
                    `⚠️ Holder concentration (likely treasury/DAO wallets) - Top holder: ${holderDistribution.topHolderPercentage.toFixed(1)}%, Top 10: ${holderDistribution.top10Percentage.toFixed(1)}%` :
                    `${holderDistribution.riskLevel} holder concentration - Top holder: ${holderDistribution.topHolderPercentage.toFixed(1)}%, Top 10: ${holderDistribution.top10Percentage.toFixed(1)}%`
            });
            totalRisk += adjustedConcentrationRisk;
        }
    }

    // 3. Price Reliability Risk
    if (priceData) {
        if (!priceData.isReliable) {
            const priceRisk = 100 - priceData.confidence;
            factors.push({
                category: 'Price Data',
                risk: priceRisk,
                severity: priceRisk > 60 ? 'HIGH' : priceRisk > 40 ? 'MEDIUM' : 'LOW',
                description: `⚠️ Price verification confidence: ${priceData.confidence}% (${priceData.sources.length} sources)`
            });
            totalRisk += priceRisk * 0.5; // Weight price risk at 50%
        }
    } else {
        factors.push({
            category: 'Price Data',
            risk: 40,
            severity: 'MEDIUM',
            description: '⚠️ No price data available from any source'
        });
        totalRisk += 40;
    }

    // 4. Liquidity Risk
    if (dexData) {
        const liquidity = dexData.totalLiquidity;

        if (liquidity < 1000) {
            factors.push({
                category: 'Liquidity',
                risk: 50,
                severity: 'CRITICAL',
                description: `🚨 Very low liquidity: $${liquidity.toFixed(0)}`
            });
            totalRisk += 50;
        } else if (liquidity < 5000) {
            factors.push({
                category: 'Liquidity',
                risk: 30,
                severity: 'HIGH',
                description: `⚠️ Low liquidity: $${liquidity.toFixed(0)}`
            });
            totalRisk += 30;
        } else if (liquidity < 25000) {
            factors.push({
                category: 'Liquidity',
                risk: 15,
                severity: 'MEDIUM',
                description: `⚠️ Moderate liquidity: $${liquidity.toFixed(0)}`
            });
            totalRisk += 15;
        }

        // Volume to liquidity ratio (pump detection)
        const volumeToLiquidityRatio = dexData.totalVolume24h / liquidity;
        if (volumeToLiquidityRatio > 10) {
            factors.push({
                category: 'Market Activity',
                risk: 20,
                severity: 'MEDIUM',
                description: `⚠️ Unusually high volume/liquidity ratio: ${volumeToLiquidityRatio.toFixed(1)}x (possible pump)`
            });
            totalRisk += 20;
        }
    } else {
        factors.push({
            category: 'Liquidity',
            risk: 35,
            severity: 'HIGH',
            description: '⚠️ No liquidity data available'
        });
        totalRisk += 35;
    }

    // 5. RugCheck Integration (reduce for established tokens)
    if (rugCheck) {
        if (rugCheck.flags && rugCheck.flags.length > 0) {
            const hasHighLiquidity = dexData && dexData.totalLiquidity > 500000;
            const hasHighMarketCap = dexData && dexData.marketCap > 100000000;

            // Reduce RugCheck penalty for established tokens (likely false positives)
            const flagPenalty = (hasHighLiquidity || hasHighMarketCap) ? 3 : 10;
            const rugRisk = Math.min(rugCheck.flags.length * flagPenalty, 40);

            factors.push({
                category: 'RugCheck',
                risk: rugRisk,
                severity: (hasHighLiquidity || hasHighMarketCap) ? 'LOW' : (rugRisk > 30 ? 'HIGH' : 'MEDIUM'),
                description: `⚠️ RugCheck found ${rugCheck.flags.length} potential issues`
            });
            totalRisk += rugRisk;
        }
    }

    // Cap total risk at 100
    totalRisk = Math.min(totalRisk, 100);

    // Log detailed risk breakdown
    console.log('[RISK_SCORING] Total risk score:', totalRisk);
    console.log('[RISK_SCORING] Risk factors breakdown:');
    factors.forEach(f => {
        console.log(`  - ${f.category}: +${f.risk} (${f.severity}) - ${f.description}`);
    });

    // Determine risk level
    const riskLevel: RiskScore['riskLevel'] =
        totalRisk >= 80 ? 'CRITICAL' :
        totalRisk >= 60 ? 'HIGH' :
        totalRisk >= 40 ? 'MEDIUM' :
        totalRisk >= 20 ? 'LOW' :
        'MINIMAL';

    // Determine if token is tradable
    const hasHoneypot = factors.some(f => f.description.includes('HONEYPOT'));
    const tradable = !hasHoneypot && totalRisk < 90;

    // Generate recommendation
    let recommendation = '';
    if (hasHoneypot) {
        recommendation = '🚫 DO NOT TRADE - Token is a honeypot';
    } else if (totalRisk >= 80) {
        recommendation = '🚨 EXTREME RISK - Avoid trading';
    } else if (totalRisk >= 60) {
        recommendation = '⚠️ HIGH RISK - Only trade with extreme caution and small amounts';
    } else if (totalRisk >= 40) {
        recommendation = '⚠️ MODERATE RISK - Exercise caution, do your own research';
    } else if (totalRisk >= 20) {
        recommendation = '✓ LOW RISK - Appears relatively safe but always verify';
    } else {
        recommendation = '✅ MINIMAL RISK - Token appears legitimate based on available data';
    }

    return {
        overallScore: totalRisk,
        riskLevel,
        factors,
        recommendation,
        tradable
    };
}

/**
 * Get human-readable risk report
 * @param tokenAddress Solana token mint address
 * @returns Formatted risk report
 */
export async function generateRiskReport(tokenAddress: string): Promise<string> {
    const riskScore = await calculateRiskScore(tokenAddress);

    let report = `\n═══════════════════════════════════════\n`;
    report += `RISK ASSESSMENT REPORT\n`;
    report += `═══════════════════════════════════════\n\n`;
    report += `Overall Risk Score: ${riskScore.overallScore}/100\n`;
    report += `Risk Level: ${riskScore.riskLevel}\n`;
    report += `Tradable: ${riskScore.tradable ? '✅ Yes' : '🚫 No'}\n\n`;
    report += `${riskScore.recommendation}\n\n`;

    if (riskScore.factors.length > 0) {
        report += `Risk Factors:\n`;
        report += `${'─'.repeat(39)}\n`;

        for (const factor of riskScore.factors) {
            report += `\n[${factor.severity}] ${factor.category}\n`;
            report += `Risk: ${factor.risk}/100\n`;
            report += `${factor.description}\n`;
        }
    } else {
        report += `No significant risk factors detected.\n`;
    }

    report += `\n═══════════════════════════════════════\n`;

    return report;
}
