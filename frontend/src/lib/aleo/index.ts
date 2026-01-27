/**
 * Aleo Integration Module for Salud
 * 
 * Exports all Aleo-related utilities, types, and clients.
 */

// Client
export { SaludAleoClient, saludClient } from './client';

// Demo storage (for demo mode)
export { demoStorage, DemoStorageService, type DemoAccessGrant, type DemoTransaction } from './demo-storage';

// Encryption utilities
export {
  generateNonce,
  generateFieldNonce,
  encryptData,
  decryptData,
  hashData,
  hashToField,
  splitDataToFields,
  fieldsToData,
  prepareRecordData,
} from './encryption';

// Configuration
export {
  ALEO_NETWORK,
  ALEO_API_URL,
  PROGRAM_ID,
  BLOCK_TIME_SECONDS,
  BLOCKS_PER_HOUR,
  BLOCKS_PER_DAY,
  MIN_ACCESS_DURATION_BLOCKS,
  MAX_ACCESS_DURATION_BLOCKS,
  DEFAULT_ACCESS_DURATION_BLOCKS,
  DEFAULT_FEE,
  RECORD_TYPE_GENERAL,
  RECORD_TYPE_LAB,
  RECORD_TYPE_PRESCRIPTION,
  RECORD_TYPE_IMAGING,
  RECORD_TYPE_VACCINATION,
  RECORD_TYPE_SURGICAL,
  RECORD_TYPE_MENTAL,
  RECORD_TYPE_DENTAL,
  RECORD_TYPE_VISION,
  RECORD_TYPE_OTHER,
  DEMO_MODE,
  getTransactionUrl,
  getAddressUrl,
  getProgramUrl,
} from './config';

// Types
export type {
  AleoAccount,
  AleoMedicalRecord,
  AleoAccessGrant,
  AleoRecordMetadata,
  TransactionStatus,
  AleoTransaction,
  CreateRecordInput,
  GrantAccessInput,
  VerifyAccessInput,
  RevokeAccessInput,
  CreateRecordOutput,
  GrantAccessOutput,
  VerifyAccessOutput,
  ExecutionResult,
  WalletStatus,
  WalletState,
  EncryptedRecordData,
  ShareQRData,
} from './types';
