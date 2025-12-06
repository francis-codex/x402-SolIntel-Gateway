import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface Config {
  // Server
  port: number;
  host: string;

  // Network
  network: 'devnet' | 'mainnet-beta';
  solanaRpcUrl: string;

  // Payment
  recipientWallet: string;
  usdcMint: string;
  facilitatorUrl: string;

  // AI Provider
  aiProvider: 'openai' | 'anthropic' | 'mock';
  openaiApiKey: string;
  openaiModel?: string;
  anthropicApiKey?: string;

  // External APIs
  heliusApiKey: string;
  birdeyeApiKey: string;
  rugcheckApiKey?: string;

  // Redis
  redisUrl: string;

  // IPFS
  pinataApiKey?: string;
  pinataSecretKey?: string;

  // Service Pricing
  pricing: {
    tokenCheck: number;
    deepAnalysis: number;
    contractAudit: number;
    walletIntel: number;
    tradingSignals: number;
    codeGenerator: number;
  };
}

const config: Config = {
  port: parseInt(process.env.GATEWAY_PORT || '4021'),
  host: process.env.GATEWAY_HOST || '0.0.0.0',

  network: (process.env.NETWORK || 'mainnet-beta') as 'devnet' | 'mainnet-beta',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=db683a77-edb6-4c80-8cac-944640c07e21',

  recipientWallet: process.env.RECIPIENT_WALLET || '',
  usdcMint:
    process.env.NETWORK === 'devnet'
      ? process.env.USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      : process.env.USDC_MINT_MAINNET || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:3000',

  // AI Provider Configuration
  aiProvider: (process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  heliusApiKey: process.env.HELIUS_API_KEY || '',
  birdeyeApiKey: process.env.BIRDEYE_API_KEY || '',
  rugcheckApiKey: process.env.RUGCHECK_API_KEY,

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretKey: process.env.PINATA_SECRET_KEY,

  pricing: {
    tokenCheck: parseFloat(process.env.PRICE_TOKEN_CHECK || '0.02'),
    deepAnalysis: parseFloat(process.env.PRICE_DEEP_ANALYSIS || '0.08'),
    contractAudit: parseFloat(process.env.PRICE_CONTRACT_AUDIT || '0.10'),
    walletIntel: parseFloat(process.env.PRICE_WALLET_INTEL || '0.05'),
    tradingSignals: parseFloat(process.env.PRICE_TRADING_SIGNALS || '0.03'),
    codeGenerator: parseFloat(process.env.PRICE_CODE_GENERATOR || '0.05'),
  },
};

// Validate required config
if (!config.recipientWallet) {
  console.warn('[CONFIG] Warning: RECIPIENT_WALLET not set');
}

if (!config.openaiApiKey) {
  console.warn('[CONFIG] Warning: OPENAI_API_KEY not set');
}

export default config;
