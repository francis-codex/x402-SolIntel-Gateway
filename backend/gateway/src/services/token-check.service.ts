import { BaseAIService } from './base.service';
import { TokenCheckInput, TokenCheckResult } from '@x402-solintel/types';
import { performComprehensiveAnalysis, generateAnalysisSummary } from './comprehensive-analysis.service';
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
      console.log('[TOKEN_CHECK] Starting comprehensive analysis...');

      // 1. Perform comprehensive multi-source analysis
      const analysis = await performComprehensiveAnalysis(input.tokenAddress);

      // 2. Generate human-readable summary for AI
      const dataSummary = generateAnalysisSummary(analysis);

      // 3. Create enhanced AI prompt with structured criteria
      const enhancedPrompt = `You are a professional Solana token analyst. Analyze the following token data and provide a comprehensive assessment.

${dataSummary}

REQUIRED OUTPUT FORMAT:

1. IMMEDIATE VERDICT (1 line):
[State if the token is SAFE TO TRADE, RISKY, or DANGEROUS - be direct]

2. KEY FINDINGS (3-5 bullet points):
- [Most critical security findings]
- [Liquidity and market concerns]
- [Holder distribution issues if any]
- [Price reliability assessment]
- [Any other critical red flags]

3. TRADING RECOMMENDATION (2-3 sentences):
[Specific, actionable advice on whether to trade this token and under what conditions. Include position size recommendations if applicable.]

4. RISK SUMMARY (1 sentence):
[Concise summary of the primary risk factors]

Be direct, factual, and prioritize user safety. If data is insufficient, state this clearly.`;

      // 4. Get enhanced AI analysis
      const aiAnalysis = await this.analyzeWithAI(enhancedPrompt, {
        tokenAddress: input.tokenAddress,
        analysis
      });

      // 5. Convert 0-100 risk score to 0-10 scale
      const riskScore = Math.round((100 - analysis.riskAssessment.score) / 10);

      // 6. Get recommendation
      const recommendation = this.getRecommendation(riskScore);

      const executionTime = Date.now() - startTime;

      console.log(`[TOKEN_CHECK] Analysis completed in ${executionTime}ms`);

      return {
        service: 'token-check',
        token: {
          address: input.tokenAddress,
          symbol: analysis.basicInfo.symbol || 'UNKNOWN',
          name: analysis.basicInfo.name || 'Unknown Token',
        },
        quick_stats: {
          price: analysis.priceData.price.toString(),
          market_cap: analysis.marketData.marketCap.toString(),
          holders: 0, // Can be added from Solscan if needed
          liquidity: analysis.marketData.liquidity.toString(),
        },
        risk_score: riskScore,
        security_flags: {
          freeze_authority: analysis.securityData?.isMintable || false,
          mint_authority: analysis.securityData?.isMintable || false,
          mutable_metadata: false,
          liquidity_locked: analysis.marketData.liquidity > 25000,
        },
        ai_summary: aiAnalysis,
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
   * Get recommendation based on risk score (0-10, 10 = safest)
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
