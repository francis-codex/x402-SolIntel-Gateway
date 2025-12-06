import { BaseAIService } from './base.service';
import { CodeGeneratorInput, CodeGeneratorResult } from '@x402-solintel/types';
import config from '../config';

/**
 * Code Generator Service
 * Generates Solana program code, tests, and deployment instructions
 */
export class CodeGeneratorService extends BaseAIService {
  constructor() {
    super('code-generator', config.pricing.codeGenerator);
  }

  async execute(input: CodeGeneratorInput): Promise<CodeGeneratorResult> {
    const startTime = Date.now();

    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!input.description) {
      throw new Error('Code description is required');
    }

    try {
      // Determine code type
      const codeType = input.type || 'anchor-program';

      // Build appropriate prompt based on type
      const prompt = this.buildPromptForType(codeType, input.description);

      // Get AI-generated code
      const aiResponse = await this.analyzeWithAI(prompt, { description: input.description });

      // Parse the response to extract code sections
      const parsedResult = this.parseCodeResponse(aiResponse, codeType);

      const executionTime = Date.now() - startTime;

      return {
        service: 'code-generator',
        description: input.description,
        code: parsedResult.code,
        language: parsedResult.language,
        framework: parsedResult.framework,
        instructions: parsedResult.instructions,
        ai_explanation: parsedResult.explanation,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[CODE_GENERATOR] Service error:', error);
      throw new Error(
        `Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build prompt based on code type
   */
  private buildPromptForType(type: string, description: string): string {
    const prompts = {
      'anchor-program': `Generate a Solana Anchor program for: ${description}

Include:
1. Complete Rust code with proper structure
2. State accounts and instructions
3. Security checks and validations
4. Comments explaining key parts

Format your response as:
CODE:
\`\`\`rust
// code here
\`\`\`

EXPLANATION:
Brief explanation of the program structure and key functions

DEPLOYMENT:
Step-by-step deployment instructions`,

      'client-integration': `Generate TypeScript client code for Solana integration: ${description}

Include:
1. Complete TypeScript/JavaScript code
2. Wallet connection handling
3. Transaction building and signing
4. Error handling

Format your response as:
CODE:
\`\`\`typescript
// code here
\`\`\`

EXPLANATION:
Brief explanation of the integration and usage

SETUP:
Setup and usage instructions`,

      'test': `Generate test code for Solana: ${description}

Include:
1. Complete test suite
2. Setup and teardown
3. Multiple test cases
4. Mock data and assertions

Format your response as:
CODE:
\`\`\`typescript
// code here
\`\`\`

EXPLANATION:
Brief explanation of test coverage

USAGE:
How to run the tests`,

      'deployment': `Generate deployment scripts for Solana: ${description}

Include:
1. Deployment script
2. Configuration setup
3. Verification steps
4. Rollback procedures

Format your response as:
CODE:
\`\`\`bash
# code here
\`\`\`

EXPLANATION:
Brief explanation of deployment process

STEPS:
Detailed deployment steps`,
    };

    return prompts[type as keyof typeof prompts] || prompts['anchor-program'];
  }

  /**
   * Parse AI response to extract code and sections
   */
  private parseCodeResponse(
    response: string,
    codeType: string
  ): {
    code: string;
    language: string;
    framework: string;
    instructions: string;
    explanation: string;
  } {
    // Extract code block
    const codeMatch = response.match(/```(\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[2].trim() : response;
    const language = codeMatch ? codeMatch[1] || 'rust' : 'rust';

    // Extract explanation
    const explanationMatch = response.match(/EXPLANATION:([\s\S]*?)(?:DEPLOYMENT:|SETUP:|USAGE:|STEPS:|$)/i);
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : 'Generated code based on the provided description';

    // Extract instructions
    const instructionsMatch = response.match(/(?:DEPLOYMENT:|SETUP:|USAGE:|STEPS:)([\s\S]*?)$/i);
    const instructions = instructionsMatch
      ? instructionsMatch[1].trim()
      : 'Build and deploy using standard Anchor toolchain';

    // Determine framework
    const framework = this.determineFramework(codeType, code);

    return {
      code,
      language,
      framework,
      instructions,
      explanation,
    };
  }

  /**
   * Determine framework based on code type and content
   */
  private determineFramework(codeType: string, code: string): string {
    if (codeType === 'anchor-program' || code.includes('use anchor_lang')) {
      return 'Anchor';
    }
    if (codeType === 'client-integration' || code.includes('@solana/web3.js')) {
      return 'Solana Web3.js';
    }
    if (code.includes('solana-program')) {
      return 'Native Solana Program';
    }
    return 'Solana';
  }
}
