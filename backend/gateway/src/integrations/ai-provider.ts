import config from '../config';
import { analyzeWithGPT, generateCode as generateCodeGPT } from './openai';
import { analyzeWithClaude, generateCodeWithClaude } from './anthropic';
import { analyzeWithMock, generateCodeWithMock } from './mock-ai';

/**
 * Unified AI Provider
 * Supports OpenAI, Anthropic (Claude), and Mock (for development)
 */

export type AIProvider = 'openai' | 'anthropic' | 'mock';

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
    } else if (provider === 'anthropic') {
      console.log('[AI] Using Claude (Anthropic)');
      return await analyzeWithClaude(systemPrompt, userPrompt, data);
    } else {
      console.log('[AI] Using OpenAI');
      return await analyzeWithGPT(systemPrompt, userPrompt, data);
    }
  } catch (error: any) {
    console.error(`[AI] ${provider} failed:`, error.message);

    // Fallback chain: try other providers, then mock as last resort
    if (provider === 'anthropic' && config.openaiApiKey) {
      console.log('[AI] Falling back to OpenAI...');
      try {
        return await analyzeWithGPT(systemPrompt, userPrompt, data);
      } catch {
        console.log('[AI] OpenAI also failed, using mock...');
        return await analyzeWithMock(systemPrompt, userPrompt, data);
      }
    } else if (provider === 'openai' && config.anthropicApiKey) {
      console.log('[AI] Falling back to Anthropic...');
      try {
        return await analyzeWithClaude(systemPrompt, userPrompt, data);
      } catch {
        console.log('[AI] Anthropic also failed, using mock...');
        return await analyzeWithMock(systemPrompt, userPrompt, data);
      }
    } else {
      console.log('[AI] No fallback available, using mock...');
      return await analyzeWithMock(systemPrompt, userPrompt, data);
    }
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
    } else if (provider === 'anthropic') {
      console.log('[AI] Using Claude for code generation');
      return await generateCodeWithClaude(description, type);
    } else {
      console.log('[AI] Using OpenAI for code generation');
      return await generateCodeGPT(description, type);
    }
  } catch (error: any) {
    console.error(`[AI] ${provider} code generation failed:`, error.message);

    // Fallback chain
    if (provider === 'anthropic' && config.openaiApiKey) {
      console.log('[AI] Falling back to OpenAI for code generation...');
      try {
        return await generateCodeGPT(description, type);
      } catch {
        return await generateCodeWithMock(description, type);
      }
    } else if (provider === 'openai' && config.anthropicApiKey) {
      console.log('[AI] Falling back to Anthropic for code generation...');
      try {
        return await generateCodeWithClaude(description, type);
      } catch {
        return await generateCodeWithMock(description, type);
      }
    } else {
      return await generateCodeWithMock(description, type);
    }
  }
}
