import config from '../config';
import { analyzeWithClaude, generateCodeWithClaude } from './anthropic';
import { analyzeWithMock, generateCodeWithMock } from './mock-ai';

/**
 * Unified AI Provider
 * Supports Anthropic (Claude) and Mock (for development)
 */

export type AIProvider = 'anthropic' | 'mock';

/**
 * Get the configured AI provider
 */
function getProvider(): AIProvider {
  return config.aiProvider as AIProvider;
}

/**
 * Analyze data with AI (automatically uses configured provider)
 */
export async function analyzeWithAI(
  systemPrompt: string,
  userPrompt: string,
  data: any
): Promise<string> {
  const provider = getProvider();

  try {
    if (provider === 'mock') {
      console.log('[AI] Using MOCK AI (Development Mode - No API calls)');
      return await analyzeWithMock(systemPrompt, userPrompt, data);
    } else {
      console.log('[AI] Using Claude (Anthropic)');
      return await analyzeWithClaude(systemPrompt, userPrompt, data);
    }
  } catch (error: any) {
    console.error(`[AI] ${provider} failed:`, error.message);
    console.log('[AI] Falling back to mock...');
    return await analyzeWithMock(systemPrompt, userPrompt, data);
  }
}

/**
 * Generate code with AI (automatically uses configured provider)
 */
export async function generateCode(
  description: string,
  type: string
): Promise<{ code: string; explanation: string }> {
  const provider = getProvider();

  try {
    if (provider === 'mock') {
      console.log('[AI] Using MOCK for code generation (Development Mode)');
      return await generateCodeWithMock(description, type);
    } else {
      console.log('[AI] Using Claude for code generation');
      return await generateCodeWithClaude(description, type);
    }
  } catch (error: any) {
    console.error(`[AI] ${provider} code generation failed:`, error.message);
    console.log('[AI] Falling back to mock...');
    return await generateCodeWithMock(description, type);
  }
}
