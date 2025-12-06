import { BaseAIService } from './base.service';
import { WalletIntelligenceInput, WalletIntelligenceResult } from '@x402-solintel/types';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import config from '../config';

/**
 * Wallet Intelligence Service
 * Analyzes wallet trading performance and provides copy-trade recommendations
 */
export class WalletIntelligenceService extends BaseAIService {
  private connection: Connection;

  constructor() {
    super('wallet-intelligence', config.pricing.walletIntel);
    this.connection = new Connection(config.solanaRpcUrl);
  }

  async execute(input: WalletIntelligenceInput): Promise<WalletIntelligenceResult> {
    const startTime = Date.now();

    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.walletAddress) {
      throw new Error('Wallet address is required');
    }

    try {
      // 1. Get wallet balance
      const walletPubkey = new PublicKey(input.walletAddress);
      const balance = await this.getWalletBalance(walletPubkey);

      // 2. Get token accounts (simplified - in production use Helius API)
      const tokenAccounts = await this.getTokenAccounts(walletPubkey);

      // 3. Calculate trading metrics (mock data - in production analyze tx history)
      const tradingMetrics = {
        total_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_hold_time: 'N/A',
        best_trade: {
          token: 'N/A',
          profit: 0,
        },
        worst_trade: {
          token: 'N/A',
          profit: 0,
        },
      };

      // 4. Build portfolio analysis
      const portfolio = {
        top_holdings: tokenAccounts.slice(0, 5).map((token) => ({
          token: token.symbol,
          value: token.value,
          percentage: token.percentage,
        })),
        total_tokens: tokenAccounts.length,
        diversification_score: this.calculateDiversificationScore(tokenAccounts),
      };

      // 5. Get AI insights
      const analysisData = {
        wallet: input.walletAddress,
        balance,
        portfolio,
        tradingMetrics,
      };

      const aiInsights = await this.analyzeWithAI(
        `Analyze this Solana wallet's profile and provide insights:
Wallet: ${input.walletAddress}
SOL Balance: ${balance.sol}
Total USD Value: $${balance.total_usd}
Number of Tokens: ${portfolio.total_tokens}
Diversification Score: ${portfolio.diversification_score}/10

Provide a risk profile assessment and trading insights (2-3 sentences).`,
        analysisData
      );

      // 6. Determine copy-trade recommendation
      const copyTradeSignal = this.getCopyTradeSignal(tradingMetrics, portfolio);

      // 7. Generate risk profile
      const riskProfile = this.getRiskProfile(portfolio, balance);

      const executionTime = Date.now() - startTime;

      return {
        service: 'wallet-intelligence',
        wallet: input.walletAddress,
        balance,
        trading_metrics: tradingMetrics,
        portfolio,
        risk_profile: riskProfile,
        ai_insights: aiInsights,
        copy_trade_signal: copyTradeSignal,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[WALLET_INTELLIGENCE] Service error:', error);
      throw new Error(
        `Wallet intelligence failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get wallet SOL and token balances
   */
  private async getWalletBalance(walletPubkey: PublicKey) {
    const lamports = await this.connection.getBalance(walletPubkey);
    const sol = lamports / LAMPORTS_PER_SOL;

    // In production, fetch token balances and calculate USD value
    // For now, return mock data
    return {
      total_usd: sol * 100, // Mock: assume SOL = $100
      sol,
      tokens: 0, // Would count token accounts
    };
  }

  /**
   * Get token accounts for wallet
   */
  private async getTokenAccounts(walletPubkey: PublicKey) {
    // In production, use Helius API to get parsed token accounts
    // For now, return mock data
    return [
      { symbol: 'USDC', value: 1000, percentage: 50 },
      { symbol: 'BONK', value: 500, percentage: 25 },
      { symbol: 'WIF', value: 300, percentage: 15 },
      { symbol: 'JUP', value: 200, percentage: 10 },
    ];
  }

  /**
   * Calculate portfolio diversification score
   */
  private calculateDiversificationScore(tokens: any[]): number {
    if (tokens.length === 0) return 0;
    if (tokens.length === 1) return 2;

    // Check concentration
    const topHoldingPercent = Math.max(...tokens.map((t) => t.percentage));

    let score = 10;
    if (topHoldingPercent > 70) score -= 4;
    else if (topHoldingPercent > 50) score -= 3;
    else if (topHoldingPercent > 30) score -= 1;

    // Reward diversity
    if (tokens.length >= 10) score += 2;
    else if (tokens.length >= 5) score += 1;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Get copy-trade recommendation
   */
  private getCopyTradeSignal(
    metrics: any,
    portfolio: any
  ): 'RECOMMENDED' | 'NOT RECOMMENDED' {
    // In production, base on actual performance metrics
    // For now, use simple heuristics
    if (
      metrics.win_rate > 0.6 &&
      metrics.total_pnl > 1000 &&
      portfolio.diversification_score >= 6
    ) {
      return 'RECOMMENDED';
    }
    return 'NOT RECOMMENDED';
  }

  /**
   * Generate risk profile description
   */
  private getRiskProfile(portfolio: any, balance: any): string {
    if (balance.total_usd < 1000) {
      return 'Low Capital - Conservative Trader';
    } else if (balance.total_usd < 10000) {
      if (portfolio.diversification_score >= 7) {
        return 'Medium Capital - Diversified Portfolio';
      }
      return 'Medium Capital - Concentrated Positions';
    } else {
      if (portfolio.diversification_score >= 7) {
        return 'High Capital - Sophisticated Diversified Trader';
      }
      return 'High Capital - High Conviction Trader';
    }
  }
}
