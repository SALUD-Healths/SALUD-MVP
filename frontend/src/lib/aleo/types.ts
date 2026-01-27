/**
 * Aleo Type Definitions for Salud
 */

// Account types
export interface AleoAccount {
  privateKey: string;
  viewKey: string;
  address: string;
}

// Record types (matching Leo contract)
export interface AleoMedicalRecord {
  owner: string;
  record_id: string; // field
  data_hash: string; // field
  data_part1: string; // field
  data_part2: string; // field
  data_part3: string; // field
  data_part4: string; // field
  record_type: number; // u8
  created_at: number; // u32
  version: number; // u8
  _nonce: string; // internal nonce
}

export interface AleoAccessGrant {
  patient: string;
  doctor: string;
  record_id: string; // field
  access_token: string; // field
  granted_at: number; // u32
  expires_at: number; // u32
  is_revoked: boolean;
}

export interface AleoRecordMetadata {
  patient: string;
  record_id: string; // field
  record_type: number; // u8
  created_at: number; // u32
  is_active: boolean;
}

// Transaction types
export type TransactionStatus = 'pending' | 'broadcasting' | 'confirmed' | 'failed';

export interface AleoTransaction {
  id: string;
  type: string;
  status: TransactionStatus;
  txHash?: string;
  blockHeight?: number;
  fee?: number;
  error?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

// Input types for transitions
export interface CreateRecordInput {
  dataPart1: string;
  dataPart2: string;
  dataPart3: string;
  dataPart4: string;
  recordType: number;
  dataHash: string;
  nonce: string;
  makeDiscoverable: boolean;
}

export interface GrantAccessInput {
  medicalRecord: AleoMedicalRecord;
  doctorAddress: string;
  durationBlocks: number;
  nonce: string;
}

export interface VerifyAccessInput {
  accessToken: string;
  doctorAddress: string;
  recordId: string;
}

export interface RevokeAccessInput {
  accessToken: string;
}

// Output types
export interface CreateRecordOutput {
  record: AleoMedicalRecord;
  transactionId: string;
}

export interface GrantAccessOutput {
  record: AleoMedicalRecord;
  accessToken: string;
  transactionId: string;
}

export interface VerifyAccessOutput {
  isValid: boolean;
  grant?: AleoAccessGrant;
  transactionId: string;
}

// Execution result
export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  transactionId?: string;
  error?: string;
}

// Wallet connection status
export type WalletStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface WalletState {
  status: WalletStatus;
  account: AleoAccount | null;
  balance: number;
  error: string | null;
}

// Encrypted data structure
export interface EncryptedRecordData {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

// QR code data for sharing
export interface ShareQRData {
  version: number;
  accessToken: string;
  recordId: string;
  patientAddress: string;
  expiresAt: number;
  programId: string;
}
