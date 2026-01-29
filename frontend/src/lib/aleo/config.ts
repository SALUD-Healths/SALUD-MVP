/**
 * Aleo Configuration for Salud Health Records
 */

// Network configuration
export const ALEO_NETWORK = 'testnet';
export const ALEO_API_URL = 'https://api.explorer.provable.com/v1';

// Program configuration
export const PROGRAM_ID = 'salud_health_records_v2.aleo';

// Block timing (Aleo produces ~1 block per 15 seconds)
export const BLOCK_TIME_SECONDS = 15;
export const BLOCKS_PER_HOUR = 240;
export const BLOCKS_PER_DAY = 5760;

// Access duration limits (from contract)
export const MIN_ACCESS_DURATION_BLOCKS = 240; // ~1 hour
export const MAX_ACCESS_DURATION_BLOCKS = 40320; // ~7 days
export const DEFAULT_ACCESS_DURATION_BLOCKS = 5760; // ~24 hours

// Transaction fee (in microcredits)
export const DEFAULT_FEE = 100_000; // 0.1 credits

// Record types
export const RECORD_TYPE_GENERAL = 1;
export const RECORD_TYPE_LAB = 2;
export const RECORD_TYPE_PRESCRIPTION = 3;
export const RECORD_TYPE_IMAGING = 4;
export const RECORD_TYPE_VACCINATION = 5;
export const RECORD_TYPE_SURGICAL = 6;
export const RECORD_TYPE_MENTAL = 7;
export const RECORD_TYPE_DENTAL = 8;
export const RECORD_TYPE_VISION = 9;
export const RECORD_TYPE_OTHER = 10;

// Development wallet (for testing only - never use in production)
export const DEV_PRIVATE_KEY = import.meta.env.VITE_ALEO_PRIVATE_KEY || '';
export const DEV_VIEW_KEY = import.meta.env.VITE_ALEO_VIEW_KEY || '';
export const DEV_ADDRESS = import.meta.env.VITE_ALEO_ADDRESS || '';

// Feature flags
export const USE_LOCAL_EXECUTION = true; // Execute locally before broadcasting
export const ENABLE_RECORD_CACHING = true;
export const DEMO_MODE = false; // Using backend API (real blockchain transactions)

// API endpoints
export const getTransactionUrl = (txId: string) =>
  `https://explorer.aleo.org/transaction/${txId}`;

export const getAddressUrl = (address: string) =>
  `https://explorer.aleo.org/address/${address}`;

export const getProgramUrl = () =>
  `https://explorer.aleo.org/program/${PROGRAM_ID}`;
