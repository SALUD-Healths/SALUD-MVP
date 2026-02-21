import { motion } from 'framer-motion';
import {
  Heart,
  TestTube,
  Pill,
  Scan,
  Syringe,
  Scissors,
  Brain,
  Smile,
  Eye,
  FileText,
  Share2,
  Clock,
  Shield,
  Trash2,
  Edit,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn, formatRelativeTime } from '@/lib/utils';
import { RECORD_TYPES, type MedicalRecord, type RecordType, getRecordDisplayData } from '@/types/records';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Heart: <Heart size={20} />,
  TestTube: <TestTube size={20} />,
  Pill: <Pill size={20} />,
  Scan: <Scan size={20} />,
  Syringe: <Syringe size={20} />,
  Scissors: <Scissors size={20} />,
  Brain: <Brain size={20} />,
  Smile: <Smile size={20} />,
  Eye: <Eye size={20} />,
  FileText: <FileText size={20} />,
};

// Color mapping
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200' },
  success: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-200' },
  aleo: { bg: 'bg-aleo-50', text: 'text-aleo-600', border: 'border-aleo-200' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

interface RecordCardProps {
  record: MedicalRecord;
  onShare?: (record: MedicalRecord) => void;
  onEdit?: (record: MedicalRecord) => void;
  onDelete?: (record: MedicalRecord) => void;
  onView?: (record: MedicalRecord) => void;
  index?: number;
}

export function RecordCard({
  record,
  onShare,
  onEdit,
  onDelete,
  onView,
  index = 0,
}: RecordCardProps) {
  const recordTypeInfo = RECORD_TYPES[record.recordType as RecordType];
  const colors = colorMap[recordTypeInfo.color] || colorMap.slate;
  const icon = iconMap[recordTypeInfo.icon] || <FileText size={20} />;
  const { title } = getRecordDisplayData(record);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card
          variant="default"
          padding="none"
          interactive
          onClick={() => onView?.(record)}
          className="group overflow-hidden"
        >
          {/* Top accent bar */}
          <div className={cn('h-1', colors.bg.replace('50', '500'))} />
          
          <div className="p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    colors.bg,
                    colors.text
                  )}
                >
                  {icon}
                </div>
                
                {/* Title & Type */}
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate pr-2">
                    {title}
                  </h3>
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('mt-1', colors.border, colors.text)}
                  >
                    {recordTypeInfo.name}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare?.(record);
                      }}
                      className="h-8 w-8"
                    >
                      <Share2 size={16} className="text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share with doctor</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(record);
                      }}
                      className="h-8 w-8"
                    >
                      <Edit size={16} className="text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit record</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(record);
                      }}
                      className="h-8 w-8 hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete record</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center gap-4 text-xs text-slate-400">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(record);
                }}
                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              >
                <Share2 size={14} />
                Share
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

// Compact version for lists
interface RecordListItemProps {
  record: MedicalRecord;
  onShare?: (record: MedicalRecord) => void;
  onView?: (record: MedicalRecord) => void;
}

export function RecordListItem({ record, onShare, onView }: RecordListItemProps) {
  const recordTypeInfo = RECORD_TYPES[record.recordType as RecordType];
  const colors = colorMap[recordTypeInfo.color] || colorMap.slate;
  const icon = iconMap[recordTypeInfo.icon] || <FileText size={16} />;
  const { title } = getRecordDisplayData(record);

  return (
    <TooltipProvider>
      <div
        onClick={() => onView?.(record)}
        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            colors.bg,
            colors.text
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-slate-900 truncate">{title}</h4>
          <p className="text-sm text-slate-500">{recordTypeInfo.name}</p>
        </div>

        {/* Time */}
        <span className="shrink-0 text-xs text-slate-400">
          {formatRelativeTime(record.createdAt)}
        </span>

        {/* Share Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.(record);
              }}
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Share2 size={16} className="text-slate-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share with doctor</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
