import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Calendar,
  Clock,
  Shield,
  User,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, truncateAddress } from '@/lib/utils';
import { RECORD_TYPES, type MedicalRecord } from '@/types/records';
import { ShareRecordModal } from './ShareRecordModal';
import { useRecordsStore } from '@/store';

interface RecordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MedicalRecord | null;
}

export function RecordDetailModal({ open, onOpenChange, record }: RecordDetailModalProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteRecord = useRecordsStore((state) => state.deleteRecord);

  if (!record) return null;

  const recordType = RECORD_TYPES[record.recordType];

  const handleDelete = () => {
    deleteRecord(record.id);
    onOpenChange(false);
    setShowDeleteConfirm(false);
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${recordType.color}-100`}>
                  <FileText className={`text-${recordType.color}-600`} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{record.title}</h2>
                  <Badge variant={recordType.color as any} size="sm" className="mt-1">
                    {recordType.name}
                  </Badge>
                </div>
              </DialogTitle>
            </div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-4"
          >
            {/* Description */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Description</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">
                {record.description}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Created Date */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <Calendar className="text-slate-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Created</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTime(record.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <Clock className="text-slate-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Last Updated</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTime(record.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Address */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <User className="text-slate-600" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Owner Address</p>
                    <p className="text-sm font-mono font-semibold text-slate-900 truncate">
                      {truncateAddress(record.ownerAddress, 12, 8)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Encryption Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100">
                    <Shield className="text-success-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Encryption</p>
                    <p className="text-sm font-semibold text-success-900">
                      {record.isEncrypted ? 'Encrypted' : 'Not Encrypted'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Record ID */}
            {record.recordId && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-aleo-100">
                    <Shield className="text-aleo-600" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">On-Chain Record ID</p>
                    <p className="mt-1 break-all text-xs font-mono text-slate-700">
                      {record.recordId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-primary-900">
                    Privacy Protected
                  </p>
                  <p className="mt-1 text-xs text-primary-700">
                    This record is secured using Aleo's zero-knowledge encryption.
                    Only you and authorized healthcare providers can access this information.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleShare}
                className="flex-1"
                variant="default"
              >
                <Share2 size={16} />
                Share with Doctor
              </Button>

              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Trash2 size={16} />
                  Delete Record
                </Button>
              ) : (
                <div className="flex flex-1 gap-2">
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <ShareRecordModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        record={record}
      />
    </>
  );
}
