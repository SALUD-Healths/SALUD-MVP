/**
 * Demo Storage Service for Salud Health Records
 * 
 * Provides localStorage-based storage for demo mode when the smart contract
 * is not deployed. This allows full UI testing without blockchain transactions.
 */

import type { AleoMedicalRecord } from './types';

// Storage keys
const STORAGE_PREFIX = 'salud_demo_';
const KEYS = {
  RECORDS: `${STORAGE_PREFIX}records`,
  ACCESS_GRANTS: `${STORAGE_PREFIX}access_grants`,
  ACCESS_TOKENS: `${STORAGE_PREFIX}access_tokens`,
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  BLOCK_HEIGHT: `${STORAGE_PREFIX}block_height`,
} as const;

// Types for demo storage
export interface DemoAccessGrant {
  accessToken: string;
  patient: string;
  doctor: string;
  recordId: string;
  grantedAt: number;
  expiresAt: number;
  isRevoked: boolean;
  encryptedData: string; // The actual encrypted record data
  encryptionKey: string; // Key for decryption (shared via QR)
}

export interface DemoTransaction {
  id: string;
  type: 'create_record' | 'grant_access' | 'verify_access' | 'revoke_access';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Demo Storage Service
 */
export class DemoStorageService {
  private simulatedBlockHeight: number;

  constructor() {
    // Initialize simulated block height (roughly based on current time)
    const storedHeight = localStorage.getItem(KEYS.BLOCK_HEIGHT);
    this.simulatedBlockHeight = storedHeight 
      ? parseInt(storedHeight, 10) 
      : Math.floor(Date.now() / 15000); // ~1 block per 15 seconds
  }

  // ==========================================================================
  // BLOCK HEIGHT SIMULATION
  // ==========================================================================

  /**
   * Get current simulated block height
   */
  getCurrentBlockHeight(): number {
    // Increment based on time passed since last check
    const now = Math.floor(Date.now() / 15000);
    if (now > this.simulatedBlockHeight) {
      this.simulatedBlockHeight = now;
      localStorage.setItem(KEYS.BLOCK_HEIGHT, String(this.simulatedBlockHeight));
    }
    return this.simulatedBlockHeight;
  }

  // ==========================================================================
  // MEDICAL RECORDS
  // ==========================================================================

  /**
   * Store a medical record
   */
  storeRecord(record: AleoMedicalRecord): void {
    const records = this.getRecords();
    records[record.record_id] = record;
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  }

  /**
   * Get all records for an owner
   */
  getRecordsForOwner(owner: string): AleoMedicalRecord[] {
    const records = this.getRecords();
    return Object.values(records).filter((r) => r.owner === owner);
  }

  /**
   * Get a specific record by ID
   */
  getRecord(recordId: string): AleoMedicalRecord | null {
    const records = this.getRecords();
    return records[recordId] || null;
  }

  /**
   * Get all records
   */
  private getRecords(): Record<string, AleoMedicalRecord> {
    const stored = localStorage.getItem(KEYS.RECORDS);
    return stored ? JSON.parse(stored) : {};
  }

  // ==========================================================================
  // ACCESS GRANTS
  // ==========================================================================

  /**
   * Store an access grant
   */
  storeAccessGrant(grant: DemoAccessGrant): void {
    const grants = this.getAccessGrants();
    grants[grant.accessToken] = grant;
    localStorage.setItem(KEYS.ACCESS_GRANTS, JSON.stringify(grants));

    // Also store in access_tokens mapping (for quick lookup)
    const tokens = this.getAccessTokens();
    tokens[grant.accessToken] = true;
    localStorage.setItem(KEYS.ACCESS_TOKENS, JSON.stringify(tokens));
  }

  /**
   * Get an access grant by token
   */
  getAccessGrant(accessToken: string): DemoAccessGrant | null {
    const grants = this.getAccessGrants();
    return grants[accessToken] || null;
  }

  /**
   * Check if access token is valid (not expired, not revoked)
   */
  isAccessTokenValid(accessToken: string): boolean {
    const grant = this.getAccessGrant(accessToken);
    if (!grant) return false;
    
    const currentBlock = this.getCurrentBlockHeight();
    return !grant.isRevoked && grant.expiresAt > currentBlock;
  }

  /**
   * Revoke an access grant
   */
  revokeAccessGrant(accessToken: string): boolean {
    const grants = this.getAccessGrants();
    if (!grants[accessToken]) return false;
    
    grants[accessToken].isRevoked = true;
    localStorage.setItem(KEYS.ACCESS_GRANTS, JSON.stringify(grants));
    
    // Update access_tokens mapping
    const tokens = this.getAccessTokens();
    tokens[accessToken] = false;
    localStorage.setItem(KEYS.ACCESS_TOKENS, JSON.stringify(tokens));
    
    return true;
  }

  /**
   * Get all access grants for a patient
   */
  getAccessGrantsForPatient(patient: string): DemoAccessGrant[] {
    const grants = this.getAccessGrants();
    return Object.values(grants).filter((g) => g.patient === patient);
  }

  /**
   * Get all access grants for a doctor
   */
  getAccessGrantsForDoctor(doctor: string): DemoAccessGrant[] {
    const grants = this.getAccessGrants();
    const currentBlock = this.getCurrentBlockHeight();
    return Object.values(grants).filter(
      (g) => g.doctor === doctor && !g.isRevoked && g.expiresAt > currentBlock
    );
  }

  /**
   * Get all access grants
   */
  private getAccessGrants(): Record<string, DemoAccessGrant> {
    const stored = localStorage.getItem(KEYS.ACCESS_GRANTS);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Get access tokens mapping
   */
  private getAccessTokens(): Record<string, boolean> {
    const stored = localStorage.getItem(KEYS.ACCESS_TOKENS);
    return stored ? JSON.parse(stored) : {};
  }

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  /**
   * Store a transaction
   */
  storeTransaction(tx: DemoTransaction): void {
    const transactions = this.getTransactions();
    transactions[tx.id] = tx;
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  /**
   * Update transaction status
   */
  updateTransactionStatus(txId: string, status: DemoTransaction['status']): void {
    const transactions = this.getTransactions();
    if (transactions[txId]) {
      transactions[txId].status = status;
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  }

  /**
   * Get a transaction by ID
   */
  getTransaction(txId: string): DemoTransaction | null {
    const transactions = this.getTransactions();
    return transactions[txId] || null;
  }

  /**
   * Get all transactions
   */
  private getTransactions(): Record<string, DemoTransaction> {
    const stored = localStorage.getItem(KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : {};
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Generate a mock transaction ID
   */
  generateTransactionId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'at1'; // Aleo transaction prefix
    for (let i = 0; i < 59; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a mock field value (for record IDs, access tokens, etc.)
   */
  generateFieldValue(): string {
    // Generate a random 64-character hex string as a field representation
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('') + 'field';
  }

  /**
   * Compute a deterministic record ID from data hash and nonce
   */
  computeRecordId(dataHash: string, nonce: string): string {
    // Simple hash combination for demo purposes
    const combined = dataHash + nonce;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + 'field';
  }

  /**
   * Compute a deterministic access token
   */
  computeAccessToken(recordId: string, doctor: string, nonce: string): string {
    const combined = recordId + doctor + nonce;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + 'field';
  }

  /**
   * Clear all demo data
   */
  clearAll(): void {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Get storage statistics (for debugging)
   */
  getStats(): {
    recordCount: number;
    accessGrantCount: number;
    transactionCount: number;
    currentBlockHeight: number;
  } {
    return {
      recordCount: Object.keys(this.getRecords()).length,
      accessGrantCount: Object.keys(this.getAccessGrants()).length,
      transactionCount: Object.keys(this.getTransactions()).length,
      currentBlockHeight: this.getCurrentBlockHeight(),
    };
  }
}

// Export singleton instance
export const demoStorage = new DemoStorageService();
