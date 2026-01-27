import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MedicalRecord, AccessGrant, User, RecordType } from '@/types/records';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Mock data for development
const mockRecords: MedicalRecord[] = [
  {
    id: generateId(),
    recordId: '123456789field',
    title: 'Annual Physical Examination',
    description: 'Complete health checkup including blood work, vitals, and general assessment.',
    recordType: 1,
    data: 'encrypted_data_placeholder',
    dataHash: 'hash_placeholder',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isEncrypted: true,
  },
  {
    id: generateId(),
    recordId: '987654321field',
    title: 'Blood Test Results',
    description: 'Complete blood count (CBC), metabolic panel, and lipid profile.',
    recordType: 2,
    data: 'encrypted_data_placeholder',
    dataHash: 'hash_placeholder',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    isEncrypted: true,
  },
  {
    id: generateId(),
    recordId: '456789123field',
    title: 'Prescription - Metformin',
    description: 'Diabetes management medication, 500mg twice daily.',
    recordType: 3,
    data: 'encrypted_data_placeholder',
    dataHash: 'hash_placeholder',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    isEncrypted: true,
  },
  {
    id: generateId(),
    recordId: '789123456field',
    title: 'Chest X-Ray',
    description: 'Routine chest X-ray imaging for respiratory assessment.',
    recordType: 4,
    data: 'encrypted_data_placeholder',
    dataHash: 'hash_placeholder',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    isEncrypted: true,
  },
  {
    id: generateId(),
    recordId: '321654987field',
    title: 'COVID-19 Vaccination',
    description: 'Pfizer-BioNTech COVID-19 vaccine, booster dose.',
    recordType: 5,
    data: 'encrypted_data_placeholder',
    dataHash: 'hash_placeholder',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    isEncrypted: true,
  },
];

interface RecordsState {
  records: MedicalRecord[];
  accessGrants: AccessGrant[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>) => MedicalRecord;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecordById: (id: string) => MedicalRecord | undefined;
  getRecordsByType: (type: RecordType) => MedicalRecord[];
  
  // Access grants
  createAccessGrant: (grant: Omit<AccessGrant, 'id' | 'isExpired'>) => AccessGrant;
  revokeAccessGrant: (accessToken: string) => void;
  getActiveGrants: () => AccessGrant[];
  getGrantsByRecordId: (recordId: string) => AccessGrant[];
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      records: mockRecords,
      accessGrants: [],
      isLoading: false,
      error: null,

      addRecord: (record) => {
        const newRecord: MedicalRecord = {
          ...record,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          records: [newRecord, ...state.records],
        }));
        return newRecord;
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id
              ? { ...record, ...updates, updatedAt: new Date() }
              : record
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((record) => record.id !== id),
        }));
      },

      getRecordById: (id) => {
        return get().records.find((record) => record.id === id);
      },

      getRecordsByType: (type) => {
        return get().records.filter((record) => record.recordType === type);
      },

      createAccessGrant: (grant) => {
        const newGrant: AccessGrant = {
          ...grant,
          id: generateId(),
          isExpired: false,
        };
        set((state) => ({
          accessGrants: [newGrant, ...state.accessGrants],
        }));
        return newGrant;
      },

      revokeAccessGrant: (accessToken) => {
        set((state) => ({
          accessGrants: state.accessGrants.map((grant) =>
            grant.accessToken === accessToken
              ? { ...grant, isRevoked: true }
              : grant
          ),
        }));
      },

      getActiveGrants: () => {
        const now = new Date();
        return get().accessGrants.filter(
          (grant) => !grant.isRevoked && grant.expiresAt > now
        );
      },

      getGrantsByRecordId: (recordId) => {
        return get().accessGrants.filter((grant) => grant.recordId === recordId);
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'salud-records-storage',
      partialize: (state) => ({
        records: state.records,
        accessGrants: state.accessGrants,
      }),
    }
  )
);

// User store
interface UserState {
  user: User | null;
  isConnecting: boolean;
  
  // Actions
  connect: (address: string, viewKey?: string) => void;
  disconnect: () => void;
  setBalance: (balance: number) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: {
        address: 'aleo1gl4a57rcxyjvmzcgjscjqe466ecdr7uk4gdp7sf5pctu6tjvv5qs60lw8y',
        isConnected: true,
        balance: 40,
      },
      isConnecting: false,

      connect: (address, viewKey) => {
        set({
          user: {
            address,
            viewKey,
            isConnected: true,
          },
          isConnecting: false,
        });
      },

      disconnect: () => {
        set({ user: null });
      },

      setBalance: (balance) => {
        set((state) => ({
          user: state.user ? { ...state.user, balance } : null,
        }));
      },
    }),
    {
      name: 'salud-user-storage',
    }
  )
);

// UI state store (non-persistent)
interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  selectedRecordId: string | null;
  
  // Actions
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  selectRecord: (recordId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  selectedRecordId: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  selectRecord: (recordId) => set({ selectedRecordId: recordId }),
}));
