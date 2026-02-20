# Salud Health Records - Contract Architecture

## Overview

Salud is a privacy-preserving medical records system built on the Aleo blockchain. It enables patients to store encrypted health data and securely share it with healthcare providers using temporary, revocable access tokens.

## Core Concepts

### Privacy Model

| Data Type | Visibility | Purpose |
|-----------|------------|---------|
| Medical Records | Private (record) | Only patient can view encrypted health data |
| Access Grants | Public (mapping) | Doctors verify their access permissions |
| Access Tokens | Semi-public | Shared via QR code, verifiable on-chain |

### Key Flows

```
PATIENT CREATES RECORD
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│ Patient │────>│ create_record│────>│ MedicalRecord   │
│ (Client)│     │ (Transition) │     │ (Private Record)│
└─────────┘     └──────────────┘     └─────────────────┘
     │                │
     │ Encrypts data  │ Stores metadata
     │ client-side    │ (if discoverable)
     v                v

PATIENT SHARES WITH DOCTOR
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│ Patient │────>│ grant_access │────>│ QR Code w/Token │
└─────────┘     └──────────────┘     └─────────────────┘
                      │
                      │ Creates AccessGrant
                      │ in public mapping
                      v

DOCTOR VERIFIES ACCESS
┌─────────┐     ┌───────────────┐     ┌─────────────────┐
│ Doctor  │────>│ verify_access │────>│ Access Valid/   │
│ (Scans) │     │ (Transition)  │     │ Invalid         │
└─────────┘     └───────────────┘     └─────────────────┘
```

## Data Structures

### MedicalRecord (Private Record)

```leo
record MedicalRecord {
    owner: address,        // Patient's Aleo address
    record_id: field,      // Unique identifier (hash-based)
    data_hash: field,      // Integrity verification hash
    data_part1: field,     // Encrypted data segment 1
    data_part2: field,     // Encrypted data segment 2
    data_part3: field,     // Encrypted data segment 3
    data_part4: field,     // Encrypted data segment 4
    record_type: u8,       // Category (1-10)
    created_at: u32,       // Block height placeholder
    version: u8,           // Schema version
}
```

**Storage Capacity**: ~126 bytes encrypted (4 fields x ~253 bits each)

**Record Types**:
1. General Health
2. Laboratory Results
3. Prescriptions
4. Imaging/Radiology
5. Vaccination Records
6. Surgical Records
7. Mental Health
8. Dental Records
9. Vision/Ophthalmology
10. Other/Miscellaneous

### AccessGrant (Public Struct)

```leo
struct AccessGrant {
    patient: address,      // Who granted access
    doctor: address,       // Who has access
    record_id: field,      // Which record
    access_token: field,   // Cryptographic proof
    granted_at: u32,       // When granted (block height)
    expires_at: u32,       // When expires (block height)
    is_revoked: bool,      // Manual revocation flag
}
```

## Transitions (Public API)

### 1. create_record

Creates a new encrypted medical record owned by the patient.

```leo
async transition create_record(
    data_part1: field,
    data_part2: field,
    data_part3: field,
    data_part4: field,
    record_type: u8,
    data_hash: field,
    nonce: field,
    make_discoverable: bool
) -> (MedicalRecord, Future)
```

**Parameters**:
- `data_part1-4`: Pre-encrypted medical data (client-side encryption)
- `record_type`: Category of record (1-10)
- `data_hash`: Hash of original data for integrity
- `nonce`: Client-provided randomness for unique ID
- `make_discoverable`: If true, adds to public index

**Returns**: MedicalRecord owned by caller

### 2. grant_access

Grants temporary access to a healthcare provider.

```leo
async transition grant_access(
    medical_record: MedicalRecord,
    doctor: address,
    duration_blocks: u32,
    nonce: field
) -> (MedicalRecord, field, Future)
```

**Parameters**:
- `medical_record`: The record to share
- `doctor`: Healthcare provider's address
- `duration_blocks`: Access duration (240-40320 blocks)
- `nonce`: Client-provided randomness for token

**Returns**: (record, access_token, future)

**Duration Bounds**:
- Minimum: 240 blocks (~1 hour)
- Maximum: 40320 blocks (~7 days)
- Default: 5760 blocks (~24 hours)

### 3. verify_access

Verifies a doctor has valid, non-expired access.

```leo
async transition verify_access(
    access_token: field,
    doctor: address,
    record_id: field
) -> Future
```

**Checks**:
- Token exists
- Doctor address matches
- Record ID matches
- Not revoked
- Not expired

**Returns**: Future (transaction succeeds if valid, fails otherwise)

### 4. revoke_access

Immediately revokes access before expiration.

```leo
async transition revoke_access(
    access_token: field
) -> Future
```

**Security**: Only the original patient (grant creator) can revoke.

### 5. get_access_info

Public view of access grant details.

```leo
async transition get_access_info(
    access_token: field
) -> Future
```

### 6. compute_record_id / compute_access_token

Helper functions for client-side computation.

```leo
transition compute_record_id(
    patient: address,
    data_hash: field,
    nonce: field
) -> field

transition compute_access_token(
    record_id: field,
    doctor: address,
    patient: address,
    nonce: field
) -> field
```

## Mappings (On-Chain State)

| Mapping | Key | Value | Purpose |
|---------|-----|-------|---------|
| `access_grants` | access_token | AccessGrant | Full grant details |
| `access_token_valid` | access_token | bool | Quick validity check |
| `record_metadata` | record_id | RecordMetadata | Public record index |
| `patient_record_count` | patient_hash | u64 | Record counting |

## Security Considerations

### What's Protected

1. **Medical Data**: Stored in private records, only owner can decrypt
2. **Access Tokens**: Cryptographically generated, unpredictable
3. **Expiration**: Enforced at block height, cannot be bypassed
4. **Revocation**: Immediate, cannot be undone

### Known Limitations

1. **Self-Grant Prevention**: Uses `self.caller != doctor` check
2. **Block Time**: ~15 seconds per block (may vary)
3. **Data Capacity**: ~126 bytes per record (larger data needs chunking)
4. **Client-Side Encryption**: Contract trusts encrypted data format

### Attack Vectors Mitigated

| Attack | Mitigation |
|--------|------------|
| Token Prediction | Client-provided nonces |
| Replay Attacks | Unique tokens per grant |
| Unauthorized Access | Record ownership + access verification |
| Stale Access | Block height expiration |

## Integration Guide

### For Frontend Developers

```typescript
// 1. Encrypt medical data client-side
const encryptedData = await encryptWithPatientKey(medicalData);
const chunks = splitIntoFields(encryptedData); // 4 fields

// 2. Generate unique nonce
const nonce = generateSecureRandom();

// 3. Call create_record
const record = await aleoSDK.execute('create_record', [
  chunks[0], chunks[1], chunks[2], chunks[3],
  recordType,
  hash(medicalData),
  nonce,
  makeDiscoverable
]);

// 4. Grant access to doctor
const accessToken = await aleoSDK.execute('grant_access', [
  record,
  doctorAddress,
  5760, // 24 hours
  generateSecureRandom()
]);

// 5. Generate QR code with token
const qrData = { token: accessToken, recordId: record.record_id };
```

### For Doctor Applications

```typescript
// 1. Scan QR code
const { token, recordId } = parseQRCode(scannedData);

// 2. Verify access
try {
  await aleoSDK.execute('verify_access', [token, myAddress, recordId]);
  // Access granted - fetch and decrypt record
} catch {
  // Access denied or expired
}
```

## Testing

Run the test suite:

```bash
cd salud_health_records
leo test
```

**Test Coverage** (17 tests):
- Record creation (valid/invalid types)
- Record ID uniqueness and determinism
- Access token generation
- Full access flow (create -> grant -> verify)
- Revocation
- Security edge cases (fake tokens, wrong doctor, wrong record)
- Duration bounds (min/max clamping)
- Access info retrieval

## File Structure

```
salud_health_records/
├── program.json          # Project configuration
├── src/
│   └── main.leo          # Main contract (~470 lines)
├── tests/
│   └── test_salud_health_records.leo
├── build/                # Compiled Aleo instructions
└── ARCHITECTURE.md       # This document
```

## Deployment

```bash
# Build for deployment
leo build

# Deploy to testnet (requires Aleo CLI)
leo deploy --network testnet

# Deploy to mainnet (production)
leo deploy --network mainnet
```

## Version History

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial release with core functionality |

---

*Built with Leo v2.x for Aleo blockchain*
