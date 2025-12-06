import { BaseAIService } from './base.service';
import { TokenCheckInput, TokenCheckResult } from '@x402-solintel/types';
import { getTokenInfo } from '../integrations/helius';
import { getTokenMetrics } from '../integrations/birdeye';
import { checkTokenSecurity } from '../integrations/rugcheck';
import config from '../config';

/**
 * Quick Token Check Service
 * Provides instant risk assessment and basic metrics
 */
export class TokenCheckService extends BaseAIService {
  constructor() {
    super('token-check', config.pricing.tokenCheck);
  }

  async execute(input: TokenCheckInput): Promise<TokenCheckResult> {
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
      // 1. Fetch data from multiple sources in parallel
      const [tokenInfo, metrics, security] = await Promise.all([
        getTokenInfo(input.tokenAddress),
        getTokenMetrics(input.tokenAddress),
        checkTokenSecurity(input.tokenAddress),
      ]);

      // 2. Calculate risk score
      const riskScore = this.calculateRiskScore(security);

      // 3. Prepare data for AI analysis
      const analysisData = {
        token: tokenInfo,
        metrics,
        security,
        riskScore,
      };

      // 4. Get AI insights
      const aiSummary = await this.analyzeWithAI(
        'Provide a brief (2-3 sentences) risk assessment and recommendation for this Solana token. Be direct and actionable.',
        analysisData
      );

      // 5. Get recommendation
      const recommendation = this.getRecommendation(riskScore);

      const executionTime = Date.now() - startTime;

      return {
        service: 'token-check',
        token: {
          address: input.tokenAddress,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
        },
        quick_stats: {
          price: metrics.price,
          market_cap: metrics.marketCap,
          holders: tokenInfo.holders,
          liquidity: metrics.liquidity,
        },
        risk_score: riskScore,
        security_flags: {
          freeze_authority: security.freezeAuthority,
          mint_authority: security.mintAuthority,
          mutable_metadata: security.mutableMetadata,
          liquidity_locked: security.liquidityLocked,
        },
        ai_summary: aiSummary,
        recommendation,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[TOKEN_CHECK] Service error:', error);
      throw new Error(
        `Token check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate risk score (0-10, 10 = safest)
   */
  private calculateRiskScore(security: any): number {
    let score = 10;

    // Deduct points for security issues
    if (security.freezeAuthority) score -= 2;
    if (security.mintAuthority) score -= 2;
    if (security.mutableMetadata) score -= 1;
    if (!security.liquidityLocked) score -= 3;

    // Holder concentration
    if (security.top10Percent > 50) score -= 2;
    else if (security.top10Percent > 30) score -= 1;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Get recommendation based on risk score
   */
  private getRecommendation(
    score: number
  ): 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'EXTREME RISK' {
    if (score >= 8) return 'LOW RISK';
    if (score >= 6) return 'MODERATE RISK';
    if (score >= 4) return 'HIGH RISK';
    return 'EXTREME RISK';
  }
}
