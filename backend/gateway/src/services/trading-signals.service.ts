import { BaseAIService } from './base.service';
import { TradingSignalsInput, TradingSignalsResult } from '@x402-solintel/types';
import { getTokenInfo } from '../integrations/helius';
import { getTokenMetrics } from '../integrations/birdeye';
import { checkTokenSecurity } from '../integrations/rugcheck';
import config from '../config';

/**
 * Trading Signals Service
 * Provides AI-powered buy/sell recommendations with entry/exit points
 */
export class TradingSignalsService extends BaseAIService {
  constructor() {
    super('trading-signals', config.pricing.tradingSignals);
  }

  async execute(input: TradingSignalsInput): Promise<TradingSignalsResult> {
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
      // 1. Fetch market data
      const [tokenInfo, metrics, security] = await Promise.all([
        getTokenInfo(input.tokenAddress),
        getTokenMetrics(input.tokenAddress),
        checkTokenSecurity(input.tokenAddress),
      ]);

      // 2. Calculate technical indicators
      const currentPrice = parseFloat(metrics.price.replace(/[^0-9.]/g, ''));
      const priceChange24h = metrics.priceChange24h;

      // Simple support/resistance based on price action
      const supportLevels = [
        (currentPrice * 0.95).toFixed(6),
        (currentPrice * 0.9).toFixed(6),
        (currentPrice * 0.85).toFixed(6),
      ];

      const resistanceLevels = [
        (currentPrice * 1.05).toFixed(6),
        (currentPrice * 1.1).toFixed(6),
        (currentPrice * 1.15).toFixed(6),
      ];

      // 3. Determine trend
      const trend = priceChange24h > 5 ? 'BULLISH' : priceChange24h < -5 ? 'BEARISH' : 'NEUTRAL';

      // 4. Calculate entry/exit points
      const entryPoint = trend === 'BULLISH'
        ? currentPrice.toFixed(6)
        : supportLevels[0];

      const targetPrice = (currentPrice * 1.2).toFixed(6); // 20% target
      const stopLoss = (currentPrice * 0.9).toFixed(6); // 10% stop loss

      // 5. Get AI trading recommendation
      const analysisData = {
        token: tokenInfo,
        metrics,
        security,
        technical: {
          trend,
          priceChange24h,
          supportLevels,
          resistanceLevels,
        },
      };

      const aiPrompt = `Analyze this Solana token for trading:
Token: ${tokenInfo.name} (${tokenInfo.symbol})
Current Price: ${metrics.price}
24h Change: ${priceChange24h}%
Market Cap: ${metrics.marketCap}
Volume 24h: ${metrics.volume24h}
Liquidity: ${metrics.liquidity}
Trend: ${trend}
Security Score: ${security.score}

Provide:
1. Trading signal (STRONG BUY, BUY, HOLD, SELL, STRONG SELL)
2. Confidence level (0-1)
3. Detailed reasoning (2-3 sentences)

Format as JSON:
{
  "signal": "STRONG BUY|BUY|HOLD|SELL|STRONG SELL",
  "confidence": 0.0-1.0,
  "reasoning": "..."
}`;

      const aiResponse = await this.analyzeWithAI(aiPrompt, analysisData);

      // Parse AI response
      let aiResult;
      try {
        aiResult = JSON.parse(aiResponse);
      } catch {
        // Fallback if AI doesn't return valid JSON
        aiResult = {
          signal: 'HOLD',
          confidence: 0.5,
          reasoning: aiResponse,
        };
      }

      const executionTime = Date.now() - startTime;

      return {
        service: 'trading-signals',
        token: {
          address: input.tokenAddress,
          symbol: tokenInfo.symbol,
        },
        signal: aiResult.signal,
        confidence: aiResult.confidence,
        entry_point: entryPoint,
        target_price: targetPrice,
        stop_loss: stopLoss,
        technical_analysis: {
          trend,
          support_levels: supportLevels,
          resistance_levels: resistanceLevels,
        },
        ai_reasoning: aiResult.reasoning,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[TRADING_SIGNALS] Service error:', error);
      throw new Error(
        `Trading signals failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
