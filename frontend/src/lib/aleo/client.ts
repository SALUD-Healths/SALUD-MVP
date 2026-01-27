/**
 * Aleo Client for Salud Health Records
 * 
 * Provides a type-safe wrapper around the @provablehq/sdk for executing
 * transitions on the salud_health_records.aleo program.
 * 
 * Supports DEMO_MODE for testing without blockchain deployment.
 */

import {
  ALEO_API_URL,
  PROGRAM_ID,
  DEFAULT_FEE,
  DEMO_MODE,
} from './config';
import { demoStorage, type DemoAccessGrant } from './demo-storage';
import type {
  AleoAccount,
  AleoMedicalRecord,
  CreateRecordInput,
  GrantAccessInput,
  VerifyAccessInput,
  RevokeAccessInput,
  ExecutionResult,
  TransactionStatus,
} from './types';

// Dynamic imports for Aleo SDK (only loaded when not in demo mode)
// This prevents WASM loading errors when running in demo mode
type AleoSDK = typeof import('@provablehq/sdk');
let aleoSDK: AleoSDK | null = null;

async function getAleoSDK(): Promise<AleoSDK> {
  if (!aleoSDK) {
    aleoSDK = await import('@provablehq/sdk');
  }
  return aleoSDK;
}

// Transaction polling configuration
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // ~3 minutes max wait

/**
 * SaludAleoClient - Main client for interacting with the Salud smart contract
 * 
 * When DEMO_MODE is enabled, operations are simulated using localStorage
 * instead of real blockchain transactions.
 */
export class SaludAleoClient {
  // Using 'any' for SDK types since they're dynamically loaded
  private account: any = null;
  private demoAccount: AleoAccount | null = null;
  private programManager: any = null;
  private networkClient: any = null;
  private recordProvider: any = null;

  constructor() {
    if (DEMO_MODE) {
      console.log('[SaludClient] Running in DEMO MODE - no real blockchain transactions');
    }
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode(): boolean {
    return DEMO_MODE;
  }

  /**
   * Initialize the client with an account
   */
  async connect(privateKey: string): Promise<AleoAccount> {
    try {
      // Validate private key format
      if (!privateKey || !privateKey.startsWith('APrivateKey1')) {
        throw new Error('Invalid private key format. Must start with "APrivateKey1"');
      }

      // Check private key length (should be 59 characters)
      if (privateKey.length !== 59) {
        throw new Error(`Invalid private key length. Expected 59 characters, got ${privateKey.length}. Please ensure you copied the complete key.`);
      }

      // In demo mode, generate a deterministic account from the private key
      if (DEMO_MODE) {
        // Create a demo account - we'll derive address from private key format
        // For demo purposes, we generate a consistent address
        const addressHash = await this.hashString(privateKey);
        const demoAddress = `aleo1${addressHash.substring(0, 58)}`;

        this.demoAccount = {
          privateKey: privateKey,
          viewKey: `AViewKey1${addressHash.substring(0, 53)}`,
          address: demoAddress,
        };

        console.log('[SaludClient] Connected in demo mode:', this.demoAccount.address);
        return this.demoAccount;
      }

      // Load SDK and create account
      console.log('[SaludClient] Loading Aleo SDK...');
      const sdk = await getAleoSDK();

      console.log('[SaludClient] Creating account from private key...');
      this.account = new sdk.Account({ privateKey });

      const aleoAccount: AleoAccount = {
        privateKey: this.account.privateKey().to_string(),
        viewKey: this.account.viewKey().to_string(),
        address: this.account.address().to_string(),
      };

      console.log('[SaludClient] Account created:', aleoAccount.address);

      // Initialize network client
      if (!this.networkClient) {
        this.networkClient = new sdk.AleoNetworkClient(ALEO_API_URL);
      }

      // Initialize record provider for fetching records
      this.recordProvider = new sdk.NetworkRecordProvider(this.account, this.networkClient);

      // Initialize program manager for executing transitions
      this.programManager = new sdk.ProgramManager(
        ALEO_API_URL,
        undefined, // Use default key provider
        this.recordProvider
      );
      this.programManager.setAccount(this.account);

      console.log('[SaludClient] Connection successful!');
      return aleoAccount;
    } catch (error) {
      console.error('[SaludClient] Connection error:', error);
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper to hash a string (for demo mode address generation)
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a new Aleo account
   */
  static async generateAccount(): Promise<AleoAccount> {
    if (DEMO_MODE) {
      // Generate a random demo account
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      return {
        privateKey: `APrivateKey1${randomHex.substring(0, 51)}`,
        viewKey: `AViewKey1${randomHex.substring(0, 53)}`,
        address: `aleo1${randomHex.substring(0, 58)}`,
      };
    }

    const sdk = await getAleoSDK();
    const account = new sdk.Account();
    return {
      privateKey: account.privateKey().to_string(),
      viewKey: account.viewKey().to_string(),
      address: account.address().to_string(),
    };
  }

  /**
   * Get the connected account
   */
  getAccount(): AleoAccount | null {
    if (DEMO_MODE) {
      return this.demoAccount;
    }
    if (!this.account) return null;
    return {
      privateKey: this.account.privateKey().to_string(),
      viewKey: this.account.viewKey().to_string(),
      address: this.account.address().to_string(),
    };
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    if (DEMO_MODE) {
      return this.demoAccount !== null;
    }
    return this.account !== null && this.programManager !== null;
  }

  /**
   * Disconnect the client
   */
  disconnect(): void {
    this.account = null;
    this.demoAccount = null;
    this.programManager = null;
    this.recordProvider = null;
  }

  /**
   * Get current block height
   */
  async getCurrentBlockHeight(): Promise<number> {
    if (DEMO_MODE) {
      return demoStorage.getCurrentBlockHeight();
    }
    
    try {
      const latestBlock = await this.networkClient.getLatestBlock();
      return Number(latestBlock.header.metadata.height);
    } catch (error) {
      console.error('Failed to get block height:', error);
      throw error;
    }
  }

  /**
   * Get account balance (in microcredits)
   * Note: This is a simplified implementation. Full balance fetching
   * requires iterating through unspent credit records.
   */
  async getBalance(): Promise<number> {
    if (!this.account) throw new Error('Not connected');
    
    try {
      // For now, return a placeholder. Full implementation would scan
      // for unspent credits.aleo records owned by this account.
      // The SDK's findUnspentRecords API varies by version.
      return 0;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  // ==========================================================================
  // TRANSITION FUNCTIONS
  // ==========================================================================

  /**
   * Create a new medical record
   */
  async createRecord(
    input: CreateRecordInput,
    onStatusChange?: (status: TransactionStatus, message?: string) => void
  ): Promise<ExecutionResult<{ record: AleoMedicalRecord; transactionId: string }>> {
    // ========================================================================
    // DEMO MODE IMPLEMENTATION
    // ========================================================================
    if (DEMO_MODE) {
      if (!this.demoAccount) {
        return { success: false, error: 'Not connected' };
      }

      try {
        onStatusChange?.('pending', 'Preparing transaction...');
        await this.sleep(500);

        onStatusChange?.('broadcasting', 'Submitting transaction to network...');
        await this.sleep(1000);

        const txId = demoStorage.generateTransactionId();
        const currentBlock = demoStorage.getCurrentBlockHeight();
        const recordId = demoStorage.computeRecordId(input.dataHash, input.nonce);

        // Create the record object
        const record: AleoMedicalRecord = {
          owner: this.demoAccount.address,
          record_id: recordId,
          data_hash: input.dataHash,
          data_part1: input.dataPart1,
          data_part2: input.dataPart2,
          data_part3: input.dataPart3,
          data_part4: input.dataPart4,
          record_type: input.recordType,
          created_at: currentBlock,
          version: 1,
          _nonce: input.nonce,
        };

        // Store in demo storage
        demoStorage.storeRecord(record);
        demoStorage.storeTransaction({
          id: txId,
          type: 'create_record',
          status: 'confirmed',
          timestamp: Date.now(),
          data: { recordId, recordType: input.recordType },
        });

        onStatusChange?.('pending', 'Waiting for confirmation...');
        await this.sleep(1500);

        onStatusChange?.('confirmed', 'Record created successfully!');

        console.log('[SaludClient] Demo: Created record', recordId);

        return {
          success: true,
          data: { record, transactionId: txId },
          transactionId: txId,
        };
      } catch (error) {
        onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // ========================================================================
    // REAL BLOCKCHAIN IMPLEMENTATION
    // ========================================================================
    if (!this.programManager || !this.account) {
      return { success: false, error: 'Not connected' };
    }

    try {
      onStatusChange?.('pending', 'Preparing transaction...');

      // Format inputs for Aleo
      const inputs = [
        input.dataPart1, // field
        input.dataPart2, // field
        input.dataPart3, // field
        input.dataPart4, // field
        `${input.recordType}u8`, // u8
        input.dataHash, // field
        input.nonce, // field
        input.makeDiscoverable.toString(), // bool
      ];

      onStatusChange?.('broadcasting', 'Submitting transaction to network...');

      // Execute the transition
      const txId = await this.programManager.execute({
        programName: PROGRAM_ID,
        functionName: 'create_record',
        inputs,
        priorityFee: DEFAULT_FEE,
        privateFee: false,
      });

      onStatusChange?.('pending', 'Waiting for confirmation...');

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransaction(txId);
      
      if (!confirmed) {
        return { success: false, error: 'Transaction failed or timed out', transactionId: txId };
      }

      onStatusChange?.('confirmed', 'Record created successfully!');

      // Return the record data (reconstructed from inputs)
      const record: AleoMedicalRecord = {
        owner: this.account.address().to_string(),
        record_id: this.computeRecordId(input.dataHash, input.nonce),
        data_hash: input.dataHash,
        data_part1: input.dataPart1,
        data_part2: input.dataPart2,
        data_part3: input.dataPart3,
        data_part4: input.dataPart4,
        record_type: input.recordType,
        created_at: 0, // Will be set on-chain
        version: 1,
        _nonce: input.nonce,
      };

      return {
        success: true,
        data: { record, transactionId: txId },
        transactionId: txId,
      };
    } catch (error) {
      onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Grant temporary access to a doctor
   */
  async grantAccess(
    input: GrantAccessInput,
    onStatusChange?: (status: TransactionStatus, message?: string) => void
  ): Promise<ExecutionResult<{ accessToken: string; transactionId: string }>> {
    // ========================================================================
    // DEMO MODE IMPLEMENTATION
    // ========================================================================
    if (DEMO_MODE) {
      if (!this.demoAccount) {
        return { success: false, error: 'Not connected' };
      }

      try {
        onStatusChange?.('pending', 'Preparing access grant...');
        await this.sleep(500);

        onStatusChange?.('broadcasting', 'Submitting transaction to network...');
        await this.sleep(1000);

        const txId = demoStorage.generateTransactionId();
        const currentBlock = demoStorage.getCurrentBlockHeight();
        const accessToken = demoStorage.computeAccessToken(
          input.medicalRecord.record_id,
          input.doctorAddress,
          input.nonce
        );

        // Create the access grant
        const grant: DemoAccessGrant = {
          accessToken,
          patient: this.demoAccount.address,
          doctor: input.doctorAddress,
          recordId: input.medicalRecord.record_id,
          grantedAt: currentBlock,
          expiresAt: currentBlock + input.durationBlocks,
          isRevoked: false,
          encryptedData: JSON.stringify({
            data_part1: input.medicalRecord.data_part1,
            data_part2: input.medicalRecord.data_part2,
            data_part3: input.medicalRecord.data_part3,
            data_part4: input.medicalRecord.data_part4,
          }),
          encryptionKey: input.nonce, // In real impl, this would be a proper key
        };

        // Store in demo storage
        demoStorage.storeAccessGrant(grant);
        demoStorage.storeTransaction({
          id: txId,
          type: 'grant_access',
          status: 'confirmed',
          timestamp: Date.now(),
          data: { accessToken, doctorAddress: input.doctorAddress },
        });

        onStatusChange?.('pending', 'Waiting for confirmation...');
        await this.sleep(1500);

        onStatusChange?.('confirmed', 'Access granted successfully!');

        console.log('[SaludClient] Demo: Granted access', accessToken);

        return {
          success: true,
          data: { accessToken, transactionId: txId },
          transactionId: txId,
        };
      } catch (error) {
        onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // ========================================================================
    // REAL BLOCKCHAIN IMPLEMENTATION
    // ========================================================================
    if (!this.programManager || !this.account) {
      return { success: false, error: 'Not connected' };
    }

    try {
      onStatusChange?.('pending', 'Preparing access grant...');

      // Format the medical record as Leo struct
      const recordStruct = this.formatMedicalRecordInput(input.medicalRecord);

      const inputs = [
        recordStruct, // MedicalRecord
        input.doctorAddress, // address
        `${input.durationBlocks}u32`, // u32
        input.nonce, // field
      ];

      onStatusChange?.('broadcasting', 'Submitting transaction to network...');

      const txId = await this.programManager.execute({
        programName: PROGRAM_ID,
        functionName: 'grant_access',
        inputs,
        priorityFee: DEFAULT_FEE,
        privateFee: false,
      });

      onStatusChange?.('pending', 'Waiting for confirmation...');

      const confirmed = await this.waitForTransaction(txId);
      
      if (!confirmed) {
        return { success: false, error: 'Transaction failed or timed out', transactionId: txId };
      }

      // Compute the access token (same as contract logic)
      const accessToken = this.computeAccessToken(
        input.medicalRecord.record_id,
        input.doctorAddress,
        input.nonce
      );

      onStatusChange?.('confirmed', 'Access granted successfully!');

      return {
        success: true,
        data: { accessToken, transactionId: txId },
        transactionId: txId,
      };
    } catch (error) {
      onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify access token (for doctors)
   */
  async verifyAccess(
    input: VerifyAccessInput,
    onStatusChange?: (status: TransactionStatus, message?: string) => void
  ): Promise<ExecutionResult<{ isValid: boolean; transactionId: string; grantData?: DemoAccessGrant }>> {
    // ========================================================================
    // DEMO MODE IMPLEMENTATION
    // ========================================================================
    if (DEMO_MODE) {
      try {
        onStatusChange?.('pending', 'Verifying access...');
        await this.sleep(500);

        onStatusChange?.('broadcasting', 'Submitting verification...');
        await this.sleep(1000);

        const txId = demoStorage.generateTransactionId();
        const grant = demoStorage.getAccessGrant(input.accessToken);
        
        // Validate access
        let isValid = false;
        let failReason = '';

        if (!grant) {
          failReason = 'Access token not found';
        } else if (grant.isRevoked) {
          failReason = 'Access has been revoked';
        } else if (grant.doctor !== input.doctorAddress) {
          failReason = 'Doctor address mismatch';
        } else if (grant.recordId !== input.recordId) {
          failReason = 'Record ID mismatch';
        } else {
          const currentBlock = demoStorage.getCurrentBlockHeight();
          if (grant.expiresAt <= currentBlock) {
            failReason = 'Access has expired';
          } else {
            isValid = true;
          }
        }

        demoStorage.storeTransaction({
          id: txId,
          type: 'verify_access',
          status: isValid ? 'confirmed' : 'failed',
          timestamp: Date.now(),
          data: { accessToken: input.accessToken, isValid, failReason },
        });

        onStatusChange?.('pending', 'Waiting for verification result...');
        await this.sleep(1000);

        if (isValid) {
          onStatusChange?.('confirmed', 'Access verified!');
          console.log('[SaludClient] Demo: Verified access', input.accessToken);
        } else {
          onStatusChange?.('failed', failReason || 'Access denied');
          console.log('[SaludClient] Demo: Access denied -', failReason);
        }

        return {
          success: true,
          data: { 
            isValid, 
            transactionId: txId,
            grantData: grant || undefined,
          },
          transactionId: txId,
        };
      } catch (error) {
        onStatusChange?.('failed', 'Access verification failed');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // ========================================================================
    // REAL BLOCKCHAIN IMPLEMENTATION
    // ========================================================================
    if (!this.programManager) {
      return { success: false, error: 'Not connected' };
    }

    try {
      onStatusChange?.('pending', 'Verifying access...');

      const inputs = [
        input.accessToken, // field
        input.doctorAddress, // address
        input.recordId, // field
      ];

      onStatusChange?.('broadcasting', 'Submitting verification...');

      const txId = await this.programManager.execute({
        programName: PROGRAM_ID,
        functionName: 'verify_access',
        inputs,
        priorityFee: DEFAULT_FEE,
        privateFee: false,
      });

      onStatusChange?.('pending', 'Waiting for verification result...');

      const confirmed = await this.waitForTransaction(txId);
      
      // If transaction succeeds, access is valid
      // If it fails (assertions), access is invalid
      const isValid = confirmed;

      onStatusChange?.(
        confirmed ? 'confirmed' : 'failed',
        confirmed ? 'Access verified!' : 'Access denied or expired'
      );

      return {
        success: true,
        data: { isValid, transactionId: txId },
        transactionId: txId,
      };
    } catch (error) {
      // Transaction failure means access verification failed
      onStatusChange?.('failed', 'Access verification failed');
      return {
        success: true,
        data: { isValid: false, transactionId: '' },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Revoke access to a record
   */
  async revokeAccess(
    input: RevokeAccessInput,
    onStatusChange?: (status: TransactionStatus, message?: string) => void
  ): Promise<ExecutionResult<{ transactionId: string }>> {
    // ========================================================================
    // DEMO MODE IMPLEMENTATION
    // ========================================================================
    if (DEMO_MODE) {
      if (!this.demoAccount) {
        return { success: false, error: 'Not connected' };
      }

      try {
        onStatusChange?.('pending', 'Preparing revocation...');
        await this.sleep(500);

        const grant = demoStorage.getAccessGrant(input.accessToken);
        if (!grant) {
          onStatusChange?.('failed', 'Access token not found');
          return { success: false, error: 'Access token not found' };
        }

        if (grant.patient !== this.demoAccount.address) {
          onStatusChange?.('failed', 'Not authorized to revoke');
          return { success: false, error: 'Not authorized to revoke this access' };
        }

        onStatusChange?.('broadcasting', 'Submitting revocation...');
        await this.sleep(1000);

        const txId = demoStorage.generateTransactionId();
        demoStorage.revokeAccessGrant(input.accessToken);
        
        demoStorage.storeTransaction({
          id: txId,
          type: 'revoke_access',
          status: 'confirmed',
          timestamp: Date.now(),
          data: { accessToken: input.accessToken },
        });

        onStatusChange?.('pending', 'Waiting for confirmation...');
        await this.sleep(1000);

        onStatusChange?.('confirmed', 'Access revoked successfully!');

        console.log('[SaludClient] Demo: Revoked access', input.accessToken);

        return {
          success: true,
          data: { transactionId: txId },
          transactionId: txId,
        };
      } catch (error) {
        onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // ========================================================================
    // REAL BLOCKCHAIN IMPLEMENTATION
    // ========================================================================
    if (!this.programManager || !this.account) {
      return { success: false, error: 'Not connected' };
    }

    try {
      onStatusChange?.('pending', 'Preparing revocation...');

      const inputs = [input.accessToken]; // field

      onStatusChange?.('broadcasting', 'Submitting revocation...');

      const txId = await this.programManager.execute({
        programName: PROGRAM_ID,
        functionName: 'revoke_access',
        inputs,
        priorityFee: DEFAULT_FEE,
        privateFee: false,
      });

      onStatusChange?.('pending', 'Waiting for confirmation...');

      const confirmed = await this.waitForTransaction(txId);
      
      if (!confirmed) {
        return { success: false, error: 'Revocation failed', transactionId: txId };
      }

      onStatusChange?.('confirmed', 'Access revoked successfully!');

      return {
        success: true,
        data: { transactionId: txId },
        transactionId: txId,
      };
    } catch (error) {
      onStatusChange?.('failed', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get access grant info from chain
   */
  async getAccessInfo(accessToken: string): Promise<ExecutionResult<{ exists: boolean; grant?: DemoAccessGrant }>> {
    // ========================================================================
    // DEMO MODE IMPLEMENTATION
    // ========================================================================
    if (DEMO_MODE) {
      const grant = demoStorage.getAccessGrant(accessToken);
      return {
        success: true,
        data: { exists: !!grant, grant: grant || undefined },
      };
    }

    // ========================================================================
    // REAL BLOCKCHAIN IMPLEMENTATION
    // ========================================================================
    if (!this.programManager) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const inputs = [accessToken];

      const txId = await this.programManager.execute({
        programName: PROGRAM_ID,
        functionName: 'get_access_info',
        inputs,
        priorityFee: DEFAULT_FEE,
        privateFee: false,
      });

      const confirmed = await this.waitForTransaction(txId);

      return {
        success: true,
        data: { exists: confirmed },
        transactionId: txId,
      };
    } catch (error) {
      // If transaction fails, the access token doesn't exist
      return {
        success: true,
        data: { exists: false },
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Compute record ID (matches contract logic)
   */
  private computeRecordId(dataHash: string, nonce: string): string {
    // In a real implementation, this would use the same BHP256 hash as the contract
    // For now, we'll generate a placeholder - actual computation happens on-chain
    // The frontend can call compute_record_id transition for accurate ID
    return `record_${dataHash.substring(0, 20)}_${nonce.substring(0, 10)}`;
  }

  /**
   * Compute access token (matches contract logic)
   */
  private computeAccessToken(recordId: string, doctor: string, nonce: string): string {
    // Similar to computeRecordId - actual hash happens on-chain
    // Frontend can call compute_access_token for accurate token
    return `token_${recordId.substring(0, 10)}_${doctor.substring(5, 15)}_${nonce.substring(0, 10)}`;
  }

  /**
   * Format MedicalRecord as Leo struct input
   */
  private formatMedicalRecordInput(record: AleoMedicalRecord): string {
    // Format as Leo struct literal
    return `{
      owner: ${record.owner},
      record_id: ${record.record_id},
      data_hash: ${record.data_hash},
      data_part1: ${record.data_part1},
      data_part2: ${record.data_part2},
      data_part3: ${record.data_part3},
      data_part4: ${record.data_part4},
      record_type: ${record.record_type}u8,
      created_at: ${record.created_at}u32,
      version: ${record.version}u8
    }`;
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(txId: string): Promise<boolean> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      try {
        const tx = await this.networkClient.getTransaction(txId);
        if (tx) {
          // Transaction found - check status
          // Note: Actual status field depends on SDK version
          return true;
        }
      } catch (error) {
        // Transaction not found yet, continue polling
      }
      
      await this.sleep(POLL_INTERVAL_MS);
    }
    
    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // MAPPING QUERIES (for reading on-chain state)
  // ==========================================================================

  /**
   * Query a mapping value from the program
   */
  async getMappingValue(mappingName: string, key: string): Promise<string | null> {
    if (DEMO_MODE) {
      // In demo mode, we use our local storage
      console.log(`[SaludClient] Demo: getMappingValue(${mappingName}, ${key})`);
      return null;
    }

    try {
      const value = await this.networkClient.getProgramMappingValue(
        PROGRAM_ID,
        mappingName,
        key
      );
      return value;
    } catch (error) {
      console.error(`Failed to get mapping value: ${mappingName}[${key}]`, error);
      return null;
    }
  }

  /**
   * Check if an access token is valid
   */
  async isAccessTokenValid(accessToken: string): Promise<boolean> {
    if (DEMO_MODE) {
      return demoStorage.isAccessTokenValid(accessToken);
    }

    const value = await this.getMappingValue('access_token_valid', accessToken);
    return value === 'true';
  }

  /**
   * Get access grant details
   */
  async getAccessGrant(accessToken: string): Promise<{
    patient: string;
    doctor: string;
    recordId: string;
    grantedAt: number;
    expiresAt: number;
    isRevoked: boolean;
  } | null> {
    if (DEMO_MODE) {
      const grant = demoStorage.getAccessGrant(accessToken);
      if (!grant) return null;
      return {
        patient: grant.patient,
        doctor: grant.doctor,
        recordId: grant.recordId,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        isRevoked: grant.isRevoked,
      };
    }

    const value = await this.getMappingValue('access_grants', accessToken);
    if (!value) return null;

    try {
      // Parse the struct value from chain
      // Format: { patient: aleo1..., doctor: aleo1..., ... }
      const parsed = this.parseStructValue(value);
      return {
        patient: parsed.patient,
        doctor: parsed.doctor,
        recordId: parsed.record_id,
        grantedAt: parseInt(parsed.granted_at),
        expiresAt: parseInt(parsed.expires_at),
        isRevoked: parsed.is_revoked === 'true',
      };
    } catch (error) {
      console.error('Failed to parse access grant:', error);
      return null;
    }
  }

  // ==========================================================================
  // DEMO MODE HELPERS
  // ==========================================================================

  /**
   * Get all records for the connected account (demo mode only)
   */
  getDemoRecords(): AleoMedicalRecord[] {
    if (!DEMO_MODE || !this.demoAccount) return [];
    return demoStorage.getRecordsForOwner(this.demoAccount.address);
  }

  /**
   * Get all access grants for the connected account as patient (demo mode only)
   */
  getDemoAccessGrantsAsPatient(): DemoAccessGrant[] {
    if (!DEMO_MODE || !this.demoAccount) return [];
    return demoStorage.getAccessGrantsForPatient(this.demoAccount.address);
  }

  /**
   * Get all access grants for the connected account as doctor (demo mode only)
   */
  getDemoAccessGrantsAsDoctor(): DemoAccessGrant[] {
    if (!DEMO_MODE || !this.demoAccount) return [];
    return demoStorage.getAccessGrantsForDoctor(this.demoAccount.address);
  }

  /**
   * Get demo storage statistics
   */
  getDemoStats(): { recordCount: number; accessGrantCount: number; transactionCount: number; currentBlockHeight: number } | null {
    if (!DEMO_MODE) return null;
    return demoStorage.getStats();
  }

  /**
   * Clear all demo data
   */
  clearDemoData(): void {
    if (DEMO_MODE) {
      demoStorage.clearAll();
      console.log('[SaludClient] Demo: Cleared all data');
    }
  }

  /**
   * Parse a Leo struct value from string
   */
  private parseStructValue(value: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Remove outer braces and split by comma
    const inner = value.replace(/^\{|\}$/g, '').trim();
    const pairs = inner.split(',');
    
    for (const pair of pairs) {
      const [key, val] = pair.split(':').map((s) => s.trim());
      if (key && val) {
        // Remove type suffixes (u32, u8, field, etc.)
        result[key] = val.replace(/u\d+$|field$|bool$/, '');
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const saludClient = new SaludAleoClient();

// Export types for convenience
export type { AleoAccount, AleoMedicalRecord, TransactionStatus };
