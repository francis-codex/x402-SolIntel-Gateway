import axios from 'axios';
import { RugCheckSecurity } from '@x402-solintel/types';

const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1';

/**
 * Check token security using RugCheck
 */
export async function checkTokenSecurity(tokenAddress: string): Promise<RugCheckSecurity> {
  try {
    const url = `${RUGCHECK_API_BASE}/tokens/${tokenAddress}/report`;

    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
      },
    });

    const report = response.data;

    // Parse RugCheck report
    const score = calculateSecurityScore(report);

    return {
      score,
      freezeAuthority: report.freezeAuthority?.isSome || false,
      mintAuthority: report.mintAuthority?.isSome || false,
      liquidityLocked: report.markets?.some((m: any) => m.lp?.lpLockedPct > 0.5) || false,
      mutableMetadata: report.mutableMetadata || false,
      top10Percent: report.tokenMeta?.top10HolderPercent || 50,
      flags: report.risks?.map((r: any) => r.name) || [],
    };
  } catch (error: any) {
    console.error('[RUGCHECK] Error checking token security:', error.response?.status, error.message);
    // Return conservative default values that won't crash the service
    return {
      score: 6,
      freezeAuthority: true,
      mintAuthority: true,
      liquidityLocked: false,
      mutableMetadata: true,
      top10Percent: 50,
      flags: ['RUGCHECK_API_UNAVAILABLE'],
    };
  }
}

/**
 * Calculate security score from RugCheck report
 */
function calculateSecurityScore(report: any): number {
  let score = 10;

  // Deduct points for risks
  if (report.freezeAuthority?.isSome) score -= 2;
  if (report.mintAuthority?.isSome) score -= 2;
  if (report.mutableMetadata) score -= 1;

  // Check liquidity
  const hasLockedLiquidity = report.markets?.some((m: any) => m.lp.lpLockedPct > 0.5);
  if (!hasLockedLiquidity) score -= 3;

  // Check holder distribution
  const top10 = report.tokenMeta?.top10HolderPercent || 0;
  if (top10 > 50) score -= 2;
  else if (top10 > 30) score -= 1;

  return Math.max(0, Math.min(10, score));
}
