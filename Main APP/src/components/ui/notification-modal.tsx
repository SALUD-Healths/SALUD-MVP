import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'success' | 'error';
  title: string;
  message: string;
  transactionHash?: string;
  network?: 'testnet' | 'mainnet';
}

export function NotificationModal({
  open,
  onOpenChange,
  type,
  title,
  message,
  transactionHash,
  network = 'testnet',
}: NotificationModalProps) {
  const isSuccess = type === 'success';
  
  const explorerUrl = transactionHash 
    ? `https://${network === 'testnet' ? 'testnet.' : ''}explorer.provable.com/transaction/${transactionHash}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          {/* Icon */}
          <div
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full',
              isSuccess ? 'bg-success-50' : 'bg-danger-50'
            )}
          >
            {isSuccess ? (
              <CheckCircle2 size={48} className="text-success-600" strokeWidth={2.5} />
            ) : (
              <XCircle size={48} className="text-danger-600" strokeWidth={2.5} />
            )}
          </div>

          {/* Title */}
          <h2
            className={cn(
              'text-2xl font-bold',
              isSuccess ? 'text-success-600' : 'text-danger-600'
            )}
          >
            {title}
          </h2>

          {/* Message */}
          <p className="text-slate-600 text-base max-w-sm">
            {message}
          </p>

          {/* Transaction Hash Link */}
          {isSuccess && transactionHash && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              View Transaction
              <ExternalLink size={14} />
            </a>
          )}

          {/* Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className={cn(
              'w-32',
              isSuccess
                ? 'bg-success-600 hover:bg-success-700'
                : 'bg-danger-600 hover:bg-danger-700'
            )}
          >
            Ok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
