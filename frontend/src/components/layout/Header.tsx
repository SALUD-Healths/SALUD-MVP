import { useState } from 'react';
import { Bell, Search, Wallet, ChevronDown, Copy, ExternalLink, CheckCircle2, TestTube2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn, truncateAddress, copyToClipboard } from '@/lib/utils';
import { DEMO_MODE } from '@/lib/aleo/config';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  walletAddress?: string;
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function Header({
  title,
  subtitle,
  walletAddress = 'aleo1gl4a57rcxyjvmzcgjscjqe466ecdr7uk4gdp7sf5pctu6tjvv5qs60lw8y',
  isConnected = true,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(walletAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
        {/* Left Section - Title */}
        <div className="flex items-center gap-4">
          {title && (
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Demo Mode Indicator */}
          {DEMO_MODE && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="warning" 
                  size="sm"
                  className="flex items-center gap-1 cursor-help"
                >
                  <TestTube2 size={12} />
                  Demo Mode
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Demo Mode Active</p>
                <p className="text-xs text-slate-400 mt-1">
                  Transactions are simulated locally. No real blockchain interaction.
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Search */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Input
                  placeholder="Search records..."
                  leftIcon={<Search size={16} />}
                  className="h-9"
                  autoFocus
                  onBlur={() => setShowSearch(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {!showSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(true)}
                  className="h-9 w-9"
                >
                  <Search size={18} className="text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search records</TooltipContent>
            </Tooltip>
          )}

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell size={18} className="text-slate-500" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* Wallet Connection */}
          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-aleo-400 to-aleo-600">
                  <Wallet size={14} className="text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium text-slate-900">
                    {truncateAddress(walletAddress, 6, 4)}
                  </span>
                  <span className="text-[10px] text-slate-500">Aleo Testnet</span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-slate-400 transition-transform',
                    showWalletMenu && 'rotate-180'
                  )}
                />
              </button>

              {/* Wallet Dropdown */}
              <AnimatePresence>
                {showWalletMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowWalletMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-aleo-400 to-aleo-600">
                          <Wallet size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">Connected</p>
                          <Badge variant="aleo" size="sm">Aleo Testnet</Badge>
                        </div>
                      </div>

                      <div className="mb-4 rounded-lg bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-medium text-slate-500">Wallet Address</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 truncate text-xs text-slate-700">
                            {walletAddress}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={handleCopyAddress}
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                              >
                                {copied ? (
                                  <CheckCircle2 size={14} className="text-success-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {copied ? 'Copied!' : 'Copy address'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <a
                          href={`https://explorer.aleo.org/address/${walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <ExternalLink size={16} />
                          View on Explorer
                        </a>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                          onClick={() => {
                            setShowWalletMenu(false);
                            onDisconnect?.();
                          }}
                        >
                          Disconnect Wallet
                        </Button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button onClick={onConnect} variant="aleo">
              <Wallet size={16} />
              Connect Wallet
            </Button>
          )}

          {/* User Avatar */}
          <Avatar size="sm">
            <AvatarFallback className="bg-primary-100 text-primary-700">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
    </TooltipProvider>
  );
}
