import { useState } from 'react';
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
  Plus,
  Shield,
  AlertCircle,
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RECORD_TYPES, type RecordType } from '@/types/records';
import { useAleo } from '@/hooks/useAleo';
import { NotificationModal } from '@/components/ui/notification-modal';

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
const colorMap: Record<string, { bg: string; text: string; border: string; selected: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200', selected: 'ring-primary-500' },
  success: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200', selected: 'ring-success-500' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-200', selected: 'ring-warning-500' },
  aleo: { bg: 'bg-aleo-50', text: 'text-aleo-600', border: 'border-aleo-200', selected: 'ring-aleo-500' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-200', selected: 'ring-danger-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', selected: 'ring-cyan-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', selected: 'ring-violet-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', selected: 'ring-pink-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', selected: 'ring-teal-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', selected: 'ring-slate-500' },
};

interface CreateRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateRecordModal({ open, onOpenChange, onSuccess }: CreateRecordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const { createRecord, transaction, clearTransaction, isConnected } = useAleo();

  const handleTypeSelect = (type: RecordType) => {
    setSelectedType(type);
  };

  const handleNext = () => {
    if (selectedType) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[CreateRecordModal] handleSubmit called');
    console.log('[CreateRecordModal] selectedType:', selectedType);
    console.log('[CreateRecordModal] title:', title);
    console.log('[CreateRecordModal] description:', description);

    if (!validate() || !selectedType) {
      console.log('[CreateRecordModal] Validation failed or no selected type');
      return;
    }

    console.log('[CreateRecordModal] Validation passed');
    console.log('[CreateRecordModal] Checking wallet connection...');

    if (!isConnected()) {
      console.log('[CreateRecordModal] Wallet not connected');
      setErrors({ title: 'Please connect your wallet first' });
      return;
    }

    console.log('[CreateRecordModal] Wallet connected, creating record...');

    // Create the medical record content (will be encrypted by useAleo)
    const recordContent = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      type: RECORD_TYPES[selectedType].name,
      createdAt: new Date().toISOString(),
    });

    // Call the real Aleo transition via the hook
    const result = await createRecord(
      title.trim(),
      description.trim(),
      selectedType,
      recordContent,
      true // makeDiscoverable
    );

    console.log('[CreateRecordModal] createRecord result:', result);

    if (result) {
      // Success - close modal after showing success state for 2 seconds
      setTimeout(() => {
        handleClose();
        onSuccess?.();
        // Show success notification
        setNotificationType('success');
        setNotificationTitle('Record Created!');
        setNotificationMessage('Medical record created successfully and submitted to the Aleo blockchain!');
        setNotificationOpen(true);
      }, 2000);
    } else {
      // Error - close modal and show error notification after 2 seconds
      setTimeout(() => {
        handleClose();
        // Show error notification
        setNotificationType('error');
        setNotificationTitle('Creation Failed!');
        setNotificationMessage(transaction.error || 'Failed to create medical record. Please try again.');
        setNotificationOpen(true);
      }, 2000);
    }
  };

  const handleClose = () => {
    if (transaction.isProcessing) return; // Don't close while processing
    setStep(1);
    setSelectedType(null);
    setTitle('');
    setDescription('');
    setErrors({});
    clearTransaction();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <Plus size={18} className="text-primary-600" />
            </div>
            Create Medical Record
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select the type of medical record you want to create.'
              : 'Enter the details for your medical record.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
              step >= 1
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-400'
            )}
          >
            1
          </div>
          <div
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              step >= 2 ? 'bg-primary-600' : 'bg-slate-200'
            )}
          />
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
              step >= 2
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-400'
            )}
          >
            2
          </div>
        </div>

        {/* Step 1: Type Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 md:grid-cols-5">
              {(Object.entries(RECORD_TYPES) as [string, typeof RECORD_TYPES[RecordType]][]).map(
                ([key, type]) => {
                  const recordType = Number(key) as RecordType;
                  const colors = colorMap[type.color] || colorMap.slate;
                  const icon = iconMap[type.icon] || <FileText size={20} />;
                  const isSelected = selectedType === recordType;

                  return (
                    <button
                      key={key}
                      onClick={() => handleTypeSelect(recordType)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                        isSelected
                          ? `${colors.border} ${colors.bg} ring-2 ${colors.selected}`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {icon}
                      </div>
                      <span className="text-center text-xs font-medium text-slate-700">
                        {type.name}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Record Details */}
        {step === 2 && selectedType && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 py-4"
          >
            {/* Selected Type Badge */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  colorMap[RECORD_TYPES[selectedType].color]?.bg,
                  colorMap[RECORD_TYPES[selectedType].color]?.text
                )}
              >
                {iconMap[RECORD_TYPES[selectedType].icon]}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {RECORD_TYPES[selectedType].name}
                </p>
                <p className="text-xs text-slate-500">
                  {RECORD_TYPES[selectedType].description}
                </p>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Record Title <span className="text-danger-500">*</span>
              </label>
              <Input
                placeholder="e.g., Annual Physical Examination"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors({ ...errors, title: undefined });
                }}
                error={!!errors.title}
              />
              {errors.title && (
                <p className="flex items-center gap-1 text-xs text-danger-600">
                  <AlertCircle size={12} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Description <span className="text-danger-500">*</span>
              </label>
              <Textarea
                placeholder="Describe the contents of this medical record..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description)
                    setErrors({ ...errors, description: undefined });
                }}
                error={!!errors.description}
                rows={4}
              />
              {errors.description && (
                <p className="flex items-center gap-1 text-xs text-danger-600">
                  <AlertCircle size={12} />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Encryption Notice */}
            <div className="flex items-start gap-3 rounded-lg bg-success-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 text-success-600" />
              <div>
                <p className="text-sm font-medium text-success-900">
                  End-to-End Encrypted
                </p>
                <p className="text-xs text-success-700">
                  Your medical data will be encrypted before being stored on the Aleo
                  blockchain. Only you can decrypt and view this record.
                </p>
              </div>
            </div>

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
                    {transaction.status === 'pending' && 'Processing Transaction'}
                    {transaction.status === 'confirmed' && 'Record Created!'}
                    {transaction.status === 'failed' && 'Transaction Failed'}
                  </p>
                  <p className={cn(
                    'text-xs',
                    transaction.status === 'pending' && 'text-aleo-700',
                    transaction.status === 'confirmed' && 'text-success-700',
                    transaction.status === 'failed' && 'text-danger-700'
                  )}>
                    {transaction.message || transaction.error || 'Please wait...'}
                  </p>
                  {transaction.transactionId && (
                    <p className="mt-1 text-xs text-slate-500">
                      TX: {transaction.transactionId.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!selectedType}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={transaction.isProcessing}>
                Back
              </Button>
              <Button
                onClick={() => {
                  console.log('[CreateRecordModal] Create Record button clicked');
                  handleSubmit();
                }}
                loading={transaction.isProcessing}
                disabled={transaction.isProcessing}
              >
                {transaction.isProcessing
                  ? 'Processing...'
                  : transaction.status === 'confirmed'
                    ? 'Created!'
                    : 'Create Record'
                }
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Success/Error Notification Modal */}
      <NotificationModal
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        type={notificationType}
        title={notificationTitle}
        message={notificationMessage}
      />
    </Dialog>
  );
}
