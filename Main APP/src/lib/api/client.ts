/**
 * Backend API Client
 *
 * Communicates with the Node.js backend that handles Aleo SDK operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletConnectResponse {
  sessionId: string;
  address: string;
  viewKey: string;
}

export interface WalletGenerateResponse {
  privateKey: string;
  viewKey: string;
  address: string;
}

export interface BalanceResponse {
  balance: number;
}

export interface CreateRecordResponse {
  transactionId: string;
  recordId: string;
}

export interface GrantAccessResponse {
  transactionId: string;
  grantId: string;
}

export interface FetchRecordsResponse {
  records: Array<{
    id: string;
    recordId: string;
    title: string;
    description: string;
    recordType: number;
    data: string;
    dataHash: string;
    createdAt: string;
    updatedAt: string;
    isEncrypted: boolean;
    ownerAddress: string;
  }>;
  count?: number;
  message?: string;
}

/**
 * Connect wallet with private key
 */
export async function connectWallet(privateKey: string): Promise<ApiResponse<WalletConnectResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privateKey }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect wallet'
    };
  }
}

/**
 * Generate a new Aleo account
 */
export async function generateAccount(): Promise<ApiResponse<WalletGenerateResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate account'
    };
  }
}

/**
 * Get wallet balance
 */
export async function getBalance(sessionId: string): Promise<ApiResponse<BalanceResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/balance/${sessionId}`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance'
    };
  }
}

/**
 * Create a medical record
 */
export async function createRecord(
  sessionId: string,
  params: {
    dataPart1: string;
    dataPart2: string;
    dataPart3: string;
    dataPart4: string;
    recordType: number;
    dataHash: string;
    nonce: string;
    makeDiscoverable: boolean;
  }
): Promise<ApiResponse<CreateRecordResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/records/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...params }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create record'
    };
  }
}

/**
 * Grant access to a medical record
 */
export async function grantAccess(
  sessionId: string,
  params: {
    recordId: string;
    doctorAddress: string;
    accessDuration: number;
    nonce: string;
    dataHash: string;
  }
): Promise<ApiResponse<GrantAccessResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/access/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...params }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant access'
    };
  }
}

/**
 * Fetch all medical records for the connected wallet from the blockchain
 */
export async function fetchRecords(sessionId: string): Promise<ApiResponse<FetchRecordsResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/records/fetch/${sessionId}`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch records'
    };
  }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: 'Backend API is not reachable'
    };
  }
}
