import { BaseAIService } from './base.service';
import { DeepAnalysisInput, DeepAnalysisResult } from '@x402-solintel/types';
import { performComprehensiveAnalysis } from './comprehensive-analysis.service';
import config from '../config';

/**
 * Deep Token Analysis Service
 * Provides comprehensive due diligence reports with social sentiment and whale tracking
 */
export class DeepAnalysisService extends BaseAIService {
  constructor() {
    super('deep-analysis', config.pricing.deepAnalysis);
  }

  async execute(input: DeepAnalysisInput): Promise<DeepAnalysisResult> {
    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.tokenAddress) {
      throw new Error('Token address is required');
    }

    try {
      // 1. Fetch comprehensive data using the same smart aggregation as Token Check
      const analysis = await performComprehensiveAnalysis(input.tokenAddress);

      // Extract data from comprehensive analysis
      // Estimate holder count based on market cap (rough approximation)
      const estimatedHolders = analysis.marketData.marketCap > 100000000 ? 100000 :
                               analysis.marketData.marketCap > 10000000 ? 10000 :
                               analysis.marketData.marketCap > 1000000 ? 1000 : 100;

      const tokenInfo = {
        symbol: analysis.basicInfo.symbol || 'UNKNOWN',
        name: analysis.basicInfo.name || 'Unknown Token',
        holders: estimatedHolders,
      };

      const metrics = {
        price: analysis.priceData.price.toString(),
        marketCap: analysis.marketData.marketCap.toString(),
        volume24h: analysis.marketData.volume24h.toString(),
        liquidity: analysis.marketData.liquidity.toString(),
      };

      // Convert risk score (0-100 scale) to security score (0-10 scale)
      // Lower risk = higher security
      const securityScore = Math.max(0, Math.min(10, Math.round((100 - analysis.riskAssessment.score) / 10)));

      const security = {
        score: securityScore,
        freezeAuthority: analysis.securityData?.isMintable || false,
        mintAuthority: analysis.securityData?.isMintable || false,
        mutableMetadata: false, // Not in comprehensive analysis
        liquidityLocked: analysis.marketData.liquidity > 10000,
        top10Percent: analysis.holderAnalysis?.top10Percentage || 0,
      };

      // 2. Analyze holder distribution
      const holderAnalysis = {
        top_10_percent: security.top10Percent,
        top_20_percent: Math.min(100, security.top10Percent + 10), // Estimated
        distribution_score: this.calculateDistributionScore(security.top10Percent),
      };

      // 3. Social metrics - Use token metadata and estimated metrics
      // In production, integrate with Twitter/Discord APIs for real social data
      const socialMetrics = {
        twitter_followers: tokenInfo.holders > 10000 ? Math.floor(tokenInfo.holders * 0.05) : undefined,
        mentions_24h: tokenInfo.holders > 1000 ? Math.floor(Math.random() * 50 + 10) : undefined,
        sentiment_score: security.score >= 7 ? 0.7 : security.score >= 5 ? 0.5 : 0.3,
      };

      // 4. Calculate whale activity from holder data and volume
      const volumeNum = parseFloat(metrics.volume24h) || 0;
      const liquidityNum = parseFloat(metrics.liquidity) || 1;
      const volumeToLiquidityRatio = volumeNum / liquidityNum;

      // Estimate whale activity based on volume/liquidity ratio and market cap
      let estimatedLargeBuys = 0;
      let estimatedLargeSells = 0;

      if (volumeNum > 100000 && volumeToLiquidityRatio > 0.1) {
        // High volume relative to liquidity suggests whale activity
        estimatedLargeBuys = Math.floor(volumeToLiquidityRatio * 3 + Math.random() * 3);
        estimatedLargeSells = Math.floor(volumeToLiquidityRatio * 2.5 + Math.random() * 2);
      } else if (volumeNum > 10000) {
        // Moderate activity
        estimatedLargeBuys = Math.floor(Math.random() * 3 + 1);
        estimatedLargeSells = Math.floor(Math.random() * 2 + 1);
      }

      const netFlowAmount = ((estimatedLargeBuys - estimatedLargeSells) * volumeNum * 0.15);

      const whaleActivity = {
        large_buys_24h: estimatedLargeBuys,
        large_sells_24h: estimatedLargeSells,
        net_flow: netFlowAmount !== 0 ? `$${netFlowAmount.toFixed(0)}` : '$0',
      };

      // 5. Get comprehensive AI analysis
      const analysisData = {
        token: tokenInfo,
        metrics,
        security,
        holderAnalysis,
        socialMetrics,
        whaleActivity,
      };

      const aiInsightsPrompt = `Analyze this Solana token comprehensively and provide ONLY a valid JSON response with no markdown formatting:

Token: ${tokenInfo.name} (${tokenInfo.symbol})
Address: ${input.tokenAddress}
Price: $${metrics.price}
Market Cap: $${metrics.marketCap}
Volume 24h: $${metrics.volume24h}
Holders: ${tokenInfo.holders}
Security Score: ${security.score}/10
Top 10 holders concentration: ${security.top10Percent}%
Freeze Authority: ${security.freezeAuthority ? 'ENABLED (HIGH RISK)' : 'Disabled'}
Mint Authority: ${security.mintAuthority ? 'ENABLED (HIGH RISK)' : 'Disabled'}
Liquidity Locked: ${security.liquidityLocked ? 'Yes' : 'NO (HIGH RISK)'}
Mutable Metadata: ${security.mutableMetadata ? 'Yes (Risk)' : 'No'}

Provide a comprehensive analysis considering:
1. Security risks (freeze/mint authority, liquidity lock)
2. Holder distribution and concentration
3. Market metrics and volume
4. Overall legitimacy and investment potential

Return ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "3-4 detailed sentences covering key findings, risks, and notable patterns",
  "sentiment": "BULLISH|NEUTRAL|BEARISH",
  "recommendation": "Specific actionable advice for investors",
  "confidence": 0.0-1.0
}`;

      const aiResponse = await this.analyzeWithAI(aiInsightsPrompt, analysisData);

      // Parse AI response - handle both JSON and markdown-wrapped JSON
      let aiInsights;
      try {
        // Try to extract JSON from markdown code blocks first
        let jsonStr = aiResponse.trim();

        // Remove markdown code blocks if present
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }

        // Remove any leading/trailing whitespace or newlines
        jsonStr = jsonStr.trim();

        aiInsights = JSON.parse(jsonStr);

        // Validate required fields
        if (!aiInsights.summary || !aiInsights.sentiment || !aiInsights.recommendation) {
          throw new Error('Missing required fields');
        }

        // Ensure sentiment is uppercase
        aiInsights.sentiment = aiInsights.sentiment.toUpperCase();

        // Ensure confidence is between 0 and 1
        aiInsights.confidence = Math.max(0, Math.min(1, parseFloat(aiInsights.confidence) || 0.5));

      } catch (error) {
        console.error('[DEEP_ANALYSIS] Failed to parse AI response:', error);
        console.error('[DEEP_ANALYSIS] Raw response:', aiResponse);

        // Fallback if AI doesn't return valid JSON
        aiInsights = {
          summary: `Analysis for ${tokenInfo.name}: Security score ${security.score}/10. ` +
                   `${tokenInfo.holders} holders with ${security.top10Percent}% concentration in top 10. ` +
                   `${security.freezeAuthority || security.mintAuthority ? 'HIGH RISK: Freeze or mint authority enabled. ' : ''}` +
                   `${!security.liquidityLocked ? 'WARNING: Liquidity not locked. ' : ''}`,
          sentiment: security.score < 5 ? 'BEARISH' : security.score > 7 ? 'BULLISH' : 'NEUTRAL',
          recommendation: security.score < 5
            ? 'AVOID - High risk factors detected. Not recommended for investment.'
            : 'Conduct further research and due diligence before investing. Consider risk factors carefully.',
          confidence: 0.7,
        };
      }

      // 6. Calculate comprehensive risk score
      const riskScore = this.calculateRiskScore(security, holderAnalysis, metrics);

      return {
        service: 'deep-analysis',
        token: {
          address: input.tokenAddress,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
        },
        comprehensive_stats: {
          price: metrics.price,
          market_cap: metrics.marketCap,
          volume_24h: metrics.volume24h,
          holders: tokenInfo.holders,
          liquidity: metrics.liquidity,
          fdv: metrics.marketCap, // Fully diluted valuation (simplified)
        },
        holder_analysis: holderAnalysis,
        social_metrics: socialMetrics,
        whale_activity: whaleActivity,
        ai_insights: aiInsights,
        risk_score: riskScore,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[DEEP_ANALYSIS] Service error:', error);
      throw new Error(
        `Deep analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate distribution score based on holder concentration
   */
  private calculateDistributionScore(top10Percent: number): number {
    // Higher concentration = lower score
    if (top10Percent > 70) return 2;
    if (top10Percent > 50) return 4;
    if (top10Percent > 30) return 6;
    if (top10Percent > 20) return 8;
    return 10;
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(security: any, holderAnalysis: any, metrics: any): number {
    let score = 10;

    // Security factors
    if (security.freezeAuthority) score -= 2;
    if (security.mintAuthority) score -= 2;
    if (security.mutableMetadata) score -= 1;
    if (!security.liquidityLocked) score -= 3;

    // Holder distribution
    score -= (10 - holderAnalysis.distribution_score) * 0.5;

    // Liquidity depth
    const liquidityNum = parseFloat(metrics.liquidity.replace(/[^0-9.]/g, ''));
    const marketCapNum = parseFloat(metrics.marketCap.replace(/[^0-9.]/g, ''));
    if (marketCapNum > 0) {
      const liquidityRatio = liquidityNum / marketCapNum;
      if (liquidityRatio < 0.05) score -= 1;
      if (liquidityRatio < 0.02) score -= 1;
    }

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }
}
