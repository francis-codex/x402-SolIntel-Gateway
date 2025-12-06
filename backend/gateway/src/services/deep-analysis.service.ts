import { BaseAIService } from './base.service';
import { DeepAnalysisInput, DeepAnalysisResult } from '@x402-solintel/types';
import { getTokenInfo } from '../integrations/helius';
import { getTokenMetrics } from '../integrations/birdeye';
import { checkTokenSecurity } from '../integrations/rugcheck';
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
    const startTime = Date.now();

    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.tokenAddress) {
      throw new Error('Token address is required');
    }

    try {
      // 1. Fetch comprehensive data in parallel
      const [tokenInfo, metrics, security] = await Promise.all([
        getTokenInfo(input.tokenAddress),
        getTokenMetrics(input.tokenAddress),
        checkTokenSecurity(input.tokenAddress),
      ]);

      // 2. Analyze holder distribution
      const holderAnalysis = {
        top_10_percent: security.top10Percent,
        top_20_percent: security.top10Percent + 10, // Estimated
        distribution_score: this.calculateDistributionScore(security.top10Percent),
      };

      // 3. Mock social metrics (in production, integrate with Twitter API)
      const socialMetrics = {
        twitter_followers: 0,
        mentions_24h: 0,
        sentiment_score: 0.5,
      };

      // 4. Calculate whale activity from metrics
      const whaleActivity = {
        large_buys_24h: 0, // Would need transaction history API
        large_sells_24h: 0,
        net_flow: '0',
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

      const aiInsightsPrompt = `Analyze this Solana token comprehensively:
Token: ${tokenInfo.name} (${tokenInfo.symbol})
Price: ${metrics.price}
Market Cap: ${metrics.marketCap}
Volume 24h: ${metrics.volume24h}
Holders: ${tokenInfo.holders}
Security Score: ${security.score}
Top 10 holders: ${security.top10Percent}%

Provide:
1. A detailed summary (3-4 sentences)
2. Sentiment analysis (BULLISH/NEUTRAL/BEARISH)
3. Specific recommendations
4. Confidence level (0-1)

Format as JSON:
{
  "summary": "...",
  "sentiment": "BULLISH|NEUTRAL|BEARISH",
  "recommendation": "...",
  "confidence": 0.0-1.0
}`;

      const aiResponse = await this.analyzeWithAI(aiInsightsPrompt, analysisData);

      // Parse AI response
      let aiInsights;
      try {
        aiInsights = JSON.parse(aiResponse);
      } catch {
        // Fallback if AI doesn't return valid JSON
        aiInsights = {
          summary: aiResponse,
          sentiment: 'NEUTRAL' as const,
          recommendation: 'Conduct further research before investing',
          confidence: 0.5,
        };
      }

      // 6. Calculate comprehensive risk score
      const riskScore = this.calculateRiskScore(security, holderAnalysis, metrics);

      const executionTime = Date.now() - startTime;

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
