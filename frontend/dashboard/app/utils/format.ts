/**
 * Utility functions for formatting values across the application
 */

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatLargeNumber(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(value)) return '0';

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toFixed(2);
}

/**
 * Format currency values with proper decimals
 */
export function formatCurrency(num: number | string, decimals: number = 2): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(value)) return '$0.00';

  // For very small numbers, show more decimals
  if (value > 0 && value < 0.01) {
    return `$${value.toFixed(6)}`;
  }

  // For large numbers, use abbreviations
  if (value >= 1_000_000) {
    return `$${formatLargeNumber(value)}`;
  }

  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Format percentage values
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format wallet addresses for display (shortened)
 */
export function formatAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Format time duration (e.g., "2d 5h", "3h 20m")
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}
