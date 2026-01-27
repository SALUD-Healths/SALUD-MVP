import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Spinner({ size = 'default', className, ...props }: SpinnerProps) {
  return (
    <div role="status" {...props}>
      <Loader2 className={cn('animate-spin text-primary-600', sizeClasses[size], className)} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-slate-200',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="80%" height={16} />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-slate-200 pb-3">
        <Skeleton variant="text" width="25%" height={16} />
        <Skeleton variant="text" width="25%" height={16} />
        <Skeleton variant="text" width="25%" height={16} />
        <Skeleton variant="text" width="25%" height={16} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton variant="text" width="25%" height={20} />
          <Skeleton variant="text" width="25%" height={20} />
          <Skeleton variant="text" width="25%" height={20} />
          <Skeleton variant="text" width="25%" height={20} />
        </div>
      ))}
    </div>
  );
}
