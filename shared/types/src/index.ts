/**
 * Shared TypeScript Types for x402-SolIntel-Gateway
 */

// ============================================================================
// x402 Payment Types
// ============================================================================

export interface PaymentRequirements {
  version: number;
  recipient: string;
  tokenAccount?: string;
  mint: string;
  amount: string;
  currency: string;
  network: "devnet" | "mainnet-beta";
  invoiceId: string;
  serviceName: string;
  timeout?: number;
}

export interface PaymentPayload {
  version: number;
  network: "devnet" | "mainnet-beta";
  transaction: string; // base64 encoded signed transaction
  invoiceId: string;
}

export interface PaymentReceipt {
  id: string;
  invoiceId: string;
  txSignature: string;
  serviceName: string;
  amountUSD: number;
  currency: string;
  status: "pending" | "verified" | "settled" | "failed";
  timestamp: number;
  payer: string;
  recipient: string;
  network: "devnet" | "mainnet-beta";
  error?: string;
}

// ============================================================================
// Service Types
// ============================================================================

export type ServiceName =
  | "token-check"
  | "deep-analysis"
  | "contract-audit"
  | "wallet-intelligence"
  | "trading-signals"
  | "code-generator";

export interface ServiceConfig {
  name: ServiceName;
  displayName: string;
  description: string;
  priceUSD: number;
  estimatedTime: string;
  features: string[];
  icon: string;
}

export interface ServiceRequest {
  service: ServiceName;
  input: any;
  userId?: string;
}

export interface ServiceResponse {
  service: ServiceName;
  result: any;
  timestamp: number;
  executionTime: number;
  receipt?: PaymentReceipt;
}

// ============================================================================
// Token Analysis Types
// ============================================================================

export interface TokenCheckInput {
  tokenAddress: string;
}

export interface TokenCheckResult {
  service: "token-check";
  token: {
    address: string;
    symbol: string;
    name: string;
  };
  quick_stats: {
    price: string;
    market_cap: string;
    holders: number;
    liquidity: string;
  };
  risk_score: number;
  security_flags: {
    freeze_authority: boolean;
    mint_authority: boolean;
    mutable_metadata: boolean;
    liquidity_locked: boolean;
  };
  ai_summary: string;
  recommendation: "LOW RISK" | "MODERATE RISK" | "HIGH RISK" | "EXTREME RISK";
  timestamp: number;
}

export interface DeepAnalysisInput {
  tokenAddress: string;
}

export interface DeepAnalysisResult {
  service: "deep-analysis";
  token: {
    address: string;
    symbol: string;
    name: string;
  };
  comprehensive_stats: {
    price: string;
    market_cap: string;
    volume_24h: string;
    holders: number;
    liquidity: string;
    fdv: string;
  };
  holder_analysis: {
    top_10_percent: number;
    top_20_percent: number;
    distribution_score: number;
  };
  social_metrics: {
    twitter_followers?: number;
    mentions_24h?: number;
    sentiment_score?: number;
  };
  whale_activity: {
    large_buys_24h: number;
    large_sells_24h: number;
    net_flow: string;
  };
  ai_insights: {
    summary: string;
    sentiment: "BULLISH" | "NEUTRAL" | "BEARISH";
    recommendation: string;
    confidence: number;
  };
  risk_score: number;
  report_url?: string; // IPFS URL
  timestamp: number;
}

// ============================================================================
// Smart Contract Audit Types
// ============================================================================

export interface ContractAuditInput {
  programId: string;
}

export interface Vulnerability {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  recommendation?: string;
}

export interface ContractAuditResult {
  service: "contract-audit";
  program_id: string;
  security_score: number;
  vulnerabilities: {
    critical: Vulnerability[];
    high: Vulnerability[];
    medium: Vulnerability[];
    low: Vulnerability[];
  };
  ai_analysis: string;
  recommendations: string[];
  timestamp: number;
}

// ============================================================================
// Wallet Intelligence Types
// ============================================================================

export interface WalletIntelligenceInput {
  walletAddress: string;
}

export interface WalletIntelligenceResult {
  service: "wallet-intelligence";
  wallet: string;
  balance: {
    total_usd: number;
    sol: number;
    tokens: number;
  };
  trading_metrics: {
    total_trades: number;
    win_rate: number;
    total_pnl: number;
    avg_hold_time: string;
    best_trade: {
      token: string;
      profit: number;
    };
    worst_trade: {
      token: string;
      profit: number;
    };
  };
  portfolio: {
    top_holdings: Array<{
      token: string;
      value: number;
      percentage: number;
      risk_score?: number;
    }>;
    total_tokens: number;
    diversification_score: number;
  };
  risk_profile: string;
  ai_insights: string;
  copy_trade_signal: "RECOMMENDED" | "NOT RECOMMENDED";
  copy_trade_reasons?: string[];
  wallet_stats?: {
    wallet_age_days: number;
    first_transaction_date: string;
    total_transactions: number;
    avg_daily_transactions: number;
  };
  timestamp: number;
}

// ============================================================================
// Trading Signals Types
// ============================================================================

export interface TradingSignalsInput {
  tokenAddress: string;
}

export interface TradingSignalsResult {
  service: "trading-signals";
  token: {
    address: string;
    symbol: string;
    name?: string;
  };
  signal: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  confidence: number;
  entry_point: string;
  target_price: string;
  stop_loss: string;
  technical_analysis: {
    trend: "BULLISH" | "NEUTRAL" | "BEARISH";
    momentum?: string;
    volatility?: string;
    strength?: number;
    support_levels: string[];
    resistance_levels: string[];
    volume_24h?: string;
    liquidity?: string;
    market_cap?: string;
  };
  security_analysis?: {
    score: number;
    risk_flags: string[];
    freeze_authority: boolean;
    mint_authority: boolean;
    liquidity_locked: boolean;
  };
  ai_reasoning: string;
  data_source?: string;
  timestamp: number;
}

// ============================================================================
// Code Generator Types
// ============================================================================

export interface CodeGeneratorInput {
  description: string;
  type?: "anchor-program" | "client-integration" | "test" | "deployment";
}

export interface CodeGeneratorResult {
  service: "code-generator";
  description: string;
  code: string;
  language: string;
  framework: string;
  instructions: string;
  ai_explanation: string;
  timestamp: number;
}

// ============================================================================
// Job Queue Types
// ============================================================================

export interface JobData {
  service: ServiceName;
  input: any;
  paymentReceipt?: PaymentReceipt;
  userId?: string;
}

export interface JobResult {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  result?: any;
  error?: string;
}

// ============================================================================
// API Integration Types
// ============================================================================

export interface HeliusTokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  supply: string;
  holders: number;
}

export interface BirdeyeMetrics {
  price: string;
  marketCap: string;
  volume24h: string;
  liquidity: string;
  priceChange24h: number;
}

export interface RugCheckSecurity {
  score: number;
  freezeAuthority: boolean;
  mintAuthority: boolean;
  liquidityLocked: boolean;
  mutableMetadata: boolean;
  top10Percent: number;
  flags: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
