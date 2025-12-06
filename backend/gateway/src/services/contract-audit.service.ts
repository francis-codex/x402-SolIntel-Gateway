import { BaseAIService } from './base.service';
import { ContractAuditInput, ContractAuditResult, Vulnerability } from '@x402-solintel/types';
import { Connection, PublicKey } from '@solana/web3.js';
import config from '../config';

/**
 * Smart Contract Audit Service
 * Analyzes Solana programs for security vulnerabilities
 */
export class ContractAuditService extends BaseAIService {
  private connection: Connection;

  constructor() {
    super('contract-audit', config.pricing.contractAudit);
    this.connection = new Connection(config.solanaRpcUrl);
  }

  async execute(input: ContractAuditInput): Promise<ContractAuditResult> {
    const startTime = Date.now();

    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.programId) {
      throw new Error('Program ID is required');
    }

    try {
      // 1. Verify program exists
      const programPubkey = new PublicKey(input.programId);
      const programInfo = await this.connection.getAccountInfo(programPubkey);

      if (!programInfo) {
        throw new Error('Program not found on-chain');
      }

      // 2. Get program metadata
      const isExecutable = programInfo.executable;
      const owner = programInfo.owner.toBase58();
      const dataSize = programInfo.data.length;

      // 3. Check if it's a known program type
      const programType = this.identifyProgramType(owner);

      // 4. Run automated security checks
      const autoVulnerabilities = this.runAutomatedChecks({
        isExecutable,
        owner,
        dataSize,
        programType,
      });

      // 5. Get AI-powered security analysis
      const aiPrompt = `Analyze this Solana program for security vulnerabilities:
Program ID: ${input.programId}
Executable: ${isExecutable}
Owner: ${owner}
Program Type: ${programType}
Data Size: ${dataSize} bytes

Automated checks found:
${autoVulnerabilities.map((v) => `- [${v.severity}] ${v.title}`).join('\n')}

Provide:
1. Additional security analysis
2. Overall security assessment
3. Specific recommendations

Keep it concise (3-4 sentences).`;

      const aiAnalysis = await this.analyzeWithAI(aiPrompt, {
        programId: input.programId,
        executable: isExecutable,
        owner,
        programType,
        autoVulnerabilities,
      });

      // 6. Categorize vulnerabilities by severity
      const vulnerabilities = {
        critical: autoVulnerabilities.filter((v) => v.severity === 'CRITICAL'),
        high: autoVulnerabilities.filter((v) => v.severity === 'HIGH'),
        medium: autoVulnerabilities.filter((v) => v.severity === 'MEDIUM'),
        low: autoVulnerabilities.filter((v) => v.severity === 'LOW'),
      };

      // 7. Calculate security score
      const securityScore = this.calculateSecurityScore(vulnerabilities);

      // 8. Generate recommendations
      const recommendations = this.generateRecommendations(vulnerabilities);

      const executionTime = Date.now() - startTime;

      return {
        service: 'contract-audit',
        program_id: input.programId,
        security_score: securityScore,
        vulnerabilities,
        ai_analysis: aiAnalysis,
        recommendations,
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
   * Identify program type based on owner
   */
  private identifyProgramType(owner: string): string {
    const knownPrograms: Record<string, string> = {
      'BPFLoaderUpgradeab1e11111111111111111111111': 'BPF Upgradeable Loader',
      'BPFLoader2111111111111111111111111111111111': 'BPF Loader v2',
      'BPFLoader1111111111111111111111111111111111': 'BPF Loader v1',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL Token',
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Account',
    };

    return knownPrograms[owner] || 'Custom Program';
  }

  /**
   * Run automated security checks
   */
  private runAutomatedChecks(program: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Check if program is upgradeable
    if (program.owner === 'BPFLoaderUpgradeab1e11111111111111111111111') {
      vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Upgradeable Program',
        description: 'Program can be upgraded by the upgrade authority, which poses a centralization risk',
        recommendation: 'Verify the upgrade authority is a trusted multisig or has been revoked',
      });
    }

    // Check program size (unusually large programs may be complex/risky)
    if (program.dataSize > 500000) {
      vulnerabilities.push({
        severity: 'LOW',
        title: 'Large Program Size',
        description: 'Program has a large codebase which increases complexity and attack surface',
        recommendation: 'Ensure thorough testing and consider modular architecture',
      });
    }

    // Add general security recommendations
    vulnerabilities.push({
      severity: 'LOW',
      title: 'General Security Notice',
      description: 'On-chain analysis is limited without source code access',
      recommendation: 'Request source code and Anchor IDL for comprehensive audit',
    });

    return vulnerabilities;
  }

  /**
   * Calculate overall security score (0-10)
   */
  private calculateSecurityScore(vulnerabilities: any): number {
    let score = 10;

    score -= vulnerabilities.critical.length * 3;
    score -= vulnerabilities.high.length * 2;
    score -= vulnerabilities.medium.length * 1;
    score -= vulnerabilities.low.length * 0.5;

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(vulnerabilities: any): string[] {
    const recommendations: string[] = [
      'Obtain and review the source code for comprehensive analysis',
      'Verify all program upgrade authorities and consider revoking if appropriate',
      'Check for proper access controls and permission validations',
    ];

    if (vulnerabilities.critical.length > 0) {
      recommendations.unshift('CRITICAL: Address critical vulnerabilities immediately before deployment');
    }

    if (vulnerabilities.high.length > 0) {
      recommendations.push('Conduct penetration testing for high-severity issues');
    }

    return recommendations;
  }
}
