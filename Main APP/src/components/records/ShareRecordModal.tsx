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
import { copyToClipboard, blocksToTime, truncateAddress } from '@/lib/utils';
import { DURATION_OPTIONS, RECORD_TYPES, type MedicalRecord, type QRCodeData, type RecordType } from '@/types/records';
import { useUserStore, useRecordsStore } from '@/store';
import { encryptWithPublicKey, generateViewKey, derivePublicKey } from '@/lib/crypto-utils';

interface ShareRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MedicalRecord | null;
}

export function ShareRecordModal({ open, onOpenChange, record }: ShareRecordModalProps) {
  const [step, setStep] = useState<'configure' | 'share'>('configure');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [durationBlocks, setDurationBlocks] = useState(5760);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [encryptedViewKey, setEncryptedViewKey] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const createAccessGrant = useRecordsStore((state) => state.createAccessGrant);

  useEffect(() => {
    if (!open) {
      setStep('configure');
      setDoctorAddress('');
      setDurationBlocks(5760);
      setAccessToken(null);
      setExpiresAt(null);
      setCopied(false);
      setAddressError(null);
      setEncryptedViewKey(null);
    }
  }, [open]);

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

    if (doctorAddress && !doctorAddress.startsWith('aleo1')) {
      setAddressError('Invalid Aleo address format');
      return;
    }

    setAddressError(null);

    // Generate access token (simplified - in production would use blockchain)
    const token = `token_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    
    // Calculate expiration time
    const now = new Date();
    const expirationTime = new Date(now.getTime() + (durationBlocks * 15 * 1000)); // 15 sec per block
    
    // Generate or get view key for this record
    const viewKey = user.viewKey || generateViewKey(user.address);
    
    // Encrypt view key with doctor's public key (or use patient's if no specific doctor)
    const doctorPublicKey = doctorAddress ? derivePublicKey(doctorAddress) : derivePublicKey(user.address);
    const encViewKey = encryptWithPublicKey(viewKey, doctorPublicKey);
    
    // Create access grant in store with encrypted view key
    createAccessGrant({
      accessToken: token,
      recordId: record.recordId || record.id,
      patientAddress: user.address,
      doctorAddress: doctorAddress || '',
      grantedAt: now,
      expiresAt: expirationTime,
      durationBlocks,
      isRevoked: false,
    });

    setAccessToken(token);
    setExpiresAt(expirationTime);
    setEncryptedViewKey(encViewKey);
    setStep('share');
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

  const qrData: QRCodeData | null = accessToken && record && user && encryptedViewKey
    ? {
        version: 1,
        accessToken,
        recordId: record.recordId,
        patientAddress: user.address,
        expiresAt: expiresAt?.getTime() || 0,
        encryptedViewKey,
        encryptedData: record.data,
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
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{record.title}</p>
                <p className="text-xs text-slate-500">{recordType.name}</p>
              </div>

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

              {addressError && (
                <div className="flex items-start gap-3 rounded-lg bg-danger-50 p-4">
                  <XCircle className="mt-0.5 h-5 w-5 text-danger-600" />
                  <p className="text-sm text-danger-700">{addressError}</p>
                </div>
              )}

              <Button className="w-full" onClick={handleGenerate}>
                Generate QR Code
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

              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Record</span>
                  <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={record.title}>
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
                    <span className="text-sm font-mono text-slate-900 truncate max-w-[150px]" title={doctorAddress}>
                      {truncateAddress(doctorAddress)}
                    </span>
                  </div>
                )}
              </div>

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
