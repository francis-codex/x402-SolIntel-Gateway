/**
 * Mock AI Provider for Development/Testing
 * Returns realistic-looking responses without calling any AI API
 */

/**
 * Mock AI analysis
 */
export async function analyzeWithMock(
  systemPrompt: string,
  userPrompt: string,
  data: any
): Promise<string> {
  console.log('[MOCK_AI] Generating mock analysis (no API calls)');

  // Parse the data to provide contextual responses
  const dataStr = JSON.stringify(data);

  // Determine service type from prompt
  if (userPrompt.includes('risk assessment') || userPrompt.includes('token')) {
    return generateMockTokenAnalysis(data);
  } else if (userPrompt.includes('trading') || userPrompt.includes('signal')) {
    return generateMockTradingSignal(data);
  } else if (userPrompt.includes('wallet') || userPrompt.includes('trading performance')) {
    return generateMockWalletAnalysis(data);
  } else if (userPrompt.includes('security') || userPrompt.includes('audit')) {
    return generateMockSecurityAnalysis(data);
  } else if (userPrompt.includes('sentiment') || userPrompt.includes('comprehensive')) {
    return generateMockDeepAnalysis(data);
  }

  return 'Mock AI analysis: Based on the provided data, this appears to be a standard Solana token. Further analysis recommended.';
}

/**
 * Mock code generation
 */
export async function generateCodeWithMock(
  description: string,
  type: string
): Promise<{ code: string; explanation: string }> {
  console.log('[MOCK_AI] Generating mock code (no API calls)');

  const code = `// Mock ${type} code for: ${description}
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mock_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Mock program initialized!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
`;

  const explanation = `This is a mock Anchor program generated for development purposes.
In production, this would be replaced with actual AI-generated code based on: ${description}

To enable real code generation:
1. Add OpenAI or Anthropic API key
2. Set AI_PROVIDER in .env
3. Restart the gateway`;

  return { code, explanation };
}

function generateMockTokenAnalysis(data: any): string {
  const token = data.token || {};
  const metrics = data.metrics || {};
  const security = data.security || {};

  return `Based on the analysis of ${token.name || 'this token'}, here are the key findings:

The token shows ${security.liquidityLocked ? 'good' : 'concerning'} liquidity management with ${security.freezeAuthority ? 'freeze authority enabled (risk factor)' : 'no freeze authority (positive sign)'}.

Market metrics indicate a price of ${metrics.price || 'N/A'} with ${metrics.liquidity || 'limited'} liquidity. The holder distribution shows ${security.top10Percent || 0}% concentrated in top 10 wallets.

Recommendation: ${security.top10Percent > 50 ? 'High risk due to centralized holdings. Exercise caution.' : 'Moderate risk profile. DYOR before investing.'}

⚠️ This is a MOCK analysis for development. Enable AI provider for real analysis.`;
}

function generateMockTradingSignal(data: any): string {
  return JSON.stringify({
    signal: 'HOLD',
    confidence: 0.65,
    reasoning: 'Mock trading signal: Current market conditions suggest a neutral position. Price action shows consolidation with no clear directional bias. Volume is average. Wait for clearer signals before taking position. [MOCK - Enable AI for real signals]',
  });
}

function generateMockWalletAnalysis(data: any): string {
  const balance = data.balance || {};
  return `Wallet Analysis (Mock):

This wallet holds approximately $${balance.total_usd || 0} in total value. The trading pattern suggests a ${balance.total_usd > 10000 ? 'sophisticated' : 'retail'} investor profile.

Risk Profile: Conservative to Moderate
Recommendation: Portfolio shows decent diversification. Consider rebalancing if any single position exceeds 30% of total holdings.

⚠️ MOCK ANALYSIS - Enable AI provider for detailed insights.`;
}

function generateMockSecurityAnalysis(data: any): string {
  return `Security Analysis (Mock):

The smart contract has been analyzed for common vulnerabilities. No critical issues detected in automated scan, but manual review recommended for production deployment.

Key Points:
- Program structure appears standard
- Upgrade authority should be verified
- Access controls need manual review

⚠️ This is a MOCK audit. Enable AI provider for comprehensive security analysis.`;
}

function generateMockDeepAnalysis(data: any): string {
  return JSON.stringify({
    summary:
      'Mock deep analysis: This token shows mixed signals with moderate trading volume and average holder distribution. Market sentiment appears neutral based on available data. [DEVELOPMENT MODE]',
    sentiment: 'NEUTRAL',
    recommendation:
      'Conduct additional research before investing. This is a mock analysis for testing purposes.',
    confidence: 0.5,
  });
}
