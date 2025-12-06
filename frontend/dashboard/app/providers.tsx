'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

require('@solana/wallet-adapter-react-ui/styles.css');

export function Providers({ children }: { children: React.ReactNode }) {
  // Network - use mainnet-beta for production
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => {
    // HARDCODED Helius RPC to bypass env variable issues
    const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=db683a77-edb6-4c80-8cac-944640c07e21';
    console.log('🔗 Solana RPC URL:', rpcUrl);
    return rpcUrl;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
