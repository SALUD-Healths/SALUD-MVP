import { useState, useEffect, useCallback } from 'react';
import { Wallet, Loader2, ExternalLink, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store';

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingConnect, setPendingConnect] = useState(false);
  
  const { 
    wallets,
    wallet,
    address, 
    connected, 
    connecting,
    selectWallet,
    connect,
    disconnect 
  } = useWallet();
  const { connect: connectUser, disconnect: disconnectUser } = useUserStore();

  // When Shield Wallet connects, sync with our app state
  useEffect(() => {
    if (connected && address) {
      // Update our app's user store with the wallet address
      connectUser(address);
      setPendingConnect(false);
      onOpenChange(false);
    }
  }, [connected, address, connectUser, onOpenChange]);

  // Auto-connect when wallet is selected and we're waiting to connect
  useEffect(() => {
    if (pendingConnect && wallet && !connected && !connecting) {
      console.log('[WalletConnect] Wallet selected, now connecting...');
      connect(Network.TESTNET).catch((err) => {
        console.error('[WalletConnect] Connect error:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setPendingConnect(false);
      });
    }
  }, [pendingConnect, wallet, connected, connecting, connect]);

  // Debug: Log available wallets
  useEffect(() => {
    console.log('[WalletConnect] Available wallets:', wallets);
    wallets.forEach(w => {
      console.log(`- ${w.adapter.name}: ${w.readyState}`);
    });
  }, [wallets]);

  const handleConnectShield = useCallback(async () => {
    setError(null);

    try {
      // Find the Shield wallet adapter
      const shieldWallet = wallets.find(w => w.adapter.name === 'Shield Wallet');
      
      if (!shieldWallet) {
        setError('Shield Wallet adapter not found. Please install Shield Wallet extension.');
        return;
      }

      console.log('[WalletConnect] Shield wallet readyState:', shieldWallet.readyState);

      // Check if Shield wallet is installed
      if (shieldWallet.readyState !== 'Installed') {
        window.open('https://shield.app', '_blank');
        setError('Shield Wallet is not installed. Please install it from shield.app and refresh the page.');
        return;
      }

      // If wallet is already selected, connect directly
      if (wallet?.adapter.name === 'Shield Wallet') {
        console.log('[WalletConnect] Shield already selected, connecting...');
        await connect(Network.TESTNET);
        return;
      }

      // Select Shield wallet - connection will happen in useEffect above
      console.log('[WalletConnect] Selecting Shield wallet...');
      setPendingConnect(true);
      selectWallet(shieldWallet.adapter.name);
      
    } catch (err) {
      console.error('[WalletConnect] Shield connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Shield Wallet');
      setPendingConnect(false);
    }
  }, [wallets, wallet, selectWallet, connect]);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      disconnectUser();
    } catch (err) {
      console.error('[WalletConnect] Disconnect error:', err);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aleo-100">
              <Wallet size={18} className="text-aleo-600" />
            </div>
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your Shield Wallet to interact with the Aleo blockchain securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected State */}
          {connected && address ? (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle2 size={24} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Connected</p>
                    <p className="text-xs text-green-700 font-mono truncate max-w-[200px]">
                      {address.slice(0, 12)}...{address.slice(-8)}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <>
              {/* Shield Wallet Connect Button */}
              <button
                onClick={handleConnectShield}
                disabled={connecting || pendingConnect}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                  border-aleo-300 bg-aleo-50 hover:bg-aleo-100 hover:border-aleo-400
                  ${(connecting || pendingConnect) ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
                `}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Shield size={28} className="text-aleo-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Shield Wallet</span>
                    <span className="text-xs bg-aleo-200 text-aleo-700 px-1.5 py-0.5 rounded">
                      Official
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Connect with the official Aleo wallet by Provable
                  </p>
                </div>
                {(connecting || pendingConnect) ? (
                  <Loader2 size={20} className="animate-spin text-aleo-600" />
                ) : (
                  <CheckCircle2 size={20} className="text-slate-300" />
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Info Section */}
              <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Why Shield Wallet?</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Official wallet by Provable (Aleo core team)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Private key stays in your browser - never shared</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Generate ZK proofs directly in the wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Fully decentralized - no backend required</span>
                  </li>
                </ul>
              </div>

              {/* Help Links */}
              <div className="flex gap-2 text-xs text-slate-500 justify-center pt-2">
                <a 
                  href="https://shield.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-aleo-600 hover:underline flex items-center gap-1"
                >
                  Get Shield Wallet
                  <ExternalLink size={10} />
                </a>
                <span>|</span>
                <a 
                  href="https://provable.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-aleo-600 hover:underline flex items-center gap-1"
                >
                  Learn about Provable
                  <ExternalLink size={10} />
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
