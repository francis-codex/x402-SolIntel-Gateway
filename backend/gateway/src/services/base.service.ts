import { ServiceName } from '@x402-solintel/types';
import { analyzeWithGPT } from '../integrations/openai';

/**
 * Abstract base class for all AI services
 */
export abstract class BaseAIService {
  protected serviceName: ServiceName;
  protected priceUSD: number;

  constructor(serviceName: ServiceName, priceUSD: number) {
    this.serviceName = serviceName;
    this.priceUSD = priceUSD;
  }

  /**
   * Execute the service - must be implemented by each service
   */
  abstract execute(input: any): Promise<any>;

  /**
   * Analyze data using GPT-4
   */
  protected async analyzeWithAI(
    prompt: string,
    data: any,
    systemContext?: string
  ): Promise<string> {
    const defaultContext =
      'You are an expert Solana crypto analyst. Provide clear, actionable insights based on the data provided.';

    return await analyzeWithGPT(
      systemContext || defaultContext,
      prompt,
      data
    );
  }

  /**
   * Get service price
   */
  getPrice(): number {
    return this.priceUSD;
  }

  /**
   * Get service name
   */
  getName(): ServiceName {
    return this.serviceName;
  }

  /**
   * Validate input (can be overridden)
   */
  protected validateInput(input: any): { valid: boolean; error?: string } {
    if (!input) {
      return { valid: false, error: 'Input is required' };
    }
    return { valid: true };
  }
}
