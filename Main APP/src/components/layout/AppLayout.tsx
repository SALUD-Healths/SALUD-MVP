import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUserStore } from '@/store';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletConnectModal } from './WalletConnectModal';

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
}

export function AppLayout({ title, subtitle }: AppLayoutProps) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const user = useUserStore((state) => state.user);
  const { disconnect: disconnectWallet } = useWallet();
  const { disconnect: disconnectUser } = useUserStore();

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (err) {
      console.warn('[AppLayout] Wallet disconnect error:', err);
    }
    disconnectUser();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      {/* Main Content Area - offset by sidebar width */}
      <div className="pl-[260px] transition-all duration-200">
        <Header 
          title={title} 
          subtitle={subtitle}
          walletAddress={user?.address}
          isConnected={user?.isConnected ?? false}
          onConnect={() => setShowConnectModal(true)}
          onDisconnect={handleDisconnect}
        />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
      />
    </div>
  );
}

// Container component for consistent content width
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({ children, className, size = 'xl' }: ContainerProps) {
  return (
    <div className={`mx-auto ${sizeClasses[size]} ${className || ''}`}>
      {children}
    </div>
  );
}

// Page header component
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  isLoading?: boolean;
}

export function EmptyState({ icon, title, description, action, isLoading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isLoading ? 'bg-primary-50' : 'bg-slate-100'} ${isLoading ? 'text-primary-500' : 'text-slate-400'} ${isLoading ? 'animate-pulse' : ''}`}>
        {isLoading ? (
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}
