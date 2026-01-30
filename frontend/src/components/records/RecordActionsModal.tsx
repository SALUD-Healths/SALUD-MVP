import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  Share2,
  Edit3,
  Trash2,
  X,
  FileText,
  Shield,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';
import { RECORD_TYPES, type MedicalRecord, type RecordType } from '@/types/records';

interface RecordActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MedicalRecord | null;
  onView?: (record: MedicalRecord) => void;
  onShare?: (record: MedicalRecord) => void;
  onEdit?: (record: MedicalRecord) => void;
  onDelete?: (record: MedicalRecord) => void;
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Heart: <Eye size={24} />,
  TestTube: <Eye size={24} />,
  Pill: <Eye size={24} />,
  Scan: <Eye size={24} />,
  Syringe: <Eye size={24} />,
  Scissors: <Eye size={24} />,
  Brain: <Eye size={24} />,
  Smile: <Eye size={24} />,
  Eye: <Eye size={24} />,
  FileText: <FileText size={24} />,
};

// Color mapping
const colorMap: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200', lightBg: 'bg-primary-500' },
  success: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200', lightBg: 'bg-success-500' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-200', lightBg: 'bg-warning-500' },
  aleo: { bg: 'bg-aleo-50', text: 'text-aleo-600', border: 'border-aleo-200', lightBg: 'bg-aleo-500' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-200', lightBg: 'bg-danger-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', lightBg: 'bg-cyan-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', lightBg: 'bg-violet-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', lightBg: 'bg-pink-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', lightBg: 'bg-teal-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', lightBg: 'bg-slate-500' },
};

const actions = [
  {
    id: 'view',
    label: 'View Record',
    description: 'View encrypted medical data',
    icon: Eye,
    color: 'primary',
  },
  {
    id: 'share',
    label: 'Share with Doctor',
    description: 'Generate temporary access token',
    icon: Share2,
    color: 'success',
  },
  {
    id: 'edit',
    label: 'Edit Record',
    description: 'Update record details',
    icon: Edit3,
    color: 'warning',
  },
  {
    id: 'delete',
    label: 'Delete Record',
    description: 'Permanently remove this record',
    icon: Trash2,
    color: 'danger',
  },
];

export function RecordActionsModal({
  open,
  onOpenChange,
  record,
  onView,
  onShare,
  onEdit,
  onDelete,
}: RecordActionsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!record) return null;

  const recordTypeInfo = RECORD_TYPES[record.recordType as RecordType];
  const colors = colorMap[recordTypeInfo.color] || colorMap.slate;
  const icon = iconMap[recordTypeInfo.icon] || <FileText size={24} />;

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'view':
        onView?.(record);
        onOpenChange(false);
        break;
      case 'share':
        onShare?.(record);
        onOpenChange(false);
        break;
      case 'edit':
        onEdit?.(record);
        onOpenChange(false);
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleDelete = () => {
    onDelete?.(record);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger-600">
              <AlertTriangle size={20} />
              Delete Record
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-600">
              Are you sure you want to delete <strong>{record.title}</strong>? This action cannot be undone.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              The record will be removed from your local storage. On-chain records cannot be deleted from the blockchain.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        {/* Header with record info */}
        <div className={cn('relative overflow-hidden', colors.bg)}>
          {/* Top accent bar */}
          <div className={cn('h-1', colors.lightBg)} />
          
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                  'bg-white/80 backdrop-blur-sm',
                  colors.text
                )}
              >
                {icon}
              </div>

              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-lg truncate">
                  {record.title}
                </h3>
                <Badge
                  variant="outline"
                  size="sm"
                  className={cn('mt-1', colors.border, colors.text)}
                >
                  {recordTypeInfo.name}
                </Badge>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatRelativeTime(record.createdAt)}
                  </span>
                  {record.isEncrypted && (
                    <span className="flex items-center gap-1 text-success-600">
                      <Shield size={12} />
                      Encrypted
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-slate-600 line-clamp-2">
              {record.description}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 space-y-2">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const actionColors = colorMap[action.color];

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleAction(action.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl',
                  'transition-all duration-200',
                  'hover:shadow-md',
                  action.id === 'delete' 
                    ? 'hover:bg-danger-50 hover:border-danger-200 border border-transparent'
                    : 'hover:bg-slate-50 hover:border-slate-200 border border-transparent'
                )}
              >
                {/* Action Icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    actionColors.bg,
                    actionColors.text
                  )}
                >
                  <ActionIcon size={20} />
                </div>

                {/* Action Info */}
                <div className="flex-1 text-left">
                  <h4 className={cn(
                    'font-medium',
                    action.id === 'delete' ? 'text-danger-600' : 'text-slate-900'
                  )}>
                    {action.label}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {action.description}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight size={20} className="text-slate-300" />
              </motion.button>
            );
          })}
        </div>

        {/* Close button */}
        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            <X size={16} className="mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
