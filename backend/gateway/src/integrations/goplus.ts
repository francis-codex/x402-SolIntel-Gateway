import axios from 'axios';
import { cache } from '../utils/cache';

const GOPLUS_API_BASE = 'https://api.gopluslabs.io/api/v1';
const CACHE_TTL = 300000; // 5 minutes (security data changes slowly)

export interface GoPlusSecurityData {
    // Contract information
    is_open_source?: string;
    is_proxy?: string;
    is_mintable?: string;
    owner_address?: string;
    creator_address?: string;

    // Freeze and permission risks
    can_take_back_ownership?: string;
    owner_change_balance?: string;
    hidden_owner?: string;
    selfdestruct?: string;
    external_call?: string;

    // Trading restrictions
    buy_tax?: string;
    sell_tax?: string;
    is_honeypot?: string;
    transfer_pausable?: string;
    is_blacklisted?: string;
    is_whitelisted?: string;
    is_in_dex?: string;

    // Holder distribution
    holder_count?: string;
    total_supply?: string;
    holder_distribution?: Array<{
        address: string;
        balance: string;
        percent: string;
    }>;

    // Liquidity info
    dex?: Array<{
        name: string;
        liquidity: string;
        pair: string;
    }>;

    // Additional metadata
    token_name?: string;
    token_symbol?: string;
    note?: string;
}

export interface GoPlusResponse {
    code: number;
    message: string;
    result: {
        [tokenAddress: string]: GoPlusSecurityData;
    };
}

/**
 * Get security analysis from GoPlusLabs
 * @param tokenAddress Solana token mint address
 * @returns Security data or null if unavailable
 */
export async function getGoPlusSecurity(tokenAddress: string): Promise<GoPlusSecurityData | null> {
    const cacheKey = `goplus:security:${tokenAddress}`;

    // Check cache first
    const cached = cache.get<GoPlusSecurityData>(cacheKey);
    if (cached) {
        console.log('[GOPLUS] Using cached security data');
        return cached;
    }

    try {
        console.log('[GOPLUS] Fetching security analysis...');
        const response = await axios.get<GoPlusResponse>(
            `${GOPLUS_API_BASE}/solana/token_security`,
            {
                params: {
                    contract_addresses: tokenAddress
                },
                timeout: 10000 // Longer timeout for security checks
            }
        );

        if (response.data.code !== 1) {
            console.error('[GOPLUS] API returned error:', response.data.message);
            return null;
        }

        const securityData = response.data.result[tokenAddress];

        if (!securityData) {
            console.log('[GOPLUS] No security data available');
            return null;
        }

        // Cache the result
        cache.set(cacheKey, securityData, CACHE_TTL);

        console.log('[GOPLUS] Security analysis fetched successfully');
        return securityData;
    } catch (error: any) {
        console.error('[GOPLUS] Error fetching security data:', {
            message: error.message,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Analyze security risks and generate risk score
 * @param securityData Security data from GoPlus
 * @returns Risk analysis
 */
export function analyzeSecurityRisks(securityData: GoPlusSecurityData) {
    const risks: string[] = [];
    let riskScore = 0; // 0-100, higher is more risky

    // Critical risks (major red flags)
    if (securityData.is_honeypot === '1') {
        risks.push('🚨 HONEYPOT DETECTED - Cannot sell tokens');
        riskScore += 100; // Instant fail
    }

    if (securityData.is_mintable === '1') {
        risks.push('⚠️ Unlimited minting enabled - Owner can create infinite tokens');
        riskScore += 25;
    }

    if (securityData.can_take_back_ownership === '1') {
        risks.push('⚠️ Owner can reclaim ownership');
        riskScore += 20;
    }

    if (securityData.owner_change_balance === '1') {
        risks.push('🚨 Owner can change balances directly');
        riskScore += 30;
    }

    if (securityData.hidden_owner === '1') {
        risks.push('⚠️ Hidden owner detected');
        riskScore += 15;
    }

    if (securityData.selfdestruct === '1') {
        risks.push('⚠️ Contract can self-destruct');
        riskScore += 25;
    }

    if (securityData.transfer_pausable === '1') {
        risks.push('⚠️ Transfers can be paused');
        riskScore += 15;
    }

    // High taxes (potential rug pull indicator)
    const buyTax = parseFloat(securityData.buy_tax || '0');
    const sellTax = parseFloat(securityData.sell_tax || '0');

    if (buyTax > 10) {
        risks.push(`⚠️ High buy tax: ${buyTax.toFixed(1)}%`);
        riskScore += Math.min(buyTax, 30);
    }

    if (sellTax > 10) {
        risks.push(`⚠️ High sell tax: ${sellTax.toFixed(1)}%`);
        riskScore += Math.min(sellTax, 30);
    }

    // Positive indicators (reduce risk)
    if (securityData.is_open_source === '1') {
        riskScore -= 5;
    }

    if (securityData.is_in_dex === '1') {
        riskScore -= 5;
    }

    // Ensure risk score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore));

    const riskLevel =
        riskScore >= 80 ? 'CRITICAL' :
        riskScore >= 60 ? 'HIGH' :
        riskScore >= 40 ? 'MEDIUM' :
        riskScore >= 20 ? 'LOW' :
        'MINIMAL';

    return {
        riskScore,
        riskLevel,
        risks,
        buyTax,
        sellTax,
        isHoneypot: securityData.is_honeypot === '1',
        isMintable: securityData.is_mintable === '1',
        isOpenSource: securityData.is_open_source === '1',
        isInDex: securityData.is_in_dex === '1',
        holderCount: parseInt(securityData.holder_count || '0'),
        creatorAddress: securityData.creator_address,
        ownerAddress: securityData.owner_address
    };
}

/**
 * Get comprehensive security check with analysis
 * @param tokenAddress Solana token mint address
 * @returns Security analysis or null if unavailable
 */
export async function getComprehensiveSecurityCheck(tokenAddress: string) {
    const securityData = await getGoPlusSecurity(tokenAddress);

    if (!securityData) {
        return null;
    }

    const analysis = analyzeSecurityRisks(securityData);

    return {
        rawData: securityData,
        analysis
    };
}
