import Anthropic from '@anthropic-ai/sdk';
import config from '../config';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;

function getClient() {
  if (!anthropic && config.anthropicApiKey) {
    anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }
  return anthropic;
}

/**
 * Analyze data with Claude and return insights
 */
export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  data: any
): Promise<string> {
  try {
    const client = getClient();
    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${userPrompt}\n\nData:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'No analysis available';
  } catch (error: any) {
    console.error('[ANTHROPIC] Error analyzing with Claude:', error.message);
    throw error;
  }
}

/**
 * Generate code with Claude
 */
export async function generateCodeWithClaude(
  description: string,
  type: string
): Promise<{ code: string; explanation: string }> {
  try {
    const client = getClient();
    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    const systemPrompt = `You are an expert Solana/Anchor developer. Generate clean, production-ready code based on user requirements.`;

    const userPrompt = `Generate ${type} code for: ${description}

Please provide:
1. The complete code
2. A brief explanation of how it works
3. Any important notes or best practices

Format your response as:
CODE:
[code here]

EXPLANATION:
[explanation here]`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    let responseText = '';
    if (content.type === 'text') {
      responseText = content.text;
    }

    // Parse response
    const codeSplit = responseText.split('CODE:');
    const explanationSplit = responseText.split('EXPLANATION:');

    const code = codeSplit[1]?.split('EXPLANATION:')[0]?.trim() || responseText;
    const explanation = explanationSplit[1]?.trim() || 'No explanation available';

    return { code, explanation };
  } catch (error: any) {
    console.error('[ANTHROPIC] Error generating code:', error.message);
    throw error;
  }
}
