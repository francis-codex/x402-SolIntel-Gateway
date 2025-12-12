import { BaseAIService } from './base.service';
import { ContractAuditInput, ContractAuditResult, Vulnerability } from '@x402-solintel/types';
import { Connection, PublicKey } from '@solana/web3.js';
import config from '../config';

/**
 * Professional Smart Contract Audit Service
 * Performs comprehensive security analysis of Solana programs
 */
export class ContractAuditService extends BaseAIService {
  private connection: Connection;

  constructor() {
    super('contract-audit', config.pricing.contractAudit);
    // Use devnet for contract audits (for testing your own deployed programs)
    this.connection = new Connection('https://api.devnet.solana.com');
  }

  async execute(input: ContractAuditInput): Promise<ContractAuditResult> {
    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.programId) {
      throw new Error('Program ID is required');
    }

    try {
      // 1. Fetch program account info
      const programPubkey = new PublicKey(input.programId);
      const programInfo = await this.connection.getAccountInfo(programPubkey);

      if (!programInfo) {
        throw new Error('Program not found on devnet. Please deploy your program to devnet first.');
      }

      // 2. Extract program metadata
      const isExecutable = programInfo.executable;
      const owner = programInfo.owner.toBase58();
      const dataSize = programInfo.data.length;
      const lamports = programInfo.lamports;

      // 3. Get program data account (for upgradeable programs)
      let upgradeAuthority: string | null = null;
      let programDataAddress: string | null = null;

      if (owner === 'BPFLoaderUpgradeab1e11111111111111111111111') {
        try {
          // For upgradeable programs, try to find the ProgramData account
          const [programDataPubkey] = PublicKey.findProgramAddressSync(
            [programPubkey.toBuffer()],
            new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
          );

          const programDataInfo = await this.connection.getAccountInfo(programDataPubkey);
          if (programDataInfo && programDataInfo.data.length > 45) {
            programDataAddress = programDataPubkey.toBase58();
            // Parse upgrade authority from program data (bytes 13-45)
            const authorityBytes = programDataInfo.data.slice(13, 45);
            const hasAuthority = programDataInfo.data[12] === 1;
            if (hasAuthority) {
              upgradeAuthority = new PublicKey(authorityBytes).toBase58();
            }
          }
        } catch (err) {
          console.log('[CONTRACT_AUDIT] Could not fetch program data account');
        }
      }

      // 4. Identify program type and characteristics
      const programType = this.identifyProgramType(owner);
      const characteristics = this.analyzeProgramCharacteristics({
        isExecutable,
        owner,
        dataSize,
        lamports,
        upgradeAuthority,
      });

      // 5. Run comprehensive automated security checks
      const autoVulnerabilities = this.runComprehensiveSecurityChecks({
        isExecutable,
        owner,
        dataSize,
        lamports,
        programType,
        upgradeAuthority,
        programDataAddress,
      });

      // 6. Get professional AI security analysis
      const aiPrompt = `You are a professional Solana smart contract security auditor. Analyze this program with the rigor of a security firm like Halborn, Trail of Bits, or OtterSec.

PROGRAM DETAILS:
- Program ID: ${input.programId}
- Network: Devnet
- Type: ${programType}
- Executable: ${isExecutable}
- Owner/Loader: ${owner}
- Data Size: ${dataSize.toLocaleString()} bytes
- Account Balance: ${(lamports / 1e9).toFixed(4)} SOL
${upgradeAuthority ? `- Upgrade Authority: ${upgradeAuthority}` : '- Upgrade Authority: ❌ REVOKED (Immutable)'}
${programDataAddress ? `- Program Data Account: ${programDataAddress}` : ''}

CHARACTERISTICS:
${characteristics.join('\n')}

AUTOMATED FINDINGS:
${autoVulnerabilities.map((v, i) => `${i + 1}. [${v.severity}] ${v.title}\n   ${v.description}\n   → ${v.recommendation}`).join('\n\n')}

PROVIDE PROFESSIONAL SECURITY ANALYSIS:

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "executive_summary": "2-3 sentence professional summary of security posture",
  "risk_assessment": "CRITICAL|HIGH|MEDIUM|LOW",
  "key_findings": [
    "Finding 1 with technical detail",
    "Finding 2 with technical detail",
    "Finding 3 with technical detail"
  ],
  "technical_analysis": "Detailed paragraph about program architecture, potential attack vectors, and security considerations",
  "audit_recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ]
}`;

      const aiResponse = await this.analyzeWithAI(aiPrompt, {
        programId: input.programId,
        programType,
        characteristics,
        findings: autoVulnerabilities,
      });

      // 7. Parse AI analysis
      let professionalAnalysis;
      try {
        let jsonStr = aiResponse.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        professionalAnalysis = JSON.parse(jsonStr);
      } catch (error) {
        console.error('[CONTRACT_AUDIT] Failed to parse AI response:', error);
        // Fallback analysis
        professionalAnalysis = {
          executive_summary: `Security audit completed for ${programType} program. ${autoVulnerabilities.length} potential issues identified through automated analysis.`,
          risk_assessment: autoVulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :
                          autoVulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
          key_findings: autoVulnerabilities.slice(0, 3).map(v => v.title),
          technical_analysis: `Program analysis completed. ${upgradeAuthority ? 'Upgrade authority detected - centralization risk present.' : 'Program is immutable.'} Comprehensive source code review recommended.`,
          audit_recommendations: this.generateRecommendations(autoVulnerabilities, upgradeAuthority),
        };
      }

      // 8. Categorize vulnerabilities
      const vulnerabilities = {
        critical: autoVulnerabilities.filter((v) => v.severity === 'CRITICAL'),
        high: autoVulnerabilities.filter((v) => v.severity === 'HIGH'),
        medium: autoVulnerabilities.filter((v) => v.severity === 'MEDIUM'),
        low: autoVulnerabilities.filter((v) => v.severity === 'LOW'),
      };

      // 9. Calculate security score
      const securityScore = this.calculateSecurityScore(vulnerabilities, upgradeAuthority);

      // 10. Format professional analysis
      const formattedAnalysis = this.formatProfessionalAnalysis(professionalAnalysis);

      return {
        service: 'contract-audit',
        program_id: input.programId,
        security_score: securityScore,
        vulnerabilities,
        ai_analysis: formattedAnalysis,
        recommendations: professionalAnalysis.audit_recommendations || [],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[CONTRACT_AUDIT] Service error:', error);
      throw new Error(
        `Contract audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Identify program type
   */
  private identifyProgramType(owner: string): string {
    const loaders: Record<string, string> = {
      'BPFLoaderUpgradeab1e11111111111111111111111': 'Upgradeable BPF Program',
      'BPFLoader2111111111111111111111111111111111': 'BPF Loader v2 Program',
      'BPFLoader1111111111111111111111111111111111': 'BPF Loader v1 Program (Legacy)',
    };
    return loaders[owner] || 'Unknown Loader';
  }

  /**
   * Analyze program characteristics
   */
  private analyzeProgramCharacteristics(program: any): string[] {
    const chars: string[] = [];

    if (program.isExecutable) {
      chars.push('✓ Program is executable (deployed code)');
    } else {
      chars.push('⚠ Not executable - may be program data or metadata account');
    }

    if (program.dataSize < 100) {
      chars.push(`⚠ Very small data size (${program.dataSize} bytes) - likely metadata account only`);
    } else if (program.dataSize > 100000) {
      chars.push(`✓ Large program (${(program.dataSize / 1024).toFixed(1)} KB) - complex functionality`);
    }

    if (program.upgradeAuthority) {
      chars.push(`⚠ Upgrade authority active: ${program.upgradeAuthority.slice(0, 8)}...${program.upgradeAuthority.slice(-8)}`);
    } else if (program.owner === 'BPFLoaderUpgradeab1e11111111111111111111111') {
      chars.push('✓ Upgrade authority revoked - program is immutable');
    }

    return chars;
  }

  /**
   * Run comprehensive security checks
   */
  private runComprehensiveSecurityChecks(program: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Check 1: Upgrade Authority Analysis
    if (program.upgradeAuthority) {
      vulnerabilities.push({
        severity: 'HIGH',
        title: 'Active Upgrade Authority Detected',
        description: `Program has an active upgrade authority (${program.upgradeAuthority.slice(0, 12)}...). This creates centralization risk as the authority can arbitrarily modify program logic, potentially introducing backdoors, rug-pull mechanisms, or malicious code without user consent.`,
        recommendation: 'CRITICAL: Verify the upgrade authority is controlled by a trusted multi-signature wallet (e.g., 3/5 Squads multisig) OR immediately revoke upgrade authority to make the program immutable. Single-key upgrade authorities are a severe security risk.',
      });
    } else if (program.owner === 'BPFLoaderUpgradeab1e11111111111111111111111') {
      vulnerabilities.push({
        severity: 'LOW',
        title: 'Program Immutability Confirmed',
        description: 'Upgrade authority has been revoked. This is a positive security feature - the program logic cannot be modified, preventing potential rug-pulls or unauthorized changes.',
        recommendation: 'Good practice confirmed. Ensure this immutability aligns with your program\'s upgrade strategy and business requirements.',
      });
    }

    // Check 2: Program Size Analysis
    if (program.dataSize < 100) {
      vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Unusually Small Data Size',
        description: `Program data is only ${program.dataSize} bytes, which suggests this may be the program metadata/PDA account rather than the actual executable code. True deployed programs are typically 10KB-500KB+.`,
        recommendation: 'Verify you are auditing the correct program address. For upgradeable programs, check the actual program executable, not just the program derived address.',
      });
    }

    // Check 3: Account Balance Check
    if (program.lamports < 1000000) {
      vulnerabilities.push({
        severity: 'LOW',
        title: 'Low Account Balance',
        description: `Program account has very low SOL balance (${(program.lamports / 1e9).toFixed(4)} SOL). While not a direct security issue, insufficient rent balance could lead to account closure.`,
        recommendation: 'Ensure the program account is rent-exempt by maintaining minimum required balance (typically ~1-2 SOL for program accounts).',
      });
    }

    // Check 4: Loader Version Analysis
    if (program.owner === 'BPFLoader1111111111111111111111111111111111') {
      vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Legacy BPF Loader Detected',
        description: 'Program uses BPF Loader v1, which is deprecated. Modern Solana programs should use BPF Loader v2 or Upgradeable BPF Loader for better security and upgrade capabilities.',
        recommendation: 'Consider migrating to BPF Loader v2 or Upgradeable BPF Loader. Legacy loaders may lack security features and optimizations present in newer versions.',
      });
    }

    // Check 5: Source Code & Documentation
    vulnerabilities.push({
      severity: 'HIGH',
      title: 'Source Code Access Required for Complete Audit',
      description: 'On-chain analysis provides limited insight into program behavior. Without access to source code, Anchor IDL, and program documentation, a comprehensive security audit cannot verify critical vulnerabilities like: integer overflow/underflow, access control bypasses, reentrancy attacks, unsafe PDA derivations, missing signer checks, or business logic flaws.',
        recommendation: 'REQUIRED: Provide complete source code repository, Anchor IDL (if applicable), comprehensive test suite, and deployment documentation. Consider engaging professional audit firms (Halborn, OtterSec, Sec3) for production deployments handling significant value.',
    });

    // Check 6: Program Initialization
    if (!program.isExecutable) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        title: 'Program Not Executable',
        description: 'The provided address points to a non-executable account. This is either a data account, PDA, or the program has not been properly deployed.',
        recommendation: 'Verify the program address. For upgradeable programs deployed with Anchor, use `solana program show <PROGRAM_ID>` to find the actual executable address.',
      });
    }

    return vulnerabilities;
  }

  /**
   * Calculate security score (0-10)
   */
  private calculateSecurityScore(vulnerabilities: any, upgradeAuthority: string | null): number {
    let score = 10;

    // Penalty for vulnerabilities
    score -= vulnerabilities.critical.length * 4;
    score -= vulnerabilities.high.length * 2;
    score -= vulnerabilities.medium.length * 1;
    score -= vulnerabilities.low.length * 0.3;

    // Bonus for immutability
    if (!upgradeAuthority) {
      score += 1;
    }

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Generate professional recommendations
   */
  private generateRecommendations(vulnerabilities: Vulnerability[], upgradeAuthority: string | null): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.some(v => v.severity === 'CRITICAL')) {
      recommendations.push('🚨 CRITICAL: Address all critical vulnerabilities before ANY production deployment');
    }

    if (upgradeAuthority) {
      recommendations.push('Verify upgrade authority is controlled by a trusted multisig (minimum 3/5) or revoke if no upgrades planned');
    }

    recommendations.push('Provide complete source code, Anchor IDL, and test suite for thorough manual code review');
    recommendations.push('Implement comprehensive unit and integration tests covering all instructions and edge cases');
    recommendations.push('Conduct penetration testing and fuzzing to identify runtime vulnerabilities');
    recommendations.push('Set up continuous monitoring for on-chain program interactions and upgrade events');

    if (vulnerabilities.some(v => v.severity === 'HIGH' || v.severity === 'CRITICAL')) {
      recommendations.push('Engage a professional security audit firm (Halborn, OtterSec, Sec3, Neodyme) before mainnet deployment');
    }

    return recommendations.slice(0, 6);
  }

  /**
   * Format professional analysis for display
   */
  private formatProfessionalAnalysis(analysis: any): string {
    const riskEmojiMap: Record<string, string> = {
      'CRITICAL': '🔴',
      'HIGH': '🟠',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };
    const riskEmoji = riskEmojiMap[analysis.risk_assessment] || '⚪';

    // Clean function to remove markdown formatting
    const cleanMarkdown = (text: string): string => {
      return text
        .replace(/^#+\s*/gm, '')  // Remove ## headers
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
        .replace(/^\*\*\s*/gm, '')  // Remove ** at start of lines
        .trim();
    };

    // Clean all text fields
    const cleanSummary = cleanMarkdown(analysis.executive_summary || '');
    const cleanAnalysis = cleanMarkdown(analysis.technical_analysis || '');

    // Clean findings array
    const cleanFindings = (analysis.key_findings || []).map((f: string) => cleanMarkdown(f));
    const cleanRecommendations = (analysis.audit_recommendations || []).map((r: string) => cleanMarkdown(r));

    return `EXECUTIVE SUMMARY
${cleanSummary}

RISK ASSESSMENT
${riskEmoji} ${analysis.risk_assessment}

KEY FINDINGS
${cleanFindings.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n\n') || 'No critical findings detected'}

TECHNICAL ANALYSIS
${cleanAnalysis}

PROFESSIONAL RECOMMENDATIONS
${cleanRecommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n\n') || 'See detailed recommendations above'}

═══════════════════════════════════════════════════════════════════
⚠️  IMPORTANT NOTICE
═══════════════════════════════════════════════════════════════════
This automated analysis provides preliminary security insights based on on-chain
program metadata. For production deployments handling significant value (>$100K TVL),
you MUST engage a professional security audit firm for comprehensive review:

• Halborn Security (halborn.com)
• OtterSec (osec.io)
• Sec3 (sec3.dev)
• Neodyme (neodyme.io)

A complete audit requires: source code review, formal verification, penetration
testing, economic analysis, and continuous monitoring infrastructure.`;
  }
}
