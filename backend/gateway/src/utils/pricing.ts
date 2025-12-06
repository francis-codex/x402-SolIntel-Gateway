import config from '../config';
import { ServiceName } from '@x402-solintel/types';

/**
 * Get price for a specific service
 */
export function getServicePrice(serviceName: ServiceName): number {
  const prices: Record<ServiceName, number> = {
    'token-check': config.pricing.tokenCheck,
    'deep-analysis': config.pricing.deepAnalysis,
    'contract-audit': config.pricing.contractAudit,
    'wallet-intelligence': config.pricing.walletIntel,
    'trading-signals': config.pricing.tradingSignals,
    'code-generator': config.pricing.codeGenerator,
  };

  return prices[serviceName] || 0;
}

/**
 * Convert USD to USDC lamports (6 decimals)
 */
export function usdToUsdcLamports(usdAmount: number): string {
  const usdcDecimals = 6;
  const lamports = Math.floor(usdAmount * Math.pow(10, usdcDecimals));
  return lamports.toString();
}

/**
 * Get service display name
 */
export function getServiceDisplayName(serviceName: ServiceName): string {
  const names: Record<ServiceName, string> = {
    'token-check': 'Quick Token Check',
    'deep-analysis': 'Deep Token Analysis',
    'contract-audit': 'Smart Contract Audit',
    'wallet-intelligence': 'Wallet Intelligence',
    'trading-signals': 'Trading Signals',
    'code-generator': 'Code Generator',
  };

  return names[serviceName] || serviceName;
}
