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
      'anchor-program': `You are an expert Solana blockchain developer. Generate a COMPLETE, PRODUCTION-READY codebase for: ${description}

🚨 CRITICAL: Generate FULL WORKING CODE - NOT just Cargo.toml or dependencies! 🚨

GENERATE THE FOLLOWING COMPLETE FILES:

════════════════════════════════════════════════════════════════
FILE 1: src/lib.rs (COMPLETE PROGRAM IMPLEMENTATION)
════════════════════════════════════════════════════════════════
\`\`\`rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod your_program {
    use super::*;

    // IMPLEMENT ALL INSTRUCTIONS WITH FULL LOGIC
    // Include: initialize, main functions, validations, error handling
    // NO TODO COMMENTS - WRITE COMPLETE WORKING CODE
}

// DEFINE ALL ACCOUNT STRUCTS
#[derive(Accounts)]
pub struct YourAccounts<'info> {
    // Complete account definitions with constraints
}

// DEFINE STATE STRUCTS
#[account]
pub struct YourState {
    // All state fields
}

// DEFINE CUSTOM ERRORS
#[error_code]
pub enum YourError {
    // All error variants
}
\`\`\`

════════════════════════════════════════════════════════════════
FILE 2: Cargo.toml (COMPLETE DEPENDENCIES)
════════════════════════════════════════════════════════════════
\`\`\`toml
[package]
name = "your-program"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"

[dev-dependencies]
solana-program-test = "1.17"
tokio = "1.35"
\`\`\`

════════════════════════════════════════════════════════════════
FILE 3: tests/integration.rs (COMPLETE TEST SUITE)
════════════════════════════════════════════════════════════════
\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_initialize() {
        // Complete test implementation
    }

    #[tokio::test]
    async fn test_main_functionality() {
        // Complete test with setup, execution, assertions
    }

    #[tokio::test]
    async fn test_error_cases() {
        // Test error handling
    }
}
\`\`\`

════════════════════════════════════════════════════════════════
FILE 4: client/index.ts (TYPESCRIPT CLIENT CODE - OPTIONAL)
════════════════════════════════════════════════════════════════
\`\`\`typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

// Complete client implementation for interacting with the program
\`\`\`

════════════════════════════════════════════════════════════════
EXPLANATION SECTION
════════════════════════════════════════════════════════════════
Provide a detailed explanation covering:
- Program architecture and design decisions
- How each instruction works
- Security considerations and best practices
- Account structure and PDA usage
- Error handling strategy

════════════════════════════════════════════════════════════════
DEPLOYMENT INSTRUCTIONS (STEP-BY-STEP)
════════════════════════════════════════════════════════════════
Provide DETAILED, COPY-PASTE-READY commands:

**Prerequisites:**
- Solana CLI installed (https://docs.solana.com/cli/install-solana-cli-tools)
- Anchor framework installed (https://www.anchor-lang.com/docs/installation)
- Rust toolchain (rustup)

**Step 1: Project Setup**
\`\`\`bash
# Create new Anchor project
anchor init your-program
cd your-program

# Copy the generated code into src/lib.rs
# Copy Cargo.toml dependencies
\`\`\`

**Step 2: Build the Program**
\`\`\`bash
# Build
anchor build

# Get program ID
solana address -k target/deploy/your_program-keypair.json

# Update declare_id! in lib.rs with the program ID
# Update Anchor.toml with the program ID
\`\`\`

**Step 3: Run Tests**
\`\`\`bash
# Run all tests
anchor test

# Run specific test
anchor test -- --test test_initialize
\`\`\`

**Step 4: Deploy to Devnet**
\`\`\`bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for testing
solana airdrop 2

# Deploy the program
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
\`\`\`

**Step 5: Deploy to Mainnet** (when ready)
\`\`\`bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy (requires SOL for deployment costs)
anchor deploy --provider.cluster mainnet
\`\`\`

**Step 6: Interact with the Program**
\`\`\`bash
# Using the TypeScript client
cd client
npm install
ts-node index.ts
\`\`\`

**Troubleshooting:**
- If build fails: \`cargo clean && anchor build\`
- If tests fail: Check your Solana CLI version (\`solana --version\`)
- Update Anchor: \`cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked\`

REMEMBER: Generate COMPLETE, WORKING code in ALL sections - make it copy-paste ready!`,

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
    // Extract ALL code blocks (not just the first one)
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ lang: string; code: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      codeBlocks.push({
        lang: match[1] || 'rust',
        code: match[2].trim()
      });
    }

    // Combine all code blocks with file separators
    let combinedCode = '';
    if (codeBlocks.length > 0) {
      combinedCode = codeBlocks.map((block, index) => {
        // Try to infer file name from context
        const fileName = this.inferFileName(block.code, block.lang, index);
        return `// ═══════════════════════════════════════\n// ${fileName}\n// ═══════════════════════════════════════\n\n${block.code}`;
      }).join('\n\n');
    } else {
      combinedCode = response; // Fallback if no code blocks found
    }

    const language = codeBlocks.length > 0 ? codeBlocks[0].lang : 'rust';

    // Extract explanation section - look for content between separators or section headers
    const explanationMatch = response.match(/EXPLANATION SECTION[\s\S]*?\n([\s\S]*?)(?:═{40,}|DEPLOYMENT INSTRUCTIONS)/i) ||
                             response.match(/## Explanation[\s\S]*?\n([\s\S]*?)(?:##|═{40,})/i);
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : 'Complete codebase generated based on your requirements. Includes program code, tests, and client integration.';

    // Extract deployment instructions - be more flexible with the pattern
    const instructionsMatch = response.match(/DEPLOYMENT INSTRUCTIONS.*?\n([\s\S]*?)(?:REMEMBER:|$)/i) ||
                              response.match(/## Setup.*?Instructions.*?\n([\s\S]*?)(?:##|$)/i) ||
                              response.match(/\*\*Prerequisites:\*\*([\s\S]*?)(?:REMEMBER:|$)/i);

    let instructions = '';
    if (instructionsMatch) {
      instructions = instructionsMatch[1].trim();
    } else {
      // If no instructions found, generate default comprehensive setup guide
      instructions = this.generateDefaultSetupInstructions(codeType);
    }

    // Determine framework
    const framework = this.determineFramework(codeType, combinedCode);

    return {
      code: combinedCode,
      language,
      framework,
      instructions,
      explanation,
    };
  }

  /**
   * Generate default setup instructions if not found in AI response
   */
  private generateDefaultSetupInstructions(codeType: string): string {
    if (codeType === 'anchor-program' || codeType.includes('program')) {
      return `**Prerequisites:**
- Solana CLI installed (https://docs.solana.com/cli/install-solana-cli-tools)
- Anchor framework installed (https://www.anchor-lang.com/docs/installation)
- Rust toolchain (rustup)

**Step 1: Project Setup**
\`\`\`bash
# Create new Anchor project
anchor init your-program
cd your-program

# Copy the generated code into src/lib.rs
# Copy Cargo.toml dependencies
\`\`\`

**Step 2: Build the Program**
\`\`\`bash
# Build
anchor build

# Get program ID
solana address -k target/deploy/your_program-keypair.json

# Update declare_id! in lib.rs with the program ID
# Update Anchor.toml with the program ID
\`\`\`

**Step 3: Run Tests**
\`\`\`bash
# Run all tests
anchor test

# Run specific test
anchor test -- --test test_initialize
\`\`\`

**Step 4: Deploy to Devnet**
\`\`\`bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for testing
solana airdrop 2

# Deploy the program
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
\`\`\`

**Step 5: Deploy to Mainnet** (when ready)
\`\`\`bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy (requires SOL for deployment costs)
anchor deploy --provider.cluster mainnet
\`\`\`

**Troubleshooting:**
- If build fails: \`cargo clean && anchor build\`
- If tests fail: Check your Solana CLI version (\`solana --version\`)
- Update Anchor: \`cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked\``;
    }

    return 'Setup instructions will vary based on your specific use case. Please refer to the generated code comments for guidance.';
  }

  /**
   * Infer file name from code content
   */
  private inferFileName(code: string, lang: string, index: number): string {
    // Check for common patterns
    if (code.includes('declare_id!') || code.includes('#[program]')) {
      return 'src/lib.rs';
    }
    if (code.includes('[package]') && code.includes('[dependencies]')) {
      return 'Cargo.toml';
    }
    if (code.includes('#[cfg(test)]') || code.includes('#[test]') || code.includes('#[tokio::test]')) {
      return 'tests/integration.rs';
    }
    if (code.includes('import * as anchor') || code.includes('@coral-xyz/anchor')) {
      return 'client/index.ts';
    }
    if (code.includes('package.json')) {
      return 'package.json';
    }
    if (lang === 'toml') {
      return 'Cargo.toml';
    }
    if (lang === 'typescript' || lang === 'ts') {
      return `client/file${index}.ts`;
    }
    if (lang === 'rust' || lang === 'rs') {
      return `src/file${index}.rs`;
    }
    return `file${index}.${lang}`;
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
