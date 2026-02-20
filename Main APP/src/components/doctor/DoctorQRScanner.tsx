import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Shield,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, truncateAddress } from '@/lib/utils';
import { RECORD_TYPES, type QRCodeData, type RecordType } from '@/types/records';
import { useUserStore } from '@/store';

type ScanStatus = 'idle' | 'scanning' | 'verifying' | 'success' | 'error';

interface ScannedRecord {
  title: string;
  description: string;
  recordType: RecordType;
  patientAddress: string;
  expiresAt: Date;
}

export function DoctorQRScanner() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [recordData, setRecordData] = useState<ScannedRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const user = useUserStore((state) => state.user);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setScanStatus('scanning');

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        onScanSuccess,
        onScanFailure
      );

      setCameraPermission(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setCameraPermission(false);
      setError('Unable to access camera. Please grant camera permissions.');
      setScanStatus('idle');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanStatus('idle');
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();
    setScanStatus('verifying');

    try {
      const data: QRCodeData = JSON.parse(decodedText);
      
      if (!data.accessToken || !data.recordId || !data.patientAddress) {
        throw new Error('Invalid QR code format');
      }

      if (data.expiresAt < Date.now()) {
        throw new Error('This access token has expired');
      }

      setScannedData(data);

      if (!user) {
        throw new Error('Please connect your wallet to verify access');
      }

      const mockRecord: ScannedRecord = {
        title: 'Medical Record',
        description: 'Access has been verified on the Aleo blockchain. In production, the encrypted medical data would be decrypted and displayed here.',
        recordType: 1,
        patientAddress: data.patientAddress,
        expiresAt: new Date(data.expiresAt),
      };

      setRecordData(mockRecord);
      setScanStatus('success');
    } catch (err) {
      console.error('Scan processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
      setScanStatus('error');
    }
  };

  const onScanFailure = (_error: string) => {
  };

  const handleReset = () => {
    setScannedData(null);
    setRecordData(null);
    setError(null);
    setScanStatus('idle');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card variant="elevated" padding="lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Camera className="text-primary-600" />
            Scan Patient QR Code
          </CardTitle>
          <p className="text-sm text-slate-500">
            Scan the QR code shared by the patient to access their medical record
          </p>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {scanStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-6 py-8"
              >
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-100">
                  <Camera size={48} className="text-slate-400" />
                </div>
                
                {cameraPermission === false && (
                  <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                    <CameraOff size={16} />
                    Camera access denied
                  </div>
                )}

                {!user && (
                  <div className="flex items-center gap-2 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700">
                    <AlertTriangle size={16} />
                    Connect your wallet to verify access
                  </div>
                )}

                <Button size="lg" onClick={startScanner} disabled={!user}>
                  <Camera size={20} />
                  Start Scanning
                </Button>

                <p className="text-center text-xs text-slate-400">
                  Position the QR code within the scanner frame
                </p>
              </motion.div>
            )}

            {scanStatus === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4"
              >
                <div
                  id="qr-reader"
                  ref={containerRef}
                  className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl"
                />

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                  Scanning for QR code...
                </div>

                <Button variant="outline" onClick={stopScanner}>
                  <CameraOff size={16} />
                  Stop Scanning
                </Button>
              </motion.div>
            )}

            {scanStatus === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-12"
              >
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100">
                    <Shield size={40} className="text-primary-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
                    <Loader2 size={20} className="animate-spin text-primary-600" />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="font-medium text-slate-900">Verifying Access</p>
                  <p className="text-sm text-slate-500">
                    Checking blockchain for valid access grant...
                  </p>
                </div>
              </motion.div>
            )}

            {scanStatus === 'success' && recordData && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 rounded-lg bg-success-50 p-4">
                  <CheckCircle2 className="text-success-600" />
                  <span className="font-medium text-success-900">
                    Access Verified Successfully
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                      <FileText className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {recordData.title}
                      </h3>
                      <Badge variant="primary" size="sm" className="mt-1">
                        {RECORD_TYPES[recordData.recordType].name}
                      </Badge>
                    </div>
                  </div>

                  <p className="mb-4 text-sm text-slate-600">
                    {recordData.description}
                  </p>

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <User size={14} />
                        Patient
                      </span>
                      <span className="font-mono text-xs text-slate-700">
                        {truncateAddress(recordData.patientAddress, 8, 6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} />
                        Access Expires
                      </span>
                      <span className="text-slate-700">
                        {formatDateTime(recordData.expiresAt)}
                      </span>
                    </div>
                    {scannedData && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <Shield size={14} />
                          Access Token
                        </span>
                        <span className="font-mono text-xs text-slate-700">
                          {truncateAddress(scannedData.accessToken, 8, 6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Privacy Protected
                    </p>
                    <p className="text-xs text-slate-500">
                      This record was securely shared via the Aleo blockchain.
                      Access will automatically expire at the specified time.
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleReset}>
                  <RefreshCw size={16} />
                  Scan Another Code
                </Button>
              </motion.div>
            )}

            {scanStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-danger-100">
                  <XCircle size={40} className="text-danger-600" />
                </div>
                
                <div className="text-center">
                  <p className="font-medium text-slate-900">Verification Failed</p>
                  <p className="mt-1 text-sm text-slate-500">{error}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw size={16} />
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-900">How it works</h3>
        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Patient shares QR code',
              description: 'The patient generates a temporary access QR code for their record',
            },
            {
              step: 2,
              title: 'Scan the QR code',
              description: 'Use your camera to scan the QR code shown by the patient',
            },
            {
              step: 3,
              title: 'Access verified on blockchain',
              description: 'The Aleo blockchain verifies you have valid, non-expired access',
            },
            {
              step: 4,
              title: 'View decrypted record',
              description: 'The medical record is decrypted and displayed securely',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
