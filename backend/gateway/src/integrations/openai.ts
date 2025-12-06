import OpenAI from 'openai';
import config from '../config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Analyze data with GPT-4 and return insights
 */
export async function analyzeWithGPT(
  systemPrompt: string,
  userPrompt: string,
  data: any
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `${userPrompt}\n\nData:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || 'No analysis available';
  } catch (error) {
    console.error('[OPENAI] Error analyzing with GPT:', error);
    throw error;
  }
}

/**
 * Generate code with GPT-4
 */
export async function generateCode(
  description: string,
  type: string
): Promise<{ code: string; explanation: string }> {
  try {
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse response
    const codeSplit = content.split('CODE:');
    const explanationSplit = content.split('EXPLANATION:');

    const code = codeSplit[1]?.split('EXPLANATION:')[0]?.trim() || content;
    const explanation = explanationSplit[1]?.trim() || 'No explanation available';

    return { code, explanation };
  } catch (error) {
    console.error('[OPENAI] Error generating code:', error);
    throw error;
  }
}
