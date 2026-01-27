import { useState, useEffect } from 'react';
import { Wallet, Loader2, ExternalLink, ChevronDown, Key, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAleo } from '@/hooks/useAleo';
import { DEV_PRIVATE_KEY, DEMO_MODE } from '@/lib/aleo/config';
import { useUserStore } from '@/store';

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingDemo, setIsConnectingDemo] = useState(false);
  const [isConnectingLeo, setIsConnectingLeo] = useState(false);
  
  const { connect: connectWithPrivateKey, isConnecting, generateAccount } = useAleo();
  const { select, wallets, publicKey, connected, connecting, connect } = useWallet();
  const { connect: connectUser } = useUserStore();

  // When Leo Wallet connects, sync with our app state
  useEffect(() => {
    if (connected && publicKey) {
      // Update our app's user store with the wallet address
      connectUser(publicKey);
      onOpenChange(false);
    }
  }, [connected, publicKey, connectUser, onOpenChange]);

  // Debug: Log available wallets
  useEffect(() => {
    console.log('Available wallets:', wallets);
    wallets.forEach(w => {
      console.log(`- ${w.adapter.name}: ${w.readyState}`);
    });
  }, [wallets]);

  const handleDemoConnect = async () => {
    setError(null);
    setIsConnectingDemo(true);

    try {
      const key = DEV_PRIVATE_KEY || 'APrivateKey1zkpCrUpbkMau9C7UqgLhxhoRu5TEgY6MUvdzTLzobcmDFqt';
      const success = await connectWithPrivateKey(key);
      
      if (success) {
        onOpenChange(false);
      } else {
        setError('Failed to connect demo wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnectingDemo(false);
    }
  };

  const handlePrivateKeyConnect = async () => {
    if (!privateKey.trim()) {
      setError('Please enter a private key');
      return;
    }

    if (!privateKey.startsWith('APrivateKey1')) {
      setError('Invalid private key format. Must start with APrivateKey1');
      return;
    }

    console.log('[WalletConnect] Attempting to connect with private key...');
    console.log('[WalletConnect] Key length:', privateKey.length);
    console.log('[WalletConnect] Key preview:', privateKey.substring(0, 20) + '...');

    setError(null);
    try {
      const success = await connectWithPrivateKey(privateKey);

      console.log('[WalletConnect] Connect result:', success);
      console.log('[WalletConnect] Checking sessionStorage...');
      console.log('[WalletConnect] sessionId:', sessionStorage.getItem('salud_session_id'));
      console.log('[WalletConnect] privateKey stored:', sessionStorage.getItem('salud_private_key') ? 'YES' : 'NO');

      if (success) {
        console.log('[WalletConnect] Connection successful!');
        // Wait a bit to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 500));
        setPrivateKey('');
        onOpenChange(false);
      } else {
        console.error('[WalletConnect] Connection returned false');
        setError('Failed to connect. Please check your private key.');
      }
    } catch (err) {
      console.error('[WalletConnect] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect. Please check your private key.');
    }
  };

  const handleGenerateNew = async () => {
    const account = await generateAccount();
    setPrivateKey(account.privateKey);
    setShowKey(true);
  };

  const handleClose = () => {
    setPrivateKey('');
    setError(null);
    setShowKey(false);
    onOpenChange(false);
  };

  const isLoading = isConnecting || connecting || isConnectingDemo || isConnectingLeo;

  return (
    <>
      <style>{`
        /* Ensure our custom modal has the highest z-index */
        [role="dialog"] {
          z-index: 50 !important;
        }
        [data-radix-portal] {
          z-index: 50 !important;
        }
        /* Hide the wallet adapter's modal completely */
        .wallet-adapter-modal,
        .wallet-adapter-modal-wrapper {
          display: none !important;
        }
        /* If Leo Wallet popup appears, ensure it's on top */
        .leo-wallet-popup,
        [class*="leo-extension"],
        iframe[src*="leo"] {
          z-index: 100 !important;
        }
      `}</style>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md z-40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aleo-100">
              <Wallet size={18} className="text-aleo-600" />
            </div>
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            {DEMO_MODE 
              ? 'Connect a wallet to test the application. Demo mode - no real transactions.'
              : 'Connect your Aleo wallet to interact with the blockchain.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Leo Wallet - Direct Connection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Browser Wallet</p>
            <button
              onClick={async () => {
                setIsConnectingLeo(true);
                setError(null);
                try {
                  // Find Leo wallet adapter
                  const leoWallet = wallets.find(w => w.adapter.name === 'Leo Wallet');
                  if (leoWallet) {
                    // First select the wallet
                    await select(leoWallet.adapter.name);
                    // Then explicitly connect with proper parameters
                    await connect(
                      DecryptPermission.UponRequest,
                      WalletAdapterNetwork.TestnetBeta
                    );
                    // Connection successful, the useEffect will handle closing the modal
                  } else {
                    setError('Leo Wallet not found. Please install the Leo Wallet extension.');
                  }
                } catch (err) {
                  console.error('Leo Wallet connection error:', err);
                  setError(err instanceof Error ? err.message : 'Failed to connect Leo Wallet');
                } finally {
                  setIsConnectingLeo(false);
                }
              }}
              disabled={isLoading || isConnectingLeo}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700
                text-white font-medium
                disabled:opacity-60 disabled:cursor-not-allowed
                ${isConnectingLeo ? 'opacity-70' : ''}
              `}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <Wallet size={20} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Leo Wallet</span>
                  {wallets.some(w => w.adapter.name === 'Leo Wallet' && w.readyState === 'Installed') && (
                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                      Detected
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/80">
                  Connect with browser extension (view-only)
                </p>
              </div>
              {isConnectingLeo ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ChevronDown size={20} className="-rotate-90" />
              )}
            </button>
            {(connecting || isConnectingLeo) && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                Connecting to Leo Wallet...
              </p>
            )}

            {/* Leo Wallet limitation notice */}
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> To create medical records, use "Import with Private Key" below. Leo Wallet is for viewing only.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500">or</span>
            </div>
          </div>

          {/* Import with Private Key Section */}
          <div className="space-y-3 border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-blue-600" />
              <label className="text-sm font-semibold text-slate-900">
                Import with Private Key
              </label>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-auto">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Use your Aleo private key to create and manage medical records
            </p>

            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="APrivateKey1..."
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  setError(null);
                }}
                leftIcon={<Key size={16} />}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Eye size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handlePrivateKeyConnect}
                disabled={isLoading || !privateKey.trim()}
                size="sm"
              >
                {isConnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Connect
              </Button>

              <Button
                variant="outline"
                onClick={handleGenerateNew}
                disabled={isLoading}
                size="sm"
              >
                Generate New
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Demo Wallet Option */}
          {(DEMO_MODE || DEV_PRIVATE_KEY) && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500">or</span>
                </div>
              </div>

              <button
                onClick={handleDemoConnect}
                disabled={isLoading}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${DEMO_MODE
                    ? 'border-aleo-300 bg-aleo-50 hover:bg-aleo-100'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }
                  ${isConnectingDemo ? 'opacity-70' : ''}
                `}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-2xl shadow-sm">
                  🧪
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">Demo Wallet</span>
                    {DEMO_MODE && (
                      <span className="text-xs bg-aleo-200 text-aleo-700 px-1.5 py-0.5 rounded">
                        Development
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {DEMO_MODE ? 'For testing (no real transactions)' : 'Development wallet'}
                  </p>
                </div>
                {isConnectingDemo ? (
                  <Loader2 size={20} className="animate-spin text-aleo-600" />
                ) : (
                  <CheckCircle2 size={20} className="text-slate-300" />
                )}
              </button>
            </>
          )}

          {/* Help Links */}
          <div className="flex gap-2 text-xs text-slate-500 justify-center pt-2">
            <a 
              href="https://leo.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-aleo-600 hover:underline flex items-center gap-1"
            >
              Get Leo Wallet
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Demo Mode Notice */}
          {DEMO_MODE && (
            <div className="rounded-lg bg-aleo-50 p-3">
              <p className="text-xs text-aleo-700">
                <strong>Demo Mode:</strong> All transactions are simulated locally. 
                No real blockchain interaction occurs.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
