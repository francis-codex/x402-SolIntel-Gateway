import { PaymentRequirements, PaymentPayload } from '@x402-solintel/types';
import { Transaction, PublicKey } from '@solana/web3.js';

/**
 * Verify payment transaction against requirements
 */
export async function verifyPayment(
  payment: PaymentPayload,
  requirements: PaymentRequirements
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Decode the transaction
    const txBuffer = Buffer.from(payment.transaction, 'base64');
    const transaction = Transaction.from(txBuffer);

    // Verify transaction has required instructions
    const verificationResult = verifyTransactionInstructions(
      transaction,
      requirements
    );

    if (!verificationResult.isValid) {
      return {
        isValid: false,
        error: verificationResult.error,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('[VERIFY] Error verifying payment:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify transaction instructions match payment requirements
 */
function verifyTransactionInstructions(
  transaction: Transaction,
  requirements: PaymentRequirements
): { isValid: boolean; error?: string } {
  try {
    const TOKEN_PROGRAM_ID = new PublicKey(
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );

    // Find SPL token transfer instruction
    const transferInstruction = transaction.instructions.find((ix) =>
      ix.programId.equals(TOKEN_PROGRAM_ID)
    );

    if (!transferInstruction) {
      return {
        isValid: false,
        error: 'No token transfer instruction found',
      };
    }

    // Decode instruction data
    const instructionData = transferInstruction.data;

    if (instructionData.length < 9) {
      return {
        isValid: false,
        error: 'Invalid transfer instruction data',
      };
    }

    // Instruction type: 3 for Transfer or 12 for TransferChecked
    const instructionType = instructionData[0];
    if (instructionType !== 3 && instructionType !== 12) {
      return {
        isValid: false,
        error: 'Not a token transfer instruction',
      };
    }

    // Read amount (8 bytes, little-endian)
    const amount = instructionData.readBigUInt64LE(1);
    const requiredAmount = BigInt(requirements.amount);

    if (amount < requiredAmount) {
      return {
        isValid: false,
        error: `Insufficient payment: ${amount} < ${requiredAmount}`,
      };
    }

    // Verify recipient token account
    if (transferInstruction.keys.length < 2) {
      return {
        isValid: false,
        error: 'Invalid transfer instruction accounts',
      };
    }

    const destination = transferInstruction.keys[1].pubkey.toBase58();

    if (requirements.tokenAccount && destination !== requirements.tokenAccount) {
      return {
        isValid: false,
        error: `Wrong recipient: ${destination} != ${requirements.tokenAccount}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : 'Instruction verification failed',
    };
  }
}
