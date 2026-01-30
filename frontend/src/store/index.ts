import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MedicalRecord, AccessGrant, User, RecordType } from '@/types/records';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

interface RecordsState {
  records: MedicalRecord[];
  accessGrants: AccessGrant[];
  isLoading: boolean;
  isFetchingFromChain: boolean;
  error: string | null;
  
  // Actions
  addRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>) => MedicalRecord;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecordById: (id: string) => MedicalRecord | undefined;
  getRecordsByType: (type: RecordType) => MedicalRecord[];
  getRecordsByOwner: (ownerAddress: string) => MedicalRecord[];
  
  // Access grants
  createAccessGrant: (grant: Omit<AccessGrant, 'id' | 'isExpired'>) => AccessGrant;
  revokeAccessGrant: (accessToken: string) => void;
  getActiveGrants: () => AccessGrant[];
  getGrantsByRecordId: (recordId: string) => AccessGrant[];
  
  // State management
  setLoading: (loading: boolean) => void;
  setFetchingFromChain: (fetching: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearRecords: () => void;
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      records: [],
      accessGrants: [],
      isLoading: false,
      isFetchingFromChain: false,
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

      getRecordsByOwner: (ownerAddress: string) => {
        return get().records.filter((record) => record.ownerAddress === ownerAddress);
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id ? { ...record, ...updates, updatedAt: new Date() } : record
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
            grant.accessToken === accessToken ? { ...grant, isRevoked: true } : grant
          ),
        }));
      },
      
      getActiveGrants: () => {
        return get().accessGrants.filter(
          (grant) => !grant.isRevoked && !grant.isExpired
        );
      },
      
      getGrantsByRecordId: (recordId) => {
        return get().accessGrants.filter((grant) => grant.recordId === recordId);
      },

      setLoading: (isLoading) => set({ isLoading }),
      setFetchingFromChain: (isFetchingFromChain) => set({ isFetchingFromChain }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      clearRecords: () => set({ records: [], accessGrants: [] }),
    }),
    {
      name: 'salud-records-storage',
    }
  )
);

// User store
interface UserState {
  user: User | null;
  isConnecting: boolean;

  // Actions
  connect: (address: string, viewKey?: string, name?: string) => void;
  disconnect: () => void;
  setBalance: (balance: number) => void;
  setName: (name: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isConnecting: false,

      connect: (address, viewKey, name) => {
        set({
          user: {
            address,
            name,
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

      setName: (name) => {
        set((state) => ({
          user: state.user ? { ...state.user, name } : null,
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
