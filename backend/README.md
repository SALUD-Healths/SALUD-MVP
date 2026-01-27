# Salud Backend API

Node.js backend service for handling Aleo blockchain operations.

## Overview

This backend API provides endpoints for the Salud frontend to interact with the Aleo blockchain using the `@provablehq/sdk`. Since the Aleo SDK requires Node.js (not browser-compatible), this backend handles all blockchain operations.

## Architecture

```
Frontend (Browser) → Backend API (Node.js) → Aleo SDK → Aleo Blockchain
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server runs on `http://localhost:3001` by default.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and timestamp.

### Wallet Management

**Connect Wallet**
```
POST /api/wallet/connect
Body: { privateKey: string }
Returns: { sessionId, address, viewKey }
```

**Generate Account**
```
POST /api/wallet/generate
Returns: { privateKey, viewKey, address }
```

**Get Balance**
```
GET /api/wallet/balance/:sessionId
Returns: { balance: number }
```

### Medical Records

**Create Record**
```
POST /api/records/create
Body: {
  sessionId: string,
  dataPart1: string,
  dataPart2: string,
  dataPart3: string,
  dataPart4: string,
  recordType: number,
  dataHash: string,
  nonce: string,
  makeDiscoverable: boolean
}
Returns: { transactionId, recordId }
```

**Grant Access**
```
POST /api/access/grant
Body: {
  sessionId: string,
  recordId: string,
  doctorAddress: string,
  accessDuration: number
}
Returns: { transactionId, grantId }
```

## Environment Variables

Create a `.env` file:

```env
PORT=3001
ALEO_API_URL=https://api.explorer.provable.com/v1
PROGRAM_ID=salud_health_records.aleo
```

## Security Notes

- **Session Management**: Currently uses in-memory storage. For production, use Redis or a database.
- **Private Keys**: Never logged or stored permanently. Only kept in session during active use.
- **CORS**: Enabled for development. Configure appropriately for production.

## Dependencies

- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables
- `@provablehq/sdk` - Aleo blockchain SDK
- `body-parser` - Request body parsing
- `nodemon` - Development server (dev only)

## Tech Stack

- Node.js
- Express
- Aleo SDK
- TypeScript-style JSDoc
