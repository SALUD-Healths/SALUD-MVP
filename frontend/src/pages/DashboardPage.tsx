import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  TrendingUp,
  Shield,
  Share2,
  Clock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader, EmptyState } from '@/components/layout';
import { RecordCard, CreateRecordModal, ShareRecordModal } from '@/components/records';
import { useRecordsStore } from '@/store';
import type { MedicalRecord } from '@/types/records';

export function DashboardPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  const records = useRecordsStore((state) => state.records);
  const accessGrants = useRecordsStore((state) => state.accessGrants);
  
  // Compute active grants with useMemo to avoid infinite loops
  const activeGrants = useMemo(() => {
    const now = new Date();
    return accessGrants.filter(
      (grant) => !grant.isRevoked && grant.expiresAt > now
    );
  }, [accessGrants]);

  const recentRecords = records.slice(0, 4);

  const handleShare = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShareModalOpen(true);
  };

  // Stats
  const stats = [
    {
      label: 'Total Records',
      value: records.length,
      icon: <FileText size={20} />,
      color: 'primary',
      change: '+2 this month',
    },
    {
      label: 'Active Shares',
      value: activeGrants.length,
      icon: <Share2 size={20} />,
      color: 'success',
      change: 'All secure',
    },
    {
      label: 'Privacy Score',
      value: '100%',
      icon: <Shield size={20} />,
      color: 'aleo',
      change: 'Fully encrypted',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back"
        description="Manage your private health records on Aleo"
        action={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} />
            New Record
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="gradient" className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <TrendingUp size={12} className="text-success-500" />
                      {stat.change}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${stat.color}-100 text-${stat.color}-600`}
                  >
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} className="text-primary-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-4 transition-all hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-200">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Add New Record</p>
                <p className="text-sm text-slate-500">Create encrypted health record</p>
              </div>
            </button>

            <button className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-4 transition-all hover:border-success-300 hover:bg-success-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100 text-success-600 transition-colors group-hover:bg-success-200">
                <Share2 size={24} />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Share with Doctor</p>
                <p className="text-sm text-slate-500">Generate temporary access</p>
              </div>
            </button>

            <button className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-4 transition-all hover:border-aleo-300 hover:bg-aleo-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-aleo-100 text-aleo-600 transition-colors group-hover:bg-aleo-200">
                <Clock size={24} />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">View Access History</p>
                <p className="text-sm text-slate-500">Check who accessed records</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Records</h2>
          <Button variant="ghost" size="sm" className="text-primary-600">
            View All
            <ArrowRight size={16} />
          </Button>
        </div>

        {recentRecords.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                record={record}
                index={index}
                onShare={handleShare}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={32} />}
            title="No records yet"
            description="Start by creating your first encrypted medical record"
            action={
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus size={16} />
                Create Record
              </Button>
            }
          />
        )}
      </div>

      {/* Blockchain Status */}
      <Card variant="outlined" className="border-aleo-200 bg-gradient-to-r from-aleo-50 to-primary-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-aleo-100">
                <Shield size={24} className="text-aleo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Powered by Aleo</p>
                <p className="text-sm text-slate-500">
                  Your records are encrypted and stored on the Aleo blockchain
                </p>
              </div>
            </div>
            <Badge variant="aleo" className="hidden sm:flex">
              Testnet Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateRecordModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <ShareRecordModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        record={selectedRecord}
      />
    </div>
  );
}
