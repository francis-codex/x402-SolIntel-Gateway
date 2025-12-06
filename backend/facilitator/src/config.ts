import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface Config {
  port: number;
  host: string;
  network: 'devnet' | 'mainnet-beta';
  solanaRpcUrl: string;
}

const config: Config = {
  port: parseInt(process.env.FACILITATOR_PORT || '3000'),
  host: process.env.FACILITATOR_HOST || '0.0.0.0',
  network: (process.env.NETWORK || 'mainnet-beta') as 'devnet' | 'mainnet-beta',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=db683a77-edb6-4c80-8cac-944640c07e21',
};

export default config;
