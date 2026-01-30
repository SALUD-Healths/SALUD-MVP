import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Account, AleoNetworkClient, ProgramManager, NetworkRecordProvider, AleoKeyProvider } from '@provablehq/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const ALEO_API_URL = process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v1';
const PROGRAM_ID = process.env.PROGRAM_ID || 'salud_health_records_v2.aleo';
const DEFAULT_FEE = 100000; // microcredits
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// In-memory storage for active sessions (use Redis in production)
const sessions = new Map();

// Helper: Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * POST /api/wallet/connect
 * Connect wallet with private key
 */
app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey || !privateKey.startsWith('APrivateKey1')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid private key format'
      });
    }

    if (privateKey.length !== 59) {
      return res.status(400).json({
        success: false,
        error: `Invalid private key length. Expected 59 characters, got ${privateKey.length}`
      });
    }

    console.log('[Server] Creating Aleo account...');
    const account = new Account({ privateKey });

    const sessionId = generateSessionId();

    // Store account in session
    sessions.set(sessionId, {
      account,
      privateKey: account.privateKey().to_string(),
      viewKey: account.viewKey().to_string(),
      address: account.address().to_string(),
      createdAt: Date.now()
    });

    console.log('[Server] Account created:', account.address().to_string());

    res.json({
      success: true,
      data: {
        sessionId,
        address: account.address().to_string(),
        viewKey: account.viewKey().to_string()
      }
    });
  } catch (error) {
    console.error('[Server] Connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect wallet'
    });
  }
});

/**
 * POST /api/wallet/generate
 * Generate a new Aleo account
 */
app.post('/api/wallet/generate', async (req, res) => {
  try {
    console.log('[Server] Generating new account...');
    const account = new Account();

    res.json({
      success: true,
      data: {
        privateKey: account.privateKey().to_string(),
        viewKey: account.viewKey().to_string(),
        address: account.address().to_string()
      }
    });
  } catch (error) {
    console.error('[Server] Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate account'
    });
  }
});

/**
 * GET /api/wallet/balance/:sessionId
 * Get wallet balance
 */
app.get('/api/wallet/balance/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    // Note: AleoNetworkClient doesn't have a direct getBalance method
    // For testnet, we'll return a mock balance
    // In production, you would query the blockchain API directly
    console.log('[Server] Balance check for:', session.address);

    // Return mock balance for development
    const balance = 100000000; // 100 credits in microcredits

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    console.error('[Server] Balance error:', error);
    res.json({
      success: true,
      data: { balance: 0 } // Return 0 on error
    });
  }
});

/**
 * POST /api/records/create
 * Create a medical record on-chain
 */
app.post('/api/records/create', async (req, res) => {
  try {
    const { sessionId, dataPart1, dataPart2, dataPart3, dataPart4, recordType, dataHash, nonce, makeDiscoverable } = req.body;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    console.log('[Server] Creating medical record...');

    // DEMO MODE: Simulate transaction without blockchain interaction
    if (DEMO_MODE) {
      console.log('[Server] DEMO MODE: Simulating transaction...');

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockTxId = `at1demo${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
      const recordId = `${dataHash.slice(0, 16)}${nonce.slice(0, 16)}`;

      console.log('[Server] DEMO MODE: Transaction simulated:', mockTxId);

      return res.json({
        success: true,
        data: {
          transactionId: mockTxId,
          recordId: recordId
        }
      });
    }

    // PRODUCTION MODE: Execute on real blockchain
    const networkClient = new AleoNetworkClient(ALEO_API_URL);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);

    // Initialize ProgramManager with key provider configuration
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true); // Enable key caching

    const programManager = new ProgramManager(
      ALEO_API_URL,
      keyProvider,
      recordProvider
    );
    programManager.setAccount(session.account);

    const inputs = [
      dataPart1,
      dataPart2,
      dataPart3,
      dataPart4,
      `${recordType}u8`,
      dataHash,
      nonce,
      makeDiscoverable ? 'true' : 'false' // Boolean literal, not string
    ];

    console.log('[Server] Executing create_record transition...');
    console.log('[Server] Inputs:', inputs);

    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'create_record',
      inputs,
      fee: 500000, // Fixed fee: 0.5 credits to avoid SDK fee estimation bug
      privateFee: false,
    });

    console.log('[Server] Transaction submitted:', txId);

    res.json({
      success: true,
      data: {
        transactionId: txId,
        recordId: `${dataHash.slice(0, 16)}${nonce.slice(0, 16)}`
      }
    });
  } catch (error) {
    console.error('[Server] Create record error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create record'
    });
  }
});

/**
 * POST /api/access/grant
 * Grant access to a medical record
 */
app.post('/api/access/grant', async (req, res) => {
  try {
    const { sessionId, recordId, doctorAddress, accessDuration, nonce, dataHash } = req.body;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    console.log('[Server] Granting access...');

    // DEMO MODE: Simulate transaction without blockchain interaction
    if (DEMO_MODE) {
      console.log('[Server] DEMO MODE: Simulating access grant...');

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockTxId = `at1demo${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
      const grantId = `grant_${Date.now()}`;

      console.log('[Server] DEMO MODE: Access grant simulated:', mockTxId);

      return res.json({
        success: true,
        data: {
          transactionId: mockTxId,
          grantId: grantId
        }
      });
    }

    // PRODUCTION MODE: Execute on real blockchain
    const networkClient = new AleoNetworkClient(ALEO_API_URL);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);

    // Initialize ProgramManager with key provider configuration
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true); // Enable key caching

    const programManager = new ProgramManager(
      ALEO_API_URL,
      keyProvider,
      recordProvider
    );
    programManager.setAccount(session.account);

    // 1. Find the medical record to grant access to
    console.log('[Server] Finding medical record with dataHash:', dataHash);
    
    // Optimized Search Strategy:
    // 1. Get current network height
    // 2. Search backwards in SMALL chunks to avoid 522 timeouts
    // 3. Add retry logic for network stability
    
    let medicalRecord = null;
    try {
        const latestHeight = await networkClient.getLatestHeight();
        const CHUNK_SIZE = 50; // Extremely conservative chunk size to avoid 522 timeouts
        const MAX_SEARCH_DEPTH = 10000; // Search depth adapted for smaller chunks
        
        let currentEnd = latestHeight;
        let currentStart = Math.max(0, currentEnd - CHUNK_SIZE);
        let depth = 0;

        console.log(`[Server] Starting search from height ${latestHeight}`);

        while (!medicalRecord && depth < MAX_SEARCH_DEPTH && currentEnd > 0) {
            console.log(`[Server] Searching blocks ${currentStart} - ${currentEnd}...`);
            
            let retries = 5; // Increased retries
            while (retries > 0) {
                try {
                    const records = await recordProvider.findRecords({
                        program: PROGRAM_ID,
                        unspent: true,
                        startHeight: currentStart,
                        endHeight: currentEnd
                    });

                    for (const record of records) {
                        // Handle different record formats (SDK version differences)
                        let plaintext;
                        if (typeof record.plaintext === 'function') {
                            plaintext = record.plaintext();
                        } else if (typeof record.plaintext === 'string') {
                            plaintext = record.plaintext;
                        } else if (typeof record === 'string') {
                            plaintext = record;
                        } else {
                            plaintext = JSON.stringify(record);
                        }

                        if (plaintext.includes(`data_hash: ${dataHash}`)) {
                            medicalRecord = record;
                            console.log(`[Server] Found record in range ${currentStart}-${currentEnd}`);
                            break;
                        }
                    }
                    // If successful, break retry loop
                    break;
                } catch (err) {
                    retries--;
                    console.warn(`[Server] Error searching range ${currentStart}-${currentEnd}: ${err.message}. Retries left: ${retries}`);
                    
                    if (retries === 0) {
                        console.error(`[Server] Failed to fetch range ${currentStart}-${currentEnd} after multiple attempts.`);
                    } else {
                        // Check for 522 specifically to wait longer
                        const isTimeout = err.message && err.message.includes('522');
                        const baseDelay = isTimeout ? 5000 : 2000;
                        
                        // Exponential backoff
                        const delay = baseDelay * Math.pow(1.5, 5 - retries);
                        console.log(`[Server] Waiting ${Math.round(delay)}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (medicalRecord) break;

            // Move window backwards
            currentEnd = currentStart;
            currentStart = Math.max(0, currentEnd - CHUNK_SIZE);
            depth += CHUNK_SIZE;
            
            // Small pause between chunks to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (err) {
        console.error('[Server] Failed to initialize search:', err);
    }
    
    if (!medicalRecord) {
        throw new Error(`Medical record not found in recent history. Please ensure the transaction is confirmed.`);
    }

    console.log('[Server] Medical record found.');

    // Helper to format record as Leo input string
    let recordInput;
    
    // Log available keys to help debug if we miss it again
    console.log('[Server] MedicalRecord keys:', Object.keys(medicalRecord));

    if (typeof medicalRecord === 'string') {
        recordInput = medicalRecord;
    } else if (typeof medicalRecord.toString === 'function' && medicalRecord.toString() !== '[object Object]') {
        recordInput = medicalRecord.toString();
    } else {
        // If it's a plain object, we need to construct the record string
        // Check if we have the plaintext available
        const plain = 
            (typeof medicalRecord.plaintext === 'function' ? medicalRecord.plaintext() : medicalRecord.plaintext) ||
            medicalRecord.record_plaintext; // Handle the specific format seen in logs

        if (plain) {
            recordInput = plain;
        } else {
            // Last resort: try to construct it from raw fields if available, or just JSON stringify (might fail)
            console.log('[Server] Warning: Could not extract plaintext record. Using JSON stringify.');
            recordInput = JSON.stringify(medicalRecord);
        }
    }
    
    console.log('[Server] Record Input Type:', typeof recordInput);
    // Log the start of the record string for debugging (don't log sensitive data in prod)
    console.log('[Server] Record Input Preview:', recordInput.substring(0, 50) + '...');

    const inputs = [
      recordInput,
      doctorAddress,
      `${accessDuration}u32`,
      nonce
    ];

    console.log('[Server] Executing grant_access transition...');
    console.log('[Server] Inputs prepared (record hidden)');

    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'grant_access',
      inputs,
      fee: 500000, // Fixed fee: 0.5 credits
      privateFee: false,
    });

    console.log('[Server] Access granted:', txId);

    res.json({
      success: true,
      data: {
        transactionId: txId,
        grantId: `grant_${Date.now()}`
      }
    });
  } catch (error) {
    console.error('[Server] Grant access error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to grant access'
    });
  }
});

/**
 * GET /api/records/fetch/:sessionId
 * Fetch all medical records for the connected wallet from the blockchain
 */
app.get('/api/records/fetch/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    console.log('[Server] Fetching records for address:', session.address);

    // DEMO MODE: Return mock records
    if (DEMO_MODE) {
      console.log('[Server] DEMO MODE: Returning mock records');
      
      // In demo mode, we'll return empty array since records are stored in localStorage
      return res.json({
        success: true,
        data: {
          records: [],
          message: 'DEMO MODE: Records are stored in localStorage'
        }
      });
    }

    // PRODUCTION MODE: Fetch from real blockchain
    const networkClient = new AleoNetworkClient(ALEO_API_URL);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);

    const records = [];
    
    try {
      // Search for records in chunks to avoid timeouts
      // OPTIMIZED: Only search last 1000 blocks (~4 hours) for faster response
      const latestHeight = await networkClient.getLatestHeight();
      const CHUNK_SIZE = 100; // Larger chunks for faster searching
      const MAX_SEARCH_DEPTH = 1000; // Only search recent blocks (much faster!)
      const MAX_SEARCH_TIME = 15000; // Max 15 seconds total search time
      
      let currentEnd = latestHeight;
      let currentStart = Math.max(0, currentEnd - CHUNK_SIZE);
      let depth = 0;
      const searchStartTime = Date.now();

      console.log(`[Server] Searching for records from height ${latestHeight} (max depth: ${MAX_SEARCH_DEPTH} blocks, max time: ${MAX_SEARCH_TIME}ms)`);

      while (depth < MAX_SEARCH_DEPTH && currentEnd > 0 && (Date.now() - searchStartTime) < MAX_SEARCH_TIME) {
        console.log(`[Server] Searching blocks ${currentStart} - ${currentEnd}...`);
        
        let retries = 3;
        while (retries > 0) {
          try {
            const foundRecords = await recordProvider.findRecords({
              program: PROGRAM_ID,
              unspent: true,
              startHeight: currentStart,
              endHeight: currentEnd
            });

            for (const record of foundRecords) {
              // Extract plaintext from record
              let plaintext;
              if (typeof record.plaintext === 'function') {
                plaintext = record.plaintext();
              } else if (typeof record.plaintext === 'string') {
                plaintext = record.plaintext;
              } else if (typeof record === 'string') {
                plaintext = record;
              } else {
                plaintext = JSON.stringify(record);
              }

              // Parse record data
              // Record format: {owner: aleo1xxx, record_id: 123field, data_hash: 456field, ...}
              const recordData = {
                id: '',
                recordId: '',
                title: 'Medical Record',
                description: 'Record fetched from blockchain',
                recordType: 1,
                data: plaintext,
                dataHash: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                isEncrypted: true,
                ownerAddress: session.address
              };

              // Try to extract record_id from plaintext
              const recordIdMatch = plaintext.match(/record_id:\s*(\d+field)/);
              if (recordIdMatch) {
                recordData.recordId = recordIdMatch[1];
                recordData.id = recordIdMatch[1];
              }

              // Try to extract data_hash
              const dataHashMatch = plaintext.match(/data_hash:\s*(\d+field)/);
              if (dataHashMatch) {
                recordData.dataHash = dataHashMatch[1];
              }

              // Try to extract record_type
              const recordTypeMatch = plaintext.match(/record_type:\s*(\d+)u8/);
              if (recordTypeMatch) {
                recordData.recordType = parseInt(recordTypeMatch[1]);
              }

              records.push(recordData);
              console.log(`[Server] Found record: ${recordData.recordId}`);
            }
            
            break; // Success, exit retry loop
          } catch (err) {
            retries--;
            console.warn(`[Server] Error searching range: ${err.message}. Retries left: ${retries}`);
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        // Move window backwards
        currentEnd = currentStart;
        currentStart = Math.max(0, currentEnd - CHUNK_SIZE);
        depth += CHUNK_SIZE;
        
        // Pause between chunks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[Server] Found ${records.length} records total`);

      res.json({
        success: true,
        data: {
          records: records,
          count: records.length
        }
      });
    } catch (err) {
      console.error('[Server] Error fetching records:', err);
      res.json({
        success: true,
        data: {
          records: [],
          error: err.message
        }
      });
    }
  } catch (error) {
    console.error('[Server] Fetch records error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch records'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Salud Backend API is running',
    mode: DEMO_MODE ? 'demo' : 'production',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Salud Backend API                   ║
║   Running on http://localhost:${PORT}  ║
║   Mode: ${DEMO_MODE ? 'DEMO' : 'PRODUCTION'}                     ║
╚═══════════════════════════════════════╝
  `);
  if (DEMO_MODE) {
    console.log('⚠️  DEMO MODE ENABLED - Transactions are simulated');
  }
  console.log('Endpoints:');
  console.log('  POST   /api/wallet/connect');
  console.log('  POST   /api/wallet/generate');
  console.log('  GET    /api/wallet/balance/:sessionId');
  console.log('  POST   /api/records/create');
  console.log('  GET    /api/records/fetch/:sessionId');
  console.log('  POST   /api/access/grant');
  console.log('  GET    /api/health');
  console.log('');
});
