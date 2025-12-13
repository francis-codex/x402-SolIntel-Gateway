import { BaseAIService } from './base.service';
import { WalletIntelligenceInput, WalletIntelligenceResult } from '@x402-solintel/types';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import config from '../config';
import { getWalletTransactions, getTokenInfo, analyzeTokenHolderDistribution } from '../integrations/helius';
import axios from 'axios';

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

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
      // 1. Get wallet balance and real token holdings
      const walletPubkey = new PublicKey(input.walletAddress);
      const balance = await this.getWalletBalance(walletPubkey, input.walletAddress);

      // 2. Get real token accounts from Helius
      const tokenAccounts = await this.getTokenAccounts(input.walletAddress);

      // 3. Get transaction history and analyze trading
      const transactions = await getWalletTransactions(input.walletAddress, 100);
      const tradingMetrics = await this.analyzeTradingActivity(transactions, input.walletAddress);

      // 4. Get wallet age and activity stats
      const walletStats = this.getWalletStats(transactions);

      // 5. Build portfolio analysis with risk scoring
      const portfolio = {
        top_holdings: await Promise.all(
          tokenAccounts.slice(0, 5).map(async (token) => ({
            token: token.symbol,
            value: token.value,
            percentage: token.percentage,
            risk_score: token.risk_score || 0,
          }))
        ),
        total_tokens: tokenAccounts.length,
        diversification_score: this.calculateDiversificationScore(tokenAccounts),
      };

      // 6. Get AI insights
      const analysisData = {
        wallet: input.walletAddress,
        balance,
        portfolio,
        tradingMetrics,
        walletStats,
      };

      const aiPrompt = `You are a professional Solana wallet analyst. Analyze this wallet and provide clean, actionable insights WITHOUT any markdown formatting.

WALLET DETAILS:
- Address: ${input.walletAddress}
- Wallet Age: ${walletStats.wallet_age_days} days (First seen: ${walletStats.first_transaction_date})
- SOL Balance: ${balance.sol.toFixed(4)} SOL
- Total USD Value: $${balance.total_usd.toLocaleString()}
- Token Holdings: ${portfolio.total_tokens} tokens
- Diversification: ${portfolio.diversification_score}/10
- Top Holdings: ${portfolio.top_holdings.map(h => `${h.token} ($${h.value.toFixed(0)}, ${h.percentage.toFixed(1)}%)`).join(', ')}
- Total Transactions: ${walletStats.total_transactions}
- Trading Activity: ${tradingMetrics.total_trades} trades | ${(tradingMetrics.win_rate * 100).toFixed(1)}% win rate | $${tradingMetrics.total_pnl.toFixed(2)} P&L
- Average Hold Time: ${tradingMetrics.avg_hold_time}
- Activity Pattern: ${walletStats.avg_daily_transactions.toFixed(1)} transactions/day

INSTRUCTIONS:
Provide professional wallet intelligence in PLAIN TEXT (no markdown, no ##, no **, no ---).

Return 3 sections separated by double newlines:

PORTFOLIO OVERVIEW
[2-3 sentences analyzing the wallet's holdings, balance distribution, and overall position sizing]

RISK PROFILE ASSESSMENT
[2-3 sentences about risk level, trading behavior, and investment strategy based on diversification and holdings]

TRADING INSIGHTS
[2-3 sentences with actionable insights about the wallet's behavior, opportunities, or recommendations]

IMPORTANT: Use plain text only. No markdown formatting whatsoever.`;

      let aiInsights = await this.analyzeWithAI(aiPrompt, analysisData);

      // Clean any markdown that slipped through
      aiInsights = this.cleanMarkdownFormatting(aiInsights);

      // 7. Determine copy-trade recommendation
      const copyTradeAnalysis = this.getCopyTradeSignal(tradingMetrics, portfolio);

      // 8. Generate risk profile
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
        copy_trade_signal: copyTradeAnalysis.signal,
        copy_trade_reasons: copyTradeAnalysis.reasons,
        wallet_stats: walletStats,
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
   * Get wallet SOL and token balances using Helius API
   */
  private async getWalletBalance(walletPubkey: PublicKey, walletAddress: string) {
    const lamports = await this.connection.getBalance(walletPubkey);
    const sol = lamports / LAMPORTS_PER_SOL;

    // Fetch real SOL price from Jupiter API
    let solPrice = 100; // Fallback price
    try {
      const response = await fetch('https://price.jup.ag/v6/price?ids=SOL');
      const data = await response.json();
      if (data.data?.SOL?.price) {
        solPrice = data.data.SOL.price;
      }
    } catch (error) {
      console.log('[WALLET_INTELLIGENCE] Using fallback SOL price');
    }

    // Get real token balances from Helius
    let tokenValue = 0;
    let tokenCount = 0;
    try {
      const tokenAccounts = await this.getTokenAccounts(walletAddress);
      tokenValue = tokenAccounts.reduce((sum, token) => sum + token.value, 0);
      tokenCount = tokenAccounts.length;
    } catch (error) {
      console.log('[WALLET_INTELLIGENCE] Could not fetch token balances:', error);
    }

    return {
      total_usd: sol * solPrice + tokenValue,
      sol,
      tokens: tokenCount,
    };
  }

  /**
   * Get real token accounts from Helius API with risk scoring
   */
  private async getTokenAccounts(walletAddress: string) {
    try {
      console.log('[WALLET_INTELLIGENCE] Fetching token accounts for:', walletAddress);

      // Use Solana RPC to get token accounts directly
      const walletPubkey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      console.log('[WALLET_INTELLIGENCE] Found', tokenAccounts.value.length, 'token accounts');

      if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
        console.log('[WALLET_INTELLIGENCE] No token accounts found - wallet may be all SOL');
        return [];
      }

      // Fetch prices for tokens from Jupiter
      const mints = tokenAccounts.value
        .map((acc: any) => acc.account.data.parsed.info.mint)
        .slice(0, 30); // Limit to 30 tokens

      let prices: any = {};
      try {
        const priceResponse = await fetch(`https://price.jup.ag/v6/price?ids=${mints.join(',')}`);
        const priceData = await priceResponse.json();
        prices = priceData.data || {};
      } catch (error) {
        console.log('[WALLET_INTELLIGENCE] Could not fetch token prices');
      }

      // Format token data
      const tokenData = await Promise.all(
        tokenAccounts.value.map(async (acc: any) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount.uiAmount || 0;
          const decimals = info.tokenAmount.decimals;

          const price = prices[mint]?.price || 0;
          const value = amount * price;

          // Get token info for symbol
          let symbol = mint.substring(0, 6);
          try {
            const tokenInfo = await getTokenInfo(mint);
            symbol = tokenInfo.symbol;
          } catch {
            // Use mint substring as fallback
          }

          return {
            symbol,
            mint,
            value,
            amount,
            decimals,
            price,
          };
        })
      );

      // Filter out dust and zero balances
      const filteredTokens = tokenData.filter(t => t.amount > 0 && t.value > 0.01);

      console.log('[WALLET_INTELLIGENCE] After filtering dust:', filteredTokens.length, 'tokens with value');

      if (filteredTokens.length === 0) {
        console.log('[WALLET_INTELLIGENCE] All tokens filtered out (dust or zero value)');
        return [];
      }

      // Calculate percentages
      const totalValue = filteredTokens.reduce((sum, t) => sum + t.value, 0);
      console.log('[WALLET_INTELLIGENCE] Total portfolio value:', totalValue.toFixed(2), 'USD');

      // Add risk scores in parallel (only for top holdings to save time)
      const topTokens = filteredTokens
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const withRiskScores = await Promise.all(
        topTokens.map(async (token) => {
          const riskScore = await this.calculateTokenRisk(token.mint, token.symbol);
          return {
            ...token,
            percentage: totalValue > 0 ? (token.value / totalValue) * 100 : 0,
            risk_score: riskScore,
          };
        })
      );

      // Add remaining tokens without risk scores
      const remainingTokens = filteredTokens.slice(10).map(token => ({
        ...token,
        percentage: totalValue > 0 ? (token.value / totalValue) * 100 : 0,
        risk_score: 50, // Default medium risk
      }));

      return [...withRiskScores, ...remainingTokens];
    } catch (error) {
      console.error('[WALLET_INTELLIGENCE] Error fetching token accounts:', error);
      return [];
    }
  }

  /**
   * Calculate risk score for individual token (0-100, higher = riskier)
   */
  private async calculateTokenRisk(mint: string, symbol: string): Promise<number> {
    try {
      // Known safe tokens get low risk scores
      const safeTokens = ['USDC', 'USDT', 'SOL', 'BONK', 'WIF', 'JUP', 'RAY', 'ORCA'];
      if (safeTokens.includes(symbol)) {
        return 10; // Low risk for established tokens
      }

      // Analyze holder distribution for concentration risk
      const holderAnalysis = await analyzeTokenHolderDistribution(mint);

      if (!holderAnalysis) {
        // No holder data - assume higher risk
        return 60;
      }

      // Base risk on concentration
      let riskScore = holderAnalysis.concentrationRisk;

      // Additional factors
      if (holderAnalysis.totalHolders < 100) riskScore += 20;
      if (holderAnalysis.topHolderPercentage > 50) riskScore += 15;

      return Math.min(100, Math.max(0, riskScore));
    } catch (error) {
      // Default medium-high risk if we can't analyze
      return 60;
    }
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
   * Get copy-trade recommendation with reasons
   */
  private getCopyTradeSignal(
    metrics: any,
    portfolio: any
  ): { signal: 'RECOMMENDED' | 'NOT RECOMMENDED'; reasons: string[] } {
    const reasons: string[] = [];

    // Check win rate
    if (metrics.win_rate < 0.5) {
      reasons.push(`Win rate below 50% (${(metrics.win_rate * 100).toFixed(1)}%)`);
    } else if (metrics.win_rate >= 0.6) {
      reasons.push(`Strong win rate (${(metrics.win_rate * 100).toFixed(1)}%)`);
    }

    // Check P&L
    if (metrics.total_pnl < 0) {
      reasons.push(`Negative P&L ($${metrics.total_pnl.toFixed(2)})`);
    } else if (metrics.total_pnl > 1000) {
      reasons.push(`Profitable track record ($${metrics.total_pnl.toFixed(2)})`);
    }

    // Check diversification
    if (portfolio.diversification_score < 5) {
      reasons.push(`Poor diversification (${portfolio.diversification_score}/10)`);
    } else if (portfolio.diversification_score >= 7) {
      reasons.push(`Well diversified (${portfolio.diversification_score}/10)`);
    }

    // Check trade count
    if (metrics.total_trades < 10) {
      reasons.push(`Limited trading history (${metrics.total_trades} trades)`);
    } else if (metrics.total_trades >= 50) {
      reasons.push(`Extensive trading history (${metrics.total_trades} trades)`);
    }

    // Risk assessment
    if (metrics.total_trades > 0) {
      const avgTrade = metrics.total_pnl / metrics.total_trades;
      if (avgTrade < -10) {
        reasons.push(`High risk behavior (avg loss $${Math.abs(avgTrade).toFixed(2)}/trade)`);
      }
    }

    // Determine signal
    const isRecommended =
      metrics.win_rate >= 0.6 &&
      metrics.total_pnl > 500 &&
      metrics.total_trades >= 20 &&
      portfolio.diversification_score >= 6;

    return {
      signal: isRecommended ? 'RECOMMENDED' : 'NOT RECOMMENDED',
      reasons: reasons.length > 0 ? reasons : ['Insufficient performance metrics']
    };
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

  /**
   * Get wallet statistics from transaction history
   */
  private getWalletStats(transactions: any[]) {
    if (!transactions || transactions.length === 0) {
      return {
        wallet_age_days: 0,
        first_transaction_date: 'Unknown',
        total_transactions: 0,
        avg_daily_transactions: 0,
      };
    }

    // Sort transactions by timestamp (oldest first)
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    const firstTx = sortedTxs[0];
    const lastTx = sortedTxs[sortedTxs.length - 1];

    const firstDate = new Date(firstTx.timestamp * 1000);
    const now = new Date();

    const ageMs = now.getTime() - firstDate.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    const avgDaily = ageDays > 0 ? transactions.length / ageDays : transactions.length;

    return {
      wallet_age_days: ageDays,
      first_transaction_date: firstDate.toISOString().split('T')[0],
      total_transactions: transactions.length,
      avg_daily_transactions: avgDaily,
    };
  }

  /**
   * Analyze trading activity from transactions
   */
  private async analyzeTradingActivity(transactions: any[], walletAddress: string) {
    if (!transactions || transactions.length === 0) {
      return {
        total_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_hold_time: 'N/A',
        best_trade: { token: 'N/A', profit: 0 },
        worst_trade: { token: 'N/A', profit: 0 },
      };
    }

    // Extract swap transactions - Helius labels them with type field
    const swaps = transactions.filter(tx => {
      const type = tx.type?.toLowerCase() || '';
      const desc = tx.description?.toLowerCase() || '';

      return (
        type === 'swap' ||
        desc.includes('swap') ||
        desc.includes('jupiter') ||
        desc.includes('raydium') ||
        desc.includes('orca') ||
        // Check for token transfers in both directions (buy/sell indicator)
        (tx.tokenTransfers && tx.tokenTransfers.length >= 2)
      );
    });

    console.log(`[WALLET_INTELLIGENCE] Found ${swaps.length} swaps out of ${transactions.length} transactions`);

    if (swaps.length === 0) {
      return {
        total_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_hold_time: this.estimateAvgHoldTime(transactions),
        best_trade: { token: 'N/A', profit: 0 },
        worst_trade: { token: 'N/A', profit: 0 },
      };
    }

    // Track token positions for P&L calculation
    const tokenPositions = new Map<string, { buyPrice: number; amount: number; timestamp: number }>();
    const trades: any[] = [];

    swaps.forEach((tx: any) => {
      try {
        const pnl = this.estimateTradePnL(tx, walletAddress);

        // Extract token from description or transfers with better parsing
        let token = 'Unknown';
        if (tx.description) {
          // Try to extract token from common patterns:
          // "Swapped X for Y", "Bought X", "Sold X", etc.
          const patterns = [
            /Swap.*?for\s+([A-Z]{2,10})/i,     // "Swap SOL for BONK"
            /Swap\s+([A-Z]{2,10})\s+for/i,     // "Swap BONK for SOL"
            /Buy\s+([A-Z]{2,10})/i,            // "Buy JUP"
            /Sell\s+([A-Z]{2,10})/i,           // "Sell WIF"
            /([A-Z]{2,10})\s+→\s+[A-Z]{2,10}/i, // "SOL → USDC"
            /[A-Z]{2,10}\s+→\s+([A-Z]{2,10})/i, // "USDC → SOL"
          ];

          for (const pattern of patterns) {
            const match = tx.description.match(pattern);
            if (match && match[1] && match[1] !== 'SOL' && match[1] !== 'USDC') {
              token = match[1];
              break;
            }
          }

          // Fallback: Just find any 2-10 char uppercase token
          if (token === 'Unknown') {
            const match = tx.description.match(/\b([A-Z]{2,10})\b/);
            if (match && match[1] !== 'SOL' && match[1] !== 'USDC') {
              token = match[1];
            }
          }
        }

        // Try to get token from tokenTransfers if still unknown
        if (token === 'Unknown' && tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          const transfer = tx.tokenTransfers.find((t: any) =>
            t.mint !== 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Not USDC
          );
          if (transfer && transfer.mint) {
            token = transfer.mint.substring(0, 6); // Use mint prefix as fallback
          }
        }

        trades.push({
          signature: tx.signature,
          timestamp: tx.timestamp,
          pnl,
          token,
          description: tx.description || 'Swap',
        });
      } catch (error) {
        console.log('[WALLET_INTELLIGENCE] Error analyzing trade:', error);
      }
    });

    // Calculate statistics
    const profitableTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalTrades = profitableTrades.length + losingTrades.length;
    const winRate = totalTrades > 0 ? profitableTrades.length / totalTrades : 0;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    // Find best and worst trades
    trades.sort((a, b) => b.pnl - a.pnl);
    const bestTrade = trades[0] || { token: 'N/A', pnl: 0 };
    const worstTrade = trades[trades.length - 1] || { token: 'N/A', pnl: 0 };

    console.log(`[WALLET_INTELLIGENCE] Trading stats: ${totalTrades} trades, ${(winRate * 100).toFixed(1)}% win rate, $${totalPnL.toFixed(2)} P&L`);

    return {
      total_trades: totalTrades,
      win_rate: winRate,
      total_pnl: totalPnL,
      avg_hold_time: this.estimateAvgHoldTime(transactions),
      best_trade: {
        token: bestTrade.token,
        profit: bestTrade.pnl,
      },
      worst_trade: {
        token: worstTrade.token,
        profit: worstTrade.pnl,
      },
    };
  }

  /**
   * Estimate P&L for a single trade (improved)
   */
  private estimateTradePnL(tx: any, walletAddress: string): number {
    try {
      // Method 1: Use SOL balance changes (most reliable for SOL pairs)
      const nativeTransfers = tx.nativeTransfers || [];
      let solChange = 0;

      nativeTransfers.forEach((transfer: any) => {
        if (transfer.toUserAccount === walletAddress) {
          solChange += transfer.amount / LAMPORTS_PER_SOL;
        }
        if (transfer.fromUserAccount === walletAddress) {
          solChange -= transfer.amount / LAMPORTS_PER_SOL;
        }
      });

      // If there's a SOL change, use it (multiply by approximate SOL price)
      if (Math.abs(solChange) > 0.001) {
        return solChange * 100; // Rough SOL price estimate
      }

      // Method 2: Look at token transfers for stable pairs
      const tokenTransfers = tx.tokenTransfers || [];
      let usdcChange = 0;

      tokenTransfers.forEach((transfer: any) => {
        // USDC mint address
        if (transfer.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          if (transfer.toUserAccount === walletAddress) {
            usdcChange += transfer.tokenAmount || 0;
          }
          if (transfer.fromUserAccount === walletAddress) {
            usdcChange -= transfer.tokenAmount || 0;
          }
        }
      });

      if (Math.abs(usdcChange) > 0.01) {
        return usdcChange;
      }

      // No clear P&L
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Estimate average hold time from transaction patterns
   */
  private estimateAvgHoldTime(transactions: any[]): string {
    if (transactions.length < 2) return 'N/A';

    // Group transactions by day
    const txDates = transactions.map(tx => {
      const date = new Date(tx.timestamp * 1000);
      return date.toISOString().split('T')[0];
    });

    const uniqueDays = new Set(txDates).size;
    const totalDays = transactions.length;

    if (uniqueDays === 0) return 'N/A';

    const avgDays = totalDays / uniqueDays;

    if (avgDays < 1) return '< 1 day';
    if (avgDays < 7) return `${Math.floor(avgDays)} days`;
    if (avgDays < 30) return `${Math.floor(avgDays / 7)} weeks`;
    return `${Math.floor(avgDays / 30)} months`;
  }

  /**
   * Clean markdown formatting from text
   */
  private cleanMarkdownFormatting(text: string): string {
    return text
      .replace(/^#+\s*/gm, '')           // Remove ## headers
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
      .replace(/^\*\*\s*/gm, '')          // Remove ** at start of lines
      .replace(/^---+$/gm, '')            // Remove --- separators
      .replace(/^\s*[-*]\s+/gm, '')       // Remove bullet points
      .replace(/\n{3,}/g, '\n\n')         // Normalize multiple newlines to double
      .trim();
  }
}
