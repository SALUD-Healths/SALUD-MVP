import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Copy,
  Check,
  Share2,
  Timer,
  Shield,
  AlertTriangle,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { copyToClipboard, blocksToTime, truncateAddress, cn } from '@/lib/utils';
import { DURATION_OPTIONS, RECORD_TYPES, type MedicalRecord, type QRCodeData, type RecordType } from '@/types/records';
import { useUserStore } from '@/store';
import { useAleo } from '@/hooks/useAleo';
import type { AleoMedicalRecord } from '@/lib/aleo/types';

interface ShareRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MedicalRecord | null;
}

export function ShareRecordModal({ open, onOpenChange, record }: ShareRecordModalProps) {
  const [step, setStep] = useState<'configure' | 'share'>('configure');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [durationBlocks, setDurationBlocks] = useState(5760); // 24 hours default
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [addressError, setAddressError] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const { grantAccess, transaction, clearTransaction, isConnected } = useAleo();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('configure');
      setDoctorAddress('');
      setDurationBlocks(5760);
      setAccessToken(null);
      setExpiresAt(null);
      setCopied(false);
      setAddressError(null);
      clearTransaction();
    }
  }, [open, clearTransaction]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleGenerate = async () => {
    if (!record || !user) return;

    // Validate doctor address if provided
    if (doctorAddress && !doctorAddress.startsWith('aleo1')) {
      setAddressError('Invalid Aleo address format');
      return;
    }

    if (!isConnected()) {
      setAddressError('Please connect your wallet first');
      return;
    }

    setAddressError(null);

    // For the grant_access transition, we need to construct the AleoMedicalRecord
    // In a real app, this would come from the encrypted record stored locally
    const aleoRecord: AleoMedicalRecord = {
      owner: user.address,
      record_id: record.recordId,
      data_hash: record.dataHash,
      data_part1: '0field', // These would come from the actual encrypted data
      data_part2: '0field',
      data_part3: '0field',
      data_part4: '0field',
      record_type: record.recordType,
      created_at: 0,
      version: 1,
      _nonce: '0field',
    };

    // Use a placeholder address if none provided (for "any doctor" access)
    // In production, you might want to handle this differently
    const targetDoctor = doctorAddress || 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';

    const result = await grantAccess(aleoRecord.record_id, targetDoctor, durationBlocks);

    if (result) {
      // Generate a placeholder access token
      const token = `${aleoRecord.record_id}_${targetDoctor}_${Date.now()}`;
      const expires = new Date(Date.now() + durationBlocks * 1000);

      setAccessToken(token);
      setExpiresAt(expires);
      setStep('share');
    }
  };

  const handleCopyToken = async () => {
    if (!accessToken) return;
    const success = await copyToClipboard(accessToken);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `salud-qr-${record?.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const qrData: QRCodeData | null = accessToken && record && user
    ? {
        version: 1,
        accessToken,
        recordId: record.recordId,
        patientAddress: user.address,
        expiresAt: expiresAt?.getTime() || 0,
      }
    : null;

  if (!record) return null;

  const recordType = RECORD_TYPES[record.recordType as RecordType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <Share2 size={18} className="text-primary-600" />
            </div>
            Share Medical Record
          </DialogTitle>
          <DialogDescription>
            {step === 'configure'
              ? 'Configure access settings for sharing this record.'
              : 'Share this QR code with your healthcare provider.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'configure' && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              {/* Record Info */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{record.title}</p>
                <p className="text-xs text-slate-500">{recordType.name}</p>
              </div>

              {/* Doctor Address (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Doctor's Aleo Address
                  <span className="ml-1 text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <Input
                  placeholder="aleo1..."
                  value={doctorAddress}
                  onChange={(e) => setDoctorAddress(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Leave empty to allow any doctor to access with the QR code.
                </p>
              </div>

              {/* Duration Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Access Duration
                </label>
                <Select
                  value={durationBlocks.toString()}
                  onValueChange={(value) => setDurationBlocks(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.blocks} value={option.blocks.toString()}>
                        <div className="flex items-center gap-2">
                          <Timer size={14} className="text-slate-400" />
                          <span>{option.label}</span>
                          <span className="text-xs text-slate-400">
                            - {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 rounded-lg bg-warning-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-warning-600" />
                <div>
                  <p className="text-sm font-medium text-warning-900">
                    Share Responsibly
                  </p>
                  <p className="text-xs text-warning-700">
                    Only share this QR code with trusted healthcare providers.
                    Access will automatically expire after {blocksToTime(durationBlocks)}.
                  </p>
                </div>
              </div>

              {/* Address Error */}
              {addressError && (
                <div className="flex items-start gap-3 rounded-lg bg-danger-50 p-4">
                  <XCircle className="mt-0.5 h-5 w-5 text-danger-600" />
                  <p className="text-sm text-danger-700">{addressError}</p>
                </div>
              )}

              {/* Transaction Status */}
              {transaction.status && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-4',
                    transaction.status === 'pending' && 'bg-aleo-50',
                    transaction.status === 'confirmed' && 'bg-success-50',
                    transaction.status === 'failed' && 'bg-danger-50'
                  )}
                >
                  {transaction.status === 'pending' && (
                    <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-aleo-600" />
                  )}
                  {transaction.status === 'confirmed' && (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-600" />
                  )}
                  {transaction.status === 'failed' && (
                    <XCircle className="mt-0.5 h-5 w-5 text-danger-600" />
                  )}
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      transaction.status === 'pending' && 'text-aleo-900',
                      transaction.status === 'confirmed' && 'text-success-900',
                      transaction.status === 'failed' && 'text-danger-900'
                    )}>
                      {transaction.message || 'Processing...'}
                    </p>
                    {transaction.error && (
                      <p className="text-xs text-danger-700">{transaction.error}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                className="w-full"
                onClick={handleGenerate}
                loading={transaction.isProcessing}
                disabled={transaction.isProcessing}
              >
                {transaction.isProcessing 
                  ? (transaction.message || 'Generating Access...') 
                  : 'Generate QR Code'
                }
              </Button>
            </motion.div>
          )}

          {step === 'share' && qrData && (
            <motion.div
              key="share"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={JSON.stringify(qrData)}
                    size={200}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: '/logo-icon.svg',
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                {/* Countdown */}
                <div className="mt-4 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Expires in:</span>
                  <Badge
                    variant={countdown === 'Expired' ? 'danger' : 'success'}
                    className="font-mono"
                  >
                    {countdown}
                  </Badge>
                </div>
              </div>

              {/* Access Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Access Token
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={accessToken || ''}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                  >
                    {copied ? (
                      <Check size={16} className="text-success-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
              </div>

              {/* Record Info */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Record</span>
                  <span className="text-sm font-medium text-slate-900">
                    {record.title}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Duration</span>
                  <span className="text-sm font-medium text-slate-900">
                    {blocksToTime(durationBlocks)}
                  </span>
                </div>
                {doctorAddress && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Restricted to</span>
                    <span className="text-sm font-mono text-slate-900">
                      {truncateAddress(doctorAddress)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadQR}
                >
                  <Download size={16} />
                  Download QR
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('configure')}
                >
                  <RefreshCw size={16} />
                  New Code
                </Button>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Shield size={14} className="text-success-500" />
                Secured by Aleo blockchain
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
