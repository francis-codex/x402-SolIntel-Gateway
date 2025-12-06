import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Transaction } from '@solana/web3.js';
import {
  PaymentRequirements,
  PaymentPayload,
  PaymentReceipt,
  ServiceName,
} from '@x402-solintel/types';
import config from '../config';
import { getServicePrice, usdToUsdcLamports } from '../utils/pricing';
import { getTokenAccountAddress } from '../utils/token-account';

/**
 * x402 Payment Middleware
 * Enforces payment-required responses and verifies payments
 */
export function x402PaymentMiddleware(serviceName: ServiceName) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Get service price
      const priceUSD = getServicePrice(serviceName);

      if (priceUSD === 0) {
        // Free service, no payment required
        return next();
      }

      // Check for payment header
      const paymentHeader = req.headers['x-payment'];

      if (!paymentHeader) {
        // No payment provided - return 402
        return send402Response(res, serviceName, priceUSD);
      }

      // Parse payment
      let payment: PaymentPayload;
      try {
        const paymentJson = Buffer.from(
          paymentHeader as string,
          'base64'
        ).toString('utf-8');
        payment = JSON.parse(paymentJson);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid X-PAYMENT header: failed to parse',
        });
      }

      // Extract payer from transaction
      const payer = extractPayerFromTransaction(payment.transaction);

      // Get recipient token account
      const tokenAccount = await getTokenAccountAddress(
        config.recipientWallet,
        config.usdcMint
      );

      // Build payment requirements
      const requirements: PaymentRequirements = {
        version: 1,
        recipient: config.recipientWallet,
        tokenAccount,
        mint: config.usdcMint,
        amount: usdToUsdcLamports(priceUSD),
        currency: 'USDC',
        network: config.network,
        invoiceId: payment.invoiceId,
        serviceName,
      };

      // Verify and settle payment via facilitator
      try {
        const settleResponse = await axios.post(
          `${config.facilitatorUrl}/settle`,
          {
            payment,
            requirements,
          }
        );

        const txSignature = settleResponse.data.signature;

        // Create payment receipt
        const receipt: PaymentReceipt = {
          id: uuidv4(),
          invoiceId: payment.invoiceId,
          txSignature,
          serviceName,
          amountUSD: priceUSD,
          currency: 'USDC',
          status: 'settled',
          timestamp: Date.now(),
          payer,
          recipient: config.recipientWallet,
          network: config.network,
        };

        // Attach receipt to request
        (req as any).paymentReceipt = receipt;

        // Set payment response header
        res.setHeader(
          'X-PAYMENT-RESPONSE',
          JSON.stringify({
            signature: txSignature,
            amount: priceUSD,
            invoiceId: payment.invoiceId,
          })
        );

        next();
      } catch (error) {
        console.error('[X402] Payment processing error:', error);

        return res.status(402).json({
          error: 'Payment processing failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      console.error('[X402] Middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Send HTTP 402 Payment Required response
 */
function send402Response(
  res: Response,
  serviceName: ServiceName,
  priceUSD: number
): void {
  const invoiceId = uuidv4();

  const requirements: Partial<PaymentRequirements> = {
    version: 1,
    recipient: config.recipientWallet,
    mint: config.usdcMint,
    amount: usdToUsdcLamports(priceUSD),
    currency: 'USDC',
    network: config.network,
    invoiceId,
    serviceName,
    timeout: 60, // 60 seconds to pay
  };

  res.status(402).json({
    error: 'Payment Required',
    message: `This service requires payment: $${priceUSD.toFixed(3)} USDC`,
    service: serviceName,
    payment: requirements,
  });
}

/**
 * Extract payer address from transaction
 */
function extractPayerFromTransaction(transactionBase64: string): string {
  try {
    const txBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(txBuffer);

    if (transaction.feePayer) {
      return transaction.feePayer.toBase58();
    }

    if (transaction.signatures && transaction.signatures.length > 0) {
      const firstSigner = transaction.signatures[0].publicKey;
      if (firstSigner) {
        return firstSigner.toBase58();
      }
    }

    return 'unknown';
  } catch (error) {
    console.error('[X402] Error extracting payer:', error);
    return 'unknown';
  }
}
