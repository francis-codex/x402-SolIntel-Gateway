import { PaymentPayload } from '@x402-solintel/types';
import { Connection } from '@solana/web3.js';
import config from './config';

/**
 * Settle payment by broadcasting transaction to Solana
 */
export async function settlePayment(
  payment: PaymentPayload
): Promise<{ signature: string; timestamp: number }> {
  try {
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');

    const txBuffer = Buffer.from(payment.transaction, 'base64');

    // Broadcast transaction to Solana
    const signature = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('[SETTLE] Transaction broadcast:', signature);

    return {
      signature,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[SETTLE] Error settling payment:', error);
    throw error;
  }
}
