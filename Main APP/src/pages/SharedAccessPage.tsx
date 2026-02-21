import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Clock,
  User,
  FileText,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRecordsStore, useUserStore } from '@/store';
import { formatDateTime, truncateAddress } from '@/lib/utils';
import { RECORD_TYPES } from '@/types/records';
import type { AccessGrant } from '@/types/records';

export function SharedAccessPage() {
  const user = useUserStore((state) => state.user);
  const accessGrants = useRecordsStore((state) => state.accessGrants);
  const records = useRecordsStore((state) => state.records);
  const revokeAccessGrant = useRecordsStore((state) => state.revokeAccessGrant);
  
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  // Helper to safely convert to Date
  const safeDate = (date: Date | string | number | undefined): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    try {
      return new Date(date);
    } catch {
      return new Date();
    }
  };

  // Filter grants for current user and check expiration
  const userGrants = accessGrants
    .filter((grant) => grant.patientAddress === user?.address)
    .map((grant) => ({
      ...grant,
      isExpired: safeDate(grant.expiresAt) < new Date(),
    }))
    .sort((a, b) => safeDate(b.grantedAt).getTime() - safeDate(a.grantedAt).getTime());

  const activeGrants = userGrants.filter((g) => !g.isRevoked && !g.isExpired);
  const expiredGrants = userGrants.filter((g) => g.isExpired);
  const revokedGrants = userGrants.filter((g) => g.isRevoked);

  const handleRevoke = async (accessToken: string) => {
    setRevokingToken(accessToken);
    
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    revokeAccessGrant(accessToken);
    setRevokingToken(null);
  };

  const getRecordTitle = (recordId: string) => {
    const record = records.find((r) => r.recordId === recordId || r.id === recordId);
    return record?.title || 'Unknown Record';
  };

  const getRecordType = (recordId: string) => {
    const record = records.find((r) => r.recordId === recordId || r.id === recordId);
    return record ? RECORD_TYPES[record.recordType] : null;
  };

  const renderGrantCard = (grant: AccessGrant, showRevoke: boolean = false) => {
    const recordType = getRecordType(grant.recordId);
    const isExpired = safeDate(grant.expiresAt) < new Date();

    return (
      <motion.div
        key={grant.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              recordType ? `bg-${recordType.color}-100` : 'bg-slate-100'
            }`}>
              <FileText className={`${
                recordType ? `text-${recordType.color}-600` : 'text-slate-600'
              }`} size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {getRecordTitle(grant.recordId)}
              </h3>
              {recordType && (
                <Badge variant={recordType.color as any} size="sm" className="mt-1">
                  {recordType.name}
                </Badge>
              )}
              
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-slate-400" />
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-mono text-xs text-slate-700">
                    {grant.doctorAddress ? truncateAddress(grant.doctorAddress, 8, 6) : 'Any doctor'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-slate-500">
                    {isExpired ? 'Expired:' : 'Expires:'}
                  </span>
                  <span className="text-slate-700">
                    {formatDateTime(safeDate(grant.expiresAt))}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Shield size={14} className="text-slate-400" />
                  <span className="text-slate-500">Granted:</span>
                  <span className="text-slate-700">
                    {formatDateTime(safeDate(grant.grantedAt))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {grant.isRevoked && (
              <Badge variant="danger" size="sm">
                <XCircle size={12} className="mr-1" />
                Revoked
              </Badge>
            )}
            {isExpired && !grant.isRevoked && (
              <Badge variant="warning" size="sm">
                <Clock size={12} className="mr-1" />
                Expired
              </Badge>
            )}
            {!grant.isRevoked && !isExpired && (
              <Badge variant="success" size="sm">
                <CheckCircle2 size={12} className="mr-1" />
                Active
              </Badge>
            )}
            
            {showRevoke && !grant.isRevoked && !isExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(grant.accessToken)}
                disabled={revokingToken === grant.accessToken}
              >
                {revokingToken === grant.accessToken ? 'Revoking...' : 'Revoke Access'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-900">Connect Your Wallet</p>
          <p className="mt-1 text-sm text-slate-500">
            Connect your wallet to view shared access records
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shared Access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage access to your medical records
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100">
                <CheckCircle2 className="text-success-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Shares</p>
                <p className="text-2xl font-bold text-slate-900">{activeGrants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Clock className="text-slate-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Expired</p>
                <p className="text-2xl font-bold text-slate-900">{expiredGrants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-100">
                <XCircle className="text-danger-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Revoked</p>
                <p className="text-2xl font-bold text-slate-900">{revokedGrants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Grants */}
      {activeGrants.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Active Access</h2>
          <div className="space-y-3">
            {activeGrants.map((grant) => renderGrantCard(grant, true))}
          </div>
        </div>
      )}

      {/* Expired Grants */}
      {expiredGrants.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Expired Access</h2>
          <div className="space-y-3">
            {expiredGrants.map((grant) => renderGrantCard(grant))}
          </div>
        </div>
      )}

      {/* Revoked Grants */}
      {revokedGrants.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Revoked Access</h2>
          <div className="space-y-3">
            {revokedGrants.map((grant) => renderGrantCard(grant))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userGrants.length === 0 && (
        <Card variant="elevated" padding="lg">
          <CardContent className="py-12 text-center">
            <Share2 size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No Shared Records</h3>
            <p className="mt-2 text-sm text-slate-500">
              When you share records with doctors, they'll appear here.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">How to share records</p>
                <p className="mt-1 text-xs text-slate-500">
                  Go to your records, select a record, and click "Share" to generate a QR code for your doctor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
