/**
 * useAleo - React hook for Aleo blockchain interactions via Backend API
 *
 * This hook communicates with the Node.js backend which handles Aleo SDK operations
 */

import { useState, useCallback } from 'react';
import { prepareRecordData, generateFieldNonce } from '@/lib/aleo/encryption';
import { useUserStore, useRecordsStore } from '@/store';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import * as api from '@/lib/api/client';
import type { TransactionStatus } from '@/lib/aleo/types';
import type { RecordType } from '@/types/records';

// Session storage key
const SESSION_STORAGE_KEY = 'salud_session_id';
const PRIVATE_KEY_STORAGE_KEY = 'salud_private_key';

// Transaction state for UI feedback
interface TransactionState {
  isProcessing: boolean;
  status: TransactionStatus | null;
  message: string | null;
  transactionId: string | null;
  error: string | null;
}

const initialTransactionState: TransactionState = {
  isProcessing: false,
  status: null,
  message: null,
  transactionId: null,
  error: null,
};

export function useAleo() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [privateKey, setPrivateKeyState] = useState<string | null>(
    () => sessionStorage.getItem(PRIVATE_KEY_STORAGE_KEY)
  );
  const [account, setAccount] = useState<{
    address: string;
    viewKey: string;
  } | null>(null);
  const [transaction, setTransaction] = useState<TransactionState>(initialTransactionState);

  const { connect: connectUser, disconnect: disconnectUser, setBalance } = useUserStore();
  const { addRecord, createAccessGrant, setLoading, setError, setFetchingFromChain } = useRecordsStore();

  // Get wallet adapter state (not used for transactions)
  const { connected: walletConnected, publicKey: walletPublicKey } = useWallet();

  /**
   * Connect wallet with private key via backend
   */
  const connect = useCallback(async (userPrivateKey: string, userName?: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      console.log('[Frontend] Connecting to backend API...');
      const result = await api.connectWallet(userPrivateKey);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to connect');
      }

      const { sessionId: newSessionId, address, viewKey } = result.data;

      // Store session and private key
      sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
      sessionStorage.setItem(PRIVATE_KEY_STORAGE_KEY, userPrivateKey);
      setSessionId(newSessionId);
      setPrivateKeyState(userPrivateKey);
      setAccount({ address, viewKey });

      // Update user store with name
      connectUser(address, viewKey, userName);

      // Fetch balance
      const balanceResult = await api.getBalance(newSessionId);
      if (balanceResult.success && balanceResult.data) {
        setBalance(balanceResult.data.balance);
      }

      // Fetch records from blockchain (non-blocking - runs in background)
      // This allows the user to start using the app immediately
      setTimeout(async () => {
        try {
          setFetchingFromChain(true);
          console.log('[Frontend] Fetching records from blockchain (background)...');
          const recordsResult = await api.fetchRecords(newSessionId);
          if (recordsResult.success && recordsResult.data) {
            const { records: fetchedRecords } = recordsResult.data;
            
            // Add fetched records to store (avoid duplicates)
            fetchedRecords.forEach((record) => {
              // Check if record already exists in store
              const existingRecord = useRecordsStore.getState().records.find(
                (r) => r.recordId === record.recordId
              );
              
              if (!existingRecord) {
                // Add record to store (createdAt/updatedAt will be set by addRecord)
                addRecord({
                  recordId: record.recordId,
                  title: record.title,
                  description: record.description,
                  recordType: record.recordType as RecordType,
                  data: record.data,
                  dataHash: record.dataHash,
                  isEncrypted: record.isEncrypted,
                  ownerAddress: record.ownerAddress,
                });
                console.log('[Frontend] Added record from chain:', record.recordId);
              }
            });
            
            console.log('[Frontend] Fetched', fetchedRecords.length, 'records from blockchain');
          }
        } catch (fetchError) {
          console.warn('[Frontend] Background record fetch failed:', fetchError);
          // Don't throw - this is background fetch, user can still use the app
        } finally {
          setFetchingFromChain(false);
        }
      }, 100); // Small delay to let UI update first

      console.log('[Frontend] Connected successfully:', address);
      return true;
    } catch (error) {
      console.error('[Frontend] Connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [connectUser, setBalance, setError]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
    setSessionId(null);
    setPrivateKeyState(null);
    setAccount(null);
    disconnectUser();
    // Note: We don't clear records here anymore - they persist per wallet address
  }, [disconnectUser]);

  /**
   * Generate a new account
   */
  const generateAccount = useCallback(async () => {
    const result = await api.generateAccount();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to generate account');
    }

    return {
      privateKey: result.data.privateKey,
      viewKey: result.data.viewKey,
      address: result.data.address,
    };
  }, []);

  /**
   * Check if connected
   */
  const isConnected = useCallback((): boolean => {
    const userStore = useUserStore.getState();
    const sessionFromStorage = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const privateKeyFromStorage = sessionStorage.getItem(PRIVATE_KEY_STORAGE_KEY);

    console.log('[useAleo] isConnected check:');
    console.log('  - sessionId (state):', sessionId);
    console.log('  - sessionId (storage):', sessionFromStorage);
    console.log('  - privateKey (state):', !!privateKey);
    console.log('  - privateKey (storage):', !!privateKeyFromStorage);
    console.log('  - userStore.isConnected:', userStore.user?.isConnected);
    console.log('  - walletConnected:', walletConnected);

    return !!sessionId || !!sessionFromStorage || (userStore.user?.isConnected ?? false) || (walletConnected && walletPublicKey !== null);
  }, [sessionId, privateKey, walletConnected, walletPublicKey]);

  /**
   * Clear transaction state
   */
  const clearTransaction = useCallback(() => {
    setTransaction(initialTransactionState);
  }, []);

  /**
   * Create a new medical record
   */
  const createRecord = useCallback(
    async (
      title: string,
      description: string,
      recordType: RecordType,
      content: string,
      makeDiscoverable?: boolean
    ): Promise<boolean> => {
      console.log('[useAleo] createRecord called');
      console.log('[useAleo] sessionId (state):', sessionId);
      console.log('[useAleo] privateKey exists (state):', !!privateKey);

      // Check both state and sessionStorage
      const currentSessionId = sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);
      const currentPrivateKey = privateKey || sessionStorage.getItem(PRIVATE_KEY_STORAGE_KEY);

      console.log('[useAleo] sessionId (final):', currentSessionId);
      console.log('[useAleo] privateKey exists (final):', !!currentPrivateKey);

      if (!currentSessionId || !currentPrivateKey) {
        console.log('[useAleo] No session or private key');
        setError('Please connect your wallet first');
        return false;
      }

      setTransaction({
        isProcessing: true,
        status: 'pending',
        message: 'Preparing record data...',
        transactionId: null,
        error: null,
      });
      setLoading(true);

      try {
        console.log('[useAleo] Encrypting data...');
        // Encrypt data on frontend
        const encryptionKey = currentPrivateKey;
        const nonce = generateFieldNonce();
        const { fields, dataHash, encryptedData } = await prepareRecordData(content, encryptionKey);

        console.log('[useAleo] Data encrypted, updating transaction status...');
        setTransaction({
          isProcessing: true,
          status: 'broadcasting',
          message: 'Generating proofs and submitting to blockchain (30-60s)...',
          transactionId: null,
          error: null,
        });

        console.log('[useAleo] Calling backend API...');
        // Call backend API to create record
        const result = await api.createRecord(currentSessionId, {
          dataPart1: fields[0],
          dataPart2: fields[1],
          dataPart3: fields[2],
          dataPart4: fields[3],
          recordType,
          dataHash,
          nonce,
          makeDiscoverable: makeDiscoverable ?? true,
        });

        console.log('[useAleo] Backend API response:', result);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create record');
        }

        console.log('[useAleo] Adding record to local store...');
        // Add to local store with owner address
        const userStore = useUserStore.getState();
        addRecord({
          recordId: result.data.recordId,
          title,
          description,
          recordType,
          data: JSON.stringify(encryptedData),
          dataHash,
          isEncrypted: true,
          ownerAddress: userStore.user?.address || account?.address || '',
        });

        console.log('[useAleo] Record created successfully!');
        setTransaction({
          isProcessing: false,
          status: 'confirmed',
          message: 'Record created successfully!',
          transactionId: result.data.transactionId || null,
          error: null,
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[useAleo] Error creating record:', errorMessage);
        setTransaction({
          isProcessing: false,
          status: 'failed',
          message: null,
          transactionId: null,
          error: errorMessage,
        });
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, privateKey, addRecord, setError, setLoading]
  );

  /**
   * Grant access to a doctor
   */
  const grantAccess = useCallback(
    async (
      recordId: string,
      doctorAddress: string,
      durationBlocks: number,
      dataHash: string
    ): Promise<boolean> => {
      // Check both state and sessionStorage
      const currentSessionId = sessionId || sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (!currentSessionId) {
        setError('Please connect your wallet first');
        return false;
      }

      setTransaction({
        isProcessing: true,
        status: 'pending',
        message: 'Granting access...',
        transactionId: null,
        error: null,
      });
      setLoading(true);

      try {
        const nonce = generateFieldNonce();
        const result = await api.grantAccess(currentSessionId, {
          recordId,
          doctorAddress,
          accessDuration: durationBlocks,
          nonce,
          dataHash,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to grant access');
        }

        // Add to local store
        const expirationDate = new Date(Date.now() + durationBlocks * 1000);
        createAccessGrant({
          accessToken: result.data.grantId,
          recordId,
          patientAddress: account?.address || '',
          doctorAddress,
          grantedAt: new Date(),
          expiresAt: expirationDate,
          durationBlocks,
          isRevoked: false,
        });

        setTransaction({
          isProcessing: false,
          status: 'confirmed',
          message: 'Access granted successfully!',
          transactionId: result.data.transactionId || null,
          error: null,
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setTransaction({
          isProcessing: false,
          status: 'failed',
          message: null,
          transactionId: null,
          error: errorMessage,
        });
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, createAccessGrant, setError, setLoading]
  );

  /**
   * Verify access (placeholder - implement when backend supports it)
   */
  const verifyAccess = useCallback(async (_accessToken: string, _doctorAddress: string, _recordId: string) => {
    console.warn('verifyAccess not yet implemented in backend');
    return false;
  }, []);

  /**
   * Check if access token is valid (placeholder)
   */
  const checkAccessTokenValid = useCallback(async (_accessToken: string) => {
    console.warn('checkAccessTokenValid not yet implemented in backend');
    return false;
  }, []);

  /**
   * Get access grant from chain (placeholder)
   */
  const getAccessGrantFromChain = useCallback(async (_grantId: string) => {
    console.warn('getAccessGrantFromChain not yet implemented in backend');
    return null;
  }, []);

  return {
    // State
    isConnecting,
    account,
    transaction,

    // Actions
    connect,
    disconnect,
    generateAccount,
    isConnected,
    createRecord,
    grantAccess,
    verifyAccess,
    checkAccessTokenValid,
    getAccessGrantFromChain,
    clearTransaction,
  };
}
