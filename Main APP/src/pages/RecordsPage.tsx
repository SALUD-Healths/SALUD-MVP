import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  FileText,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader, EmptyState } from '@/components/layout';
import { RecordCard, RecordListItem, CreateRecordModal, ShareRecordModal, RecordDetailModal } from '@/components/records';
import { useRecordsStore, useUserStore } from '@/store';
import { RECORD_TYPES, type MedicalRecord, type RecordType } from '@/types/records';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

export function RecordsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<RecordType | 'all'>('all');

  const { user } = useUserStore();
  const records = useRecordsStore((state) => state.records);

  // If not connected, show connect wallet state
  if (!user?.isConnected) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Records"
          description="Connect your wallet to view your medical records"
        />
        <EmptyState
          icon={<Wallet size={48} className="text-slate-300" />}
          title="Wallet Not Connected"
          description="Please connect your Aleo wallet to access your encrypted medical records securely."
        />
      </div>
    );
  }

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      searchQuery === '' ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType =
      selectedType === 'all' || record.recordType === selectedType;

    return matchesSearch && matchesType;
  });

  const handleShare = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShareModalOpen(true);
  };

  const handleView = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  // Count records by type
  const recordCounts = records.reduce((acc, record) => {
    acc[record.recordType] = (acc[record.recordType] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Records"
        description={`${records.length} encrypted medical record${records.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} />
            New Record
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        {/* View Toggle & Filter */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType('all')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            selectedType === 'all'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          All Records
          <Badge variant="outline" size="sm" className="ml-2">
            {records.length}
          </Badge>
        </button>
        
        {(Object.entries(RECORD_TYPES) as [string, typeof RECORD_TYPES[RecordType]][]).map(
          ([key, type]) => {
            const recordType = Number(key) as RecordType;
            const count = recordCounts[recordType] || 0;
            if (count === 0) return null;

            return (
              <button
                key={key}
                onClick={() => setSelectedType(recordType)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedType === recordType
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {type.name}
                <Badge variant="outline" size="sm" className="ml-2">
                  {count}
                </Badge>
              </button>
            );
          }
        )}
      </div>

      {/* Records Display */}
      {filteredRecords.length > 0 ? (
        viewMode === 'grid' ? (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                record={record}
                index={index}
                onShare={handleShare}
                onView={handleView}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordListItem
                key={record.id}
                record={record}
                onShare={handleShare}
                onView={handleView}
              />
            ))}
          </motion.div>
        )
      ) : (
        <EmptyState
          icon={<FileText size={32} />}
          title={searchQuery ? 'No matching records' : 'No records yet'}
          description={
            searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start by creating your first encrypted medical record'
          }
          action={
            !searchQuery && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus size={16} />
                Create Record
              </Button>
            )
          }
        />
      )}

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

      <RecordDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={selectedRecord}
      />
    </div>
  );
}
