/**
 * Aleo Wallet Provider
 * 
 * Wraps the app with Aleo wallet adapter for Leo Wallet integration.
 */

import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { 
  WalletProvider as AleoWalletProvider,
} from '@demox-labs/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';

// Import our custom override styles
import '../styles/wallet-adapter-override.css';

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'Salud Health Records',
      }),
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={false}
    >
      {children}
    </AleoWalletProvider>
  );
};
