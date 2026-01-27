import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Account, AleoNetworkClient, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const ALEO_API_URL = process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v1';
const PROGRAM_ID = process.env.PROGRAM_ID || 'salud_health_records.aleo';
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

    const networkClient = new AleoNetworkClient(ALEO_API_URL);
    const balance = await networkClient.getBalance(session.address);

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
    const programManager = new ProgramManager(ALEO_API_URL, undefined, recordProvider);
    programManager.setAccount(session.account);

    const inputs = [
      dataPart1,
      dataPart2,
      dataPart3,
      dataPart4,
      `${recordType}u8`,
      dataHash,
      nonce,
      makeDiscoverable.toString()
    ];

    console.log('[Server] Executing create_record transition...');
    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'create_record',
      inputs,
      priorityFee: DEFAULT_FEE,
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
    const { sessionId, recordId, doctorAddress, accessDuration } = req.body;

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
    const programManager = new ProgramManager(ALEO_API_URL, undefined, recordProvider);
    programManager.setAccount(session.account);

    const inputs = [
      recordId,
      doctorAddress,
      `${accessDuration}u32`
    ];

    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'grant_access',
      inputs,
      priorityFee: DEFAULT_FEE,
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
  console.log('  POST   /api/access/grant');
  console.log('  GET    /api/health');
  console.log('');
});
