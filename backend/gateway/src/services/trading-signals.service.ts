import { BaseAIService } from './base.service';
import { TradingSignalsInput, TradingSignalsResult } from '@x402-solintel/types';
import { getTokenInfo } from '../integrations/helius';
import { getTokenMetrics } from '../integrations/birdeye';
import { checkTokenSecurity } from '../integrations/rugcheck';
import { getDexScreenerTokenData } from '../integrations/dexscreener';
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
    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.tokenAddress) {
      throw new Error('Token address is required');
    }

    try {
      // 1. Fetch market data from multiple sources in parallel
      const [tokenInfo, birdeyeMetrics, security, dexData] = await Promise.all([
        getTokenInfo(input.tokenAddress),
        getTokenMetrics(input.tokenAddress),
        checkTokenSecurity(input.tokenAddress),
        getDexScreenerTokenData(input.tokenAddress),
      ]);

      // 2. Aggregate and validate price data
      let currentPrice = 0;
      let priceChange24h = 0;
      let volume24h = 0;
      let liquidity = 0;
      let marketCap = 0;
      let dataSource = 'Unknown';

      // Prefer DexScreener data (more reliable for price action)
      if (dexData && parseFloat(dexData.averagePrice) > 0) {
        currentPrice = parseFloat(dexData.averagePrice);
        priceChange24h = dexData.priceChange24h || 0;
        volume24h = dexData.totalVolume24h || 0;
        liquidity = dexData.totalLiquidity || 0;
        marketCap = dexData.marketCap || 0;
        dataSource = 'DexScreener';
      } else if (birdeyeMetrics && !birdeyeMetrics.isMock) {
        // Fallback to Birdeye
        currentPrice = parseFloat(birdeyeMetrics.price.replace(/[^0-9.]/g, ''));
        priceChange24h = birdeyeMetrics.priceChange24h || 0;
        volume24h = parseFloat(birdeyeMetrics.volume24h) || 0;
        liquidity = parseFloat(birdeyeMetrics.liquidity) || 0;
        marketCap = parseFloat(birdeyeMetrics.marketCap) || 0;
        dataSource = 'Birdeye';
      } else {
        throw new Error('Unable to fetch reliable price data from any source');
      }

      console.log(`[TRADING_SIGNALS] Using ${dataSource} data: $${currentPrice}, 24h: ${priceChange24h.toFixed(2)}%`);

      // 3. Calculate advanced technical indicators
      const {
        trend,
        momentum,
        volatility,
        strength,
        supportLevels,
        resistanceLevels,
      } = this.calculateTechnicalIndicators(
        currentPrice,
        priceChange24h,
        volume24h,
        liquidity,
        dexData
      );

      // 4. Calculate risk-adjusted entry/exit points
      const riskRewardRatio = 2.5; // Target 2.5:1 risk/reward
      const volatilityMultiplier = Math.max(0.5, Math.min(2, volatility / 50));

      // Entry point based on trend and support
      let entryPoint = currentPrice;
      if (trend === 'BEARISH' || momentum < 0) {
        // Wait for price to reach support in bearish conditions
        entryPoint = parseFloat(supportLevels[0]);
      } else if (trend === 'NEUTRAL') {
        // Enter at slight pullback in neutral conditions
        entryPoint = currentPrice * 0.98;
      }

      // Stop loss based on volatility and support
      const stopLossPercent = 0.08 * volatilityMultiplier; // 8% base, adjusted by volatility
      const stopLoss = entryPoint * (1 - stopLossPercent);

      // Target based on risk/reward ratio
      const targetGainPercent = stopLossPercent * riskRewardRatio;
      const targetPrice = entryPoint * (1 + targetGainPercent);

      // 5. Get AI trading recommendation with rich context
      const analysisData = {
        token: tokenInfo,
        price: {
          current: currentPrice,
          change24h: priceChange24h,
          source: dataSource,
        },
        market: {
          marketCap,
          volume24h,
          liquidity,
          volumeToLiquidity: liquidity > 0 ? volume24h / liquidity : 0,
        },
        security,
        technical: {
          trend,
          momentum,
          volatility,
          strength,
          supportLevels,
          resistanceLevels,
        },
        dexData: dexData ? {
          pairs: dexData.allPairs.length,
          mainPairLiquidity: dexData.mainPair.liquidity?.usd || 0,
          fdv: dexData.fdv,
        } : null,
      };

      const aiPrompt = `You are a professional cryptocurrency trading analyst. Analyze this Solana token and provide a trading signal.

TOKEN INFORMATION:
Name: ${tokenInfo.name}
Symbol: ${tokenInfo.symbol}
Address: ${input.tokenAddress}

MARKET DATA (Source: ${dataSource}):
Current Price: $${currentPrice.toFixed(currentPrice < 0.01 ? 8 : 6)}
24h Change: ${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%
Market Cap: $${this.formatNumber(marketCap)}
24h Volume: $${this.formatNumber(volume24h)}
Liquidity: $${this.formatNumber(liquidity)}
Volume/Liquidity Ratio: ${liquidity > 0 ? (volume24h / liquidity).toFixed(2) : 'N/A'}

TECHNICAL ANALYSIS:
Trend: ${trend}
Momentum Score: ${momentum.toFixed(1)}/100
Volatility: ${volatility.toFixed(1)}%
Market Strength: ${strength}/10
Support Levels: ${supportLevels.join(', ')}
Resistance Levels: ${resistanceLevels.join(', ')}

SECURITY ANALYSIS:
Security Score: ${security.score}/10
Freeze Authority: ${security.freezeAuthority ? 'YES ⚠️' : 'No'}
Mint Authority: ${security.mintAuthority ? 'YES ⚠️' : 'No'}
Liquidity Locked: ${security.liquidityLocked ? 'YES ✓' : 'No ⚠️'}
Top 10 Holders: ${security.top10Percent.toFixed(1)}%
Risk Flags: ${security.flags.length > 0 ? security.flags.join(', ') : 'None'}

${dexData ? `TRADING PAIRS:
Active Pairs: ${dexData.allPairs.length}
Main Pair Liquidity: $${this.formatNumber(dexData.mainPair.liquidity?.usd || 0)}
Fully Diluted Value: $${this.formatNumber(dexData.fdv)}
` : ''}
ANALYSIS CONTEXT:
- Liquidity is ${liquidity < 10000 ? 'VERY LOW (high slippage risk)' : liquidity < 50000 ? 'LOW (moderate slippage)' : liquidity < 200000 ? 'MODERATE' : 'GOOD'}
- Volume/Liquidity ratio is ${(volume24h / liquidity) > 2 ? 'HIGH (strong interest)' : (volume24h / liquidity) > 0.5 ? 'MODERATE' : 'LOW (weak interest)'}
- Security score is ${security.score >= 8 ? 'EXCELLENT' : security.score >= 6 ? 'GOOD' : security.score >= 4 ? 'MODERATE RISK' : 'HIGH RISK'}
- Price momentum is ${momentum > 60 ? 'VERY STRONG' : momentum > 40 ? 'STRONG' : momentum > 0 ? 'POSITIVE' : momentum > -40 ? 'WEAK' : 'VERY WEAK'}

INSTRUCTIONS:
Based on the comprehensive data above, provide a professional trading recommendation. Consider:
1. Risk factors (security, liquidity, concentration)
2. Technical momentum and trend
3. Market conditions (volume, volatility)
4. Entry/exit timing

Respond ONLY with valid JSON in this exact format:
{
  "signal": "STRONG BUY|BUY|HOLD|SELL|STRONG SELL",
  "confidence": 0.75,
  "reasoning": "2-3 sentences explaining the recommendation with specific data points"
}

CRITICAL: Respond with ONLY the JSON object, no other text.`;

      const aiResponse = await this.analyzeWithAI(aiPrompt, analysisData);

      // Parse AI response with better error handling
      let aiResult;
      try {
        // Try to extract JSON from response (in case AI adds extra text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (error) {
        console.error('[TRADING_SIGNALS] Failed to parse AI response:', error);
        // Fallback signal based on technical analysis
        aiResult = this.generateFallbackSignal(trend, momentum, security.score, liquidity);
      }

      // Validate and format the result
      return {
        service: 'trading-signals',
        token: {
          address: input.tokenAddress,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
        },
        signal: aiResult.signal,
        confidence: Math.max(0, Math.min(1, aiResult.confidence || 0.5)),
        entry_point: entryPoint.toFixed(currentPrice < 0.01 ? 8 : 6),
        target_price: targetPrice.toFixed(currentPrice < 0.01 ? 8 : 6),
        stop_loss: stopLoss.toFixed(currentPrice < 0.01 ? 8 : 6),
        technical_analysis: {
          trend: trend as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
          momentum: momentum.toFixed(1),
          volatility: volatility.toFixed(1),
          strength,
          support_levels: supportLevels,
          resistance_levels: resistanceLevels,
          volume_24h: this.formatNumber(volume24h),
          liquidity: this.formatNumber(liquidity),
          market_cap: this.formatNumber(marketCap),
        },
        security_analysis: {
          score: security.score,
          risk_flags: security.flags,
          freeze_authority: security.freezeAuthority,
          mint_authority: security.mintAuthority,
          liquidity_locked: security.liquidityLocked,
        },
        ai_reasoning: aiResult.reasoning,
        data_source: dataSource,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[TRADING_SIGNALS] Service error:', error);
      throw new Error(
        `Trading signals failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate comprehensive technical indicators
   */
  private calculateTechnicalIndicators(
    currentPrice: number,
    priceChange24h: number,
    volume24h: number,
    liquidity: number,
    _dexData: any
  ) {
    // Determine trend based on multiple factors
    let trendScore = 0;
    if (priceChange24h > 10) trendScore += 2;
    else if (priceChange24h > 5) trendScore += 1;
    else if (priceChange24h < -10) trendScore -= 2;
    else if (priceChange24h < -5) trendScore -= 1;

    // Add volume/liquidity ratio to trend
    const volLiqRatio = liquidity > 0 ? volume24h / liquidity : 0;
    if (volLiqRatio > 1) trendScore += 1;
    else if (volLiqRatio < 0.2) trendScore -= 1;

    const trend = trendScore > 1 ? 'BULLISH' : trendScore < -1 ? 'BEARISH' : 'NEUTRAL';

    // Calculate momentum (0-100 scale)
    const momentum = Math.max(0, Math.min(100, 50 + priceChange24h * 2));

    // Calculate volatility based on price change and volume
    const baseVolatility = Math.abs(priceChange24h);
    const volumeVolatility = volLiqRatio > 2 ? 20 : volLiqRatio > 1 ? 10 : 0;
    const volatility = baseVolatility + volumeVolatility;

    // Calculate market strength (1-10)
    let strength = 5;
    if (liquidity > 500000) strength += 2;
    else if (liquidity > 100000) strength += 1;
    else if (liquidity < 20000) strength -= 2;

    if (volume24h > 1000000) strength += 1;
    else if (volume24h < 50000) strength -= 1;

    strength = Math.max(1, Math.min(10, strength));

    // Support and resistance levels
    const supportLevels = [
      (currentPrice * 0.95).toFixed(currentPrice < 0.01 ? 8 : 6),
      (currentPrice * 0.90).toFixed(currentPrice < 0.01 ? 8 : 6),
      (currentPrice * 0.85).toFixed(currentPrice < 0.01 ? 8 : 6),
    ];

    const resistanceLevels = [
      (currentPrice * 1.05).toFixed(currentPrice < 0.01 ? 8 : 6),
      (currentPrice * 1.10).toFixed(currentPrice < 0.01 ? 8 : 6),
      (currentPrice * 1.15).toFixed(currentPrice < 0.01 ? 8 : 6),
    ];

    return {
      trend,
      momentum,
      volatility,
      strength,
      supportLevels,
      resistanceLevels,
    };
  }

  /**
   * Generate fallback signal when AI fails
   */
  private generateFallbackSignal(
    trend: string,
    momentum: number,
    securityScore: number,
    liquidity: number
  ) {
    let signal = 'HOLD';
    let confidence = 0.5;
    let reasoning = 'Technical analysis based fallback signal. ';

    // Calculate signal based on technical factors
    if (securityScore < 5) {
      signal = 'SELL';
      confidence = 0.7;
      reasoning += 'Low security score indicates high risk. ';
    } else if (liquidity < 10000) {
      signal = 'HOLD';
      confidence = 0.4;
      reasoning += 'Very low liquidity poses significant slippage risk. ';
    } else if (trend === 'BULLISH' && momentum > 60 && securityScore >= 7) {
      signal = 'BUY';
      confidence = 0.7;
      reasoning += 'Strong bullish momentum with good security. ';
    } else if (trend === 'BEARISH' && momentum < 40) {
      signal = 'SELL';
      confidence = 0.6;
      reasoning += 'Bearish trend with weak momentum. ';
    } else {
      reasoning += 'Mixed signals suggest waiting for clearer direction. ';
    }

    reasoning += 'AI analysis unavailable - using technical indicators only.';

    return { signal, confidence, reasoning };
  }

  /**
   * Format large numbers for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }
}
