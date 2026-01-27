# Salud MVP - Building Phases

This document breaks down the Salud MVP into 4 sequential building phases. Each phase builds on the previous one and results in testable, working functionality.

---

## Phase 1: Leo Smart Contract Foundation

**Goal**: Create the core Aleo smart contract with all 3 functions  
**Duration**: ~2-3 days  
**Deliverable**: Deployable Leo program with passing tests

### 1.1 Project Setup
- [ ] Install Leo CLI (`leo --version`)
- [ ] Initialize Aleo project: `leo new salud`
- [ ] Configure `program.json` with program ID
- [ ] Set up development wallet for testing

### 1.2 Data Structures
Define the core types in `src/main.leo`:

```leo
// Medical record stored on-chain (encrypted)
record MedicalRecord {
    owner: address,           // Patient who owns this record
    record_id: field,         // Unique identifier
    encrypted_data: field,    // Encrypted medical information
    created_at: u64,          // Timestamp of creation
}

// Access grant for doctors (stored in public mapping)
struct AccessGrant {
    record_id: field,         // Which record
    doctor: address,          // Who has access
    expires_at: u64,          // When access expires (block height)
    access_token: field,      // Cryptographic proof of permission
}
```

### 1.3 Function 1: `create_record`
**Purpose**: Patient creates and stores an encrypted medical record

```leo
transition create_record(
    encrypted_data: field,
    timestamp: u64
) -> MedicalRecord {
    // Generate unique record ID (hash of owner + data + timestamp)
    // Create MedicalRecord with caller as owner
    // Return the record to patient
}
```

**Test Cases**:
- [ ] Patient can create a record
- [ ] Record ID is unique per record
- [ ] Only caller becomes owner
- [ ] Record contains correct encrypted data

### 1.4 Function 2: `grant_access`
**Purpose**: Patient grants temporary access to a doctor

```leo
transition grant_access(
    medical_record: MedicalRecord,
    doctor: address,
    duration_blocks: u64  // ~24 hours worth of blocks
) -> (MedicalRecord, field) {
    // Verify caller owns the record
    // Calculate expiration (current block + duration)
    // Generate access token (hash of record_id + doctor + expiration)
    // Store grant in public mapping
    // Return record back to patient + access token
}

mapping access_grants: field => AccessGrant;
```

**Test Cases**:
- [ ] Only record owner can grant access
- [ ] Access token is generated correctly
- [ ] Expiration is calculated correctly
- [ ] Grant is stored in public mapping

### 1.5 Function 3: `verify_access`
**Purpose**: Verify doctor has valid, non-expired access

```leo
transition verify_access(
    record_id: field,
    access_token: field,
    doctor: address
) -> bool {
    // Look up access grant from mapping
    // Verify access token matches
    // Check expiration against current block height
    // Return true if valid, false if expired/invalid
}
```

**Test Cases**:
- [ ] Valid token + non-expired = returns true
- [ ] Valid token + expired = returns false
- [ ] Invalid token = returns false
- [ ] Wrong doctor address = returns false

### 1.6 Testing & Deployment
- [ ] Write Leo test cases for all functions
- [ ] Run `leo test` - all tests pass
- [ ] Run `leo build` - successful compilation
- [ ] Deploy to Aleo testnet
- [ ] Verify deployment with explorer

### Phase 1 Completion Checklist
- [ ] All 3 transitions implemented
- [ ] All test cases pass
- [ ] Program deploys to testnet
- [ ] Contract address documented

---

## Phase 2: React Frontend Foundation

**Goal**: Set up React + TypeScript app with core UI screens  
**Duration**: ~2-3 days  
**Deliverable**: Working frontend with mock data (no blockchain connection yet)

### 2.1 Project Setup
- [ ] Initialize React + TypeScript + Vite project
- [ ] Install dependencies:
  - `@demox-labs/aleo-wallet-adapter-react` (wallet connection)
  - `@demox-labs/aleo-wallet-adapter-reactui` (wallet UI)
  - `qrcode.react` (QR code generation)
  - `html5-qrcode` (QR code scanning)
  - `tailwindcss` (styling)
  - `react-router-dom` (routing)
- [ ] Configure Tailwind with healthcare color palette
- [ ] Set up folder structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── records/
│   │   ├── RecordCard.tsx
│   │   ├── RecordList.tsx
│   │   └── CreateRecordModal.tsx
│   ├── sharing/
│   │   ├── QRCodeDisplay.tsx
│   │   └── QRScanner.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── pages/
│   ├── PatientDashboard.tsx
│   ├── DoctorView.tsx
│   └── SharedRecord.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── useRecords.ts
│   └── useQRCode.ts
├── services/
│   ├── aleo.ts
│   └── encryption.ts
├── types/
│   └── index.ts
├── utils/
│   └── helpers.ts
└── App.tsx
```

### 2.2 Screen 1: Patient Dashboard
**Route**: `/` (home)

**Components**:
- [ ] Header with wallet connection button
- [ ] Welcome message with patient address (truncated)
- [ ] "Create New Record" button (prominent, primary color)
- [ ] Records list (cards or table)
  - Each record shows: title/preview, date created
  - Each record has "View" and "Share" buttons
- [ ] Empty state: "No records yet. Create your first record!"

**Mock Data**:
```typescript
const mockRecords = [
  { id: '1', preview: 'Annual checkup results...', createdAt: '2024-01-15' },
  { id: '2', preview: 'Blood test results...', createdAt: '2024-02-20' },
];
```

### 2.3 Screen 2: Create Record Modal
**Trigger**: Click "Create New Record" button

**Components**:
- [ ] Modal overlay
- [ ] Title: "Create Medical Record"
- [ ] Large textarea for medical information
- [ ] Placeholder text: "Enter your medical information here (e.g., test results, diagnoses, medications, allergies...)"
- [ ] Character count (optional)
- [ ] "Cancel" button (secondary)
- [ ] "Save Record" button (primary)
- [ ] Loading state while saving
- [ ] Success message: "Record created successfully!"

### 2.4 Screen 3: QR Code Display Modal
**Trigger**: Click "Share" button on a record

**Components**:
- [ ] Modal overlay with dark background (QR visibility)
- [ ] Large QR code (minimum 300x300px)
- [ ] Text: "Show this QR code to your doctor"
- [ ] Expiration countdown: "Expires in 23:59:45"
- [ ] Record preview (what they're sharing)
- [ ] "Close" button
- [ ] Instructions: "Doctor scans this code with the Salud app"

**QR Code Content**:
```json
{
  "recordId": "field_value_here",
  "accessToken": "token_here",
  "expiresAt": 1234567890
}
```

### 2.5 Screen 4: Doctor View
**Route**: `/doctor`

**Components**:
- [ ] Header with wallet connection
- [ ] "Scan Patient QR Code" button (large, prominent)
- [ ] QR Scanner (camera view when activated)
  - Full-screen or large camera preview
  - Scanning frame/guide overlay
  - "Cancel" button
- [ ] After scanning: Display medical record
  - Patient info (address, truncated)
  - Medical data (full text, readable)
  - Created date
  - Expiration countdown: "Access expires in 23:45:12"
  - "Access expired" error state

### 2.6 Styling & Design System
Reference Figma: https://www.figma.com/design/vnjnXrKX6LWiEAaos5FMRa/Healthcare-Dashboard--Community-

- [ ] Color palette:
  - Primary: Healthcare blue (#0066CC or similar)
  - Secondary: Calming green (#28A745 or similar)
  - Background: Light gray/white
  - Error: Red (#DC3545)
  - Success: Green (#28A745)
- [ ] Typography:
  - Headings: Bold, clear
  - Body: Minimum 16px
  - Monospace for addresses/IDs
- [ ] Components:
  - Buttons: Large touch targets (44x44px minimum)
  - Cards: Subtle shadows, rounded corners
  - Modals: Centered, dark overlay

### Phase 2 Completion Checklist
- [ ] All 4 screens implemented
- [ ] Mock data displays correctly
- [ ] QR code generates (with mock data)
- [ ] QR scanner opens camera
- [ ] Responsive on mobile and desktop
- [ ] Healthcare-appropriate styling

---

## Phase 3: Aleo Integration

**Goal**: Connect frontend to Aleo blockchain via wallet and smart contract  
**Duration**: ~3-4 days  
**Deliverable**: Working app that creates/shares real records on testnet

### 3.1 Wallet Integration
- [ ] Set up Aleo wallet adapter provider
- [ ] Implement wallet connection flow
  - Support Leo Wallet / Puzzle Wallet
  - Display connected address
  - Handle disconnection
- [ ] Store wallet state (context/zustand)
- [ ] Show connection status in header

```typescript
// src/contexts/WalletContext.tsx
export const WalletProvider = ({ children }) => {
  // Wallet adapter setup
  // Connection state management
  // Auto-reconnect on page reload
};
```

### 3.2 Aleo Service Layer
- [ ] Create Aleo service for contract interactions

```typescript
// src/services/aleo.ts
export class AleoService {
  private programId = 'salud.aleo';
  
  // Create medical record on-chain
  async createRecord(encryptedData: string): Promise<string>;
  
  // Grant access to doctor
  async grantAccess(recordId: string, doctorAddress: string): Promise<AccessToken>;
  
  // Verify access (for doctors)
  async verifyAccess(recordId: string, token: string): Promise<boolean>;
  
  // Get patient's records
  async getRecords(patientAddress: string): Promise<MedicalRecord[]>;
}
```

### 3.3 Encryption Service
- [ ] Implement client-side encryption for medical data

```typescript
// src/services/encryption.ts
export class EncryptionService {
  // Encrypt medical data with patient's key
  encrypt(data: string, publicKey: string): string;
  
  // Decrypt medical data (patient only)
  decrypt(encryptedData: string, privateKey: string): string;
  
  // Convert string to field element for Aleo
  stringToField(data: string): string;
  
  // Convert field element back to string
  fieldToString(field: string): string;
}
```

### 3.4 Connect Create Record Flow
- [ ] On "Save Record" click:
  1. Encrypt medical data with patient's key
  2. Convert to field element
  3. Call `create_record` transition
  4. Wait for transaction confirmation
  5. Store record locally (IndexedDB) for fast retrieval
  6. Show success message

### 3.5 Connect Share Flow
- [ ] On "Share" click:
  1. Prompt for doctor's address (or use default duration)
  2. Call `grant_access` transition
  3. Receive access token
  4. Generate QR code with: recordId + accessToken + expiration
  5. Display QR modal

### 3.6 Connect Doctor View Flow
- [ ] On QR scan:
  1. Parse QR code data
  2. Call `verify_access` to check validity
  3. If valid: decrypt and display record
  4. If expired: show "Access expired" message
  5. Show countdown timer for expiration

### 3.7 Transaction Status & Error Handling
- [ ] Loading states for all blockchain operations
- [ ] Transaction pending indicator
- [ ] Success confirmations
- [ ] Error messages (user-friendly, not technical)
  - "Transaction failed - please try again"
  - "Access expired - ask patient for new QR code"
  - "Wallet not connected - please connect your wallet"

### Phase 3 Completion Checklist
- [ ] Wallet connects successfully
- [ ] Records created on testnet
- [ ] Records retrieved from chain
- [ ] Access grants created on chain
- [ ] QR codes contain real access tokens
- [ ] Doctor can verify and view shared records
- [ ] Expiration enforced correctly

---

## Phase 4: Polish & Testing

**Goal**: Production-ready MVP with good UX and thorough testing  
**Duration**: ~2-3 days  
**Deliverable**: Deployable, tested application

### 4.1 UX Improvements
- [ ] Add loading skeletons (not spinners)
- [ ] Smooth transitions between states
- [ ] Haptic feedback on mobile (vibration on scan success)
- [ ] Pull-to-refresh on record list
- [ ] Optimistic UI updates
- [ ] Offline indicator

### 4.2 Error Handling Polish
- [ ] Comprehensive error boundaries
- [ ] Retry mechanisms for failed transactions
- [ ] Clear error recovery paths
- [ ] Network status detection

### 4.3 Security Review
- [ ] Audit encryption implementation
- [ ] Verify no sensitive data in logs
- [ ] Check for XSS vulnerabilities
- [ ] Validate all user inputs
- [ ] Ensure private keys never leave device

### 4.4 Performance Optimization
- [ ] Code splitting for routes
- [ ] Lazy load QR scanner (heavy library)
- [ ] Cache records in IndexedDB
- [ ] Minimize re-renders
- [ ] Optimize bundle size

### 4.5 Testing

**Unit Tests**:
- [ ] Encryption/decryption functions
- [ ] QR code generation/parsing
- [ ] Utility functions
- [ ] Component rendering

**Integration Tests**:
- [ ] Create record flow (mock blockchain)
- [ ] Share flow (mock blockchain)
- [ ] Doctor view flow (mock blockchain)

**E2E Tests** (Playwright or Cypress):
- [ ] Full patient journey: create -> share
- [ ] Full doctor journey: scan -> view
- [ ] Expiration handling
- [ ] Wallet connection/disconnection

### 4.6 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators
- [ ] Alt text for images/icons

### 4.7 Cross-Platform Testing
- [ ] iPhone Safari
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari

### 4.8 Documentation
- [ ] README with setup instructions
- [ ] Environment variables documentation
- [ ] Deployment guide
- [ ] User guide (how to use the app)

### 4.9 Deployment
- [ ] Set up Vercel/Netlify for frontend
- [ ] Configure environment variables
- [ ] Set up custom domain (optional)
- [ ] Deploy to production
- [ ] Verify deployment works

### Phase 4 Completion Checklist
- [ ] All UX improvements implemented
- [ ] Security review complete
- [ ] Performance optimized
- [ ] Tests written and passing
- [ ] Accessibility verified
- [ ] Cross-platform tested
- [ ] Documentation complete
- [ ] Deployed to production

---

## Success Metrics (From Onboarding Guide)

### Functional Tests
- [ ] Patient can create medical record in under 30 seconds
- [ ] QR code generates in under 5 seconds
- [ ] Doctor can scan QR and view record in under 10 seconds
- [ ] Access automatically expires after 24 hours
- [ ] Expired access shows clear error message
- [ ] Works on iPhone and Android
- [ ] Works on Chrome, Safari, Firefox
- [ ] Wallet connects successfully every time
- [ ] No unauthorized access to records

### User Experience Tests
- [ ] First-time user can create record without instructions
- [ ] QR code is large enough to scan from 2 feet away
- [ ] Medical data displays clearly (readable without zooming)
- [ ] Error messages are understandable (not technical)
- [ ] Loading states show for any action taking >2 seconds
- [ ] App feels fast (no lag when clicking buttons)

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Leo Smart Contract | 2-3 days | Deployed contract on testnet |
| Phase 2: React Frontend | 2-3 days | Working UI with mock data |
| Phase 3: Aleo Integration | 3-4 days | Connected app on testnet |
| Phase 4: Polish & Testing | 2-3 days | Production-ready MVP |
| **Total** | **9-13 days** | **Complete MVP** |

---

## Getting Started

Ready to build? Start with Phase 1:

```bash
# Install Leo CLI
curl -sSf https://install.leo-lang.org/ | sh

# Create Salud project
leo new salud
cd salud

# Open in your editor
code .
```

Then follow the Phase 1 checklist above!
