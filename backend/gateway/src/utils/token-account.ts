import { PublicKey } from '@solana/web3.js';

/**
 * Get associated token account address
 */
export async function getTokenAccountAddress(
  walletAddress: string,
  mintAddress: string
): Promise<string> {
  try {
    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    );
    const TOKEN_PROGRAM_ID = new PublicKey(
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );

    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);

    const [ata] = PublicKey.findProgramAddressSync(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    return ata.toBase58();
  } catch (error) {
    console.error('[TOKEN_ACCOUNT] Error getting ATA:', error);
    throw error;
  }
}
