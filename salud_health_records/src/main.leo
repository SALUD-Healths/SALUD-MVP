// ============================================================================
// SALUD HEALTH RECORDS - Privacy-Preserving Medical Records on Aleo
// ============================================================================
// 
// This program enables patients to:
// 1. Store encrypted medical records as private records on-chain
// 2. Grant temporary access to healthcare providers via secure tokens
// 3. Revoke access automatically after expiration (block height based)
//
// Security Model:
// - Medical data is stored in private records (only visible to owner)
// - Access grants are stored in public mappings (for verification)
// - Access tokens are cryptographically generated (hash of record + doctor + nonce)
// - Expiration is enforced via block height comparison
//
// Architecture Notes:
// - Nonces are provided by the client (ensures client controls randomness)
// - Record IDs are deterministic hashes (allows client-side computation)
// - Medical data is split into 4 field elements (~126 bytes encrypted capacity)
//
// ============================================================================

program salud_health_records_v2.aleo {

    // ========================================================================
    // PROGRAM CONFIGURATION
    // ========================================================================

    // @admin allows upgrades during testnet development
    // Change to @noupgrade before mainnet deployment for production security
    @admin(address = "aleo1gl4a57rcxyjvmzcgjscjqe466ecdr7uk4gdp7sf5pctu6tjvv5qs60lw8y")
    async constructor() {}

    // ========================================================================
    // CONSTANTS
    // ========================================================================
    
    // Default access duration: ~24 hours worth of blocks
    // Aleo produces ~1 block per 15 seconds = 4 blocks/minute = 5760 blocks/day
    const DEFAULT_ACCESS_DURATION_BLOCKS: u32 = 5760u32;
    
    // Maximum access duration: ~7 days (for extended care scenarios)
    const MAX_ACCESS_DURATION_BLOCKS: u32 = 40320u32;
    
    // Minimum access duration: ~1 hour (for quick consultations)
    const MIN_ACCESS_DURATION_BLOCKS: u32 = 240u32;

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// MedicalRecord - Private record storing encrypted patient health data
    /// 
    /// This record is owned by the patient and contains their encrypted medical
    /// information. Only the patient can decrypt and read the contents.
    /// The encryption happens client-side before calling create_record.
    ///
    /// Fields:
    /// - owner: The patient's Aleo address (automatic record ownership)
    /// - record_id: Unique identifier for this record (hash-based)
    /// - data_hash: Hash of the encrypted data (for integrity verification)
    /// - data_part1-4: Encrypted medical data split into field elements
    ///   (Each field can hold ~253 bits, giving us ~1012 bits / ~126 bytes total)
    /// - record_type: Category of medical record (1=general, 2=lab, 3=prescription, etc.)
    /// - created_at: Block height when record was created (set to 0, actual in metadata)
    /// - version: Record version for future upgradability
    record MedicalRecord {
        owner: address,
        record_id: field,
        data_hash: field,
        data_part1: field,
        data_part2: field,
        data_part3: field,
        data_part4: field,
        record_type: u8,
        created_at: u32,
        version: u8,
    }

    /// AccessGrant - Public struct representing a temporary access permission
    ///
    /// Stored in public mapping so doctors can verify their access rights.
    /// The actual medical data remains private - this only proves permission.
    struct AccessGrant {
        patient: address,           // Who granted access
        doctor: address,            // Who has access
        record_id: field,           // Which record (not the data itself)
        access_token: field,        // Cryptographic proof of permission
        granted_at: u32,            // When access was granted (block height)
        expires_at: u32,            // When access expires (block height)
        is_revoked: bool,           // Manual revocation flag
    }

    /// RecordMetadata - Public struct for record discovery (optional indexing)
    ///
    /// Allows patients to have a public index of their records without
    /// revealing the actual content. Useful for frontend record listing.
    struct RecordMetadata {
        patient: address,
        record_id: field,
        record_type: u8,
        created_at: u32,
        is_active: bool,
    }

    /// RecordIdInput - Helper struct for generating unique record IDs
    struct RecordIdInput {
        patient: address,
        data_hash: field,
        nonce: field,
    }

    /// AccessTokenInput - Helper struct for generating access tokens
    struct AccessTokenInput {
        record_id: field,
        doctor: address,
        patient: address,
        nonce: field,
    }

    // ========================================================================
    // PUBLIC STATE (MAPPINGS)
    // ========================================================================

    /// Maps access_token -> AccessGrant for verification
    /// Doctors use this to prove they have valid access
    mapping access_grants: field => AccessGrant;

    /// Maps record_id -> RecordMetadata for optional public indexing
    /// Patients can choose to make record existence public (not content)
    mapping record_metadata: field => RecordMetadata;

    /// Maps (patient_address as field) -> record_count for tracking
    /// Helps track how many records a patient has created
    mapping patient_record_count: field => u64;

    /// Maps access_token -> bool for quick validity checks
    /// Cheaper than reading full AccessGrant struct
    mapping access_token_valid: field => bool;

    // ========================================================================
    // TRANSITION FUNCTIONS
    // ========================================================================

    /// create_record - Create a new encrypted medical record
    ///
    /// Called by patients to store their encrypted medical data on-chain.
    /// The encryption must happen client-side before calling this function.
    ///
    /// @param data_part1-4: Encrypted medical data split into field elements
    /// @param record_type: Category of record (1=general, 2=lab, 3=prescription, 4=imaging, 5=vaccination)
    /// @param data_hash: Hash of original data for integrity verification
    /// @param nonce: Client-provided random nonce for unique ID generation
    /// @param make_discoverable: If true, adds to public record_metadata mapping
    ///
    /// @returns MedicalRecord owned by the caller
    async transition create_record(
        data_part1: field,
        data_part2: field,
        data_part3: field,
        data_part4: field,
        record_type: u8,
        data_hash: field,
        nonce: field,
        make_discoverable: bool
    ) -> (MedicalRecord, Future) {
        // Validate record_type is within acceptable range (1-10)
        assert(record_type >= 1u8 && record_type <= 10u8);

        // Generate unique record ID using hash of:
        // - Patient address (ensures uniqueness per patient)
        // - Data hash (ensures uniqueness per content)
        // - Client-provided nonce (prevents prediction, ensures uniqueness)
        let record_id: field = BHP256::hash_to_field(RecordIdInput {
            patient: self.caller,
            data_hash: data_hash,
            nonce: nonce,
        });

        // Create the medical record (private, owned by patient)
        let medical_record: MedicalRecord = MedicalRecord {
            owner: self.caller,
            record_id: record_id,
            data_hash: data_hash,
            data_part1: data_part1,
            data_part2: data_part2,
            data_part3: data_part3,
            data_part4: data_part4,
            record_type: record_type,
            created_at: 0u32, // Placeholder - actual block height is in metadata
            version: 1u8,
        };

        // Return record and future for on-chain state updates
        return (medical_record, finalize_create_record(
            self.caller,
            record_id,
            record_type,
            make_discoverable
        ));
    }

    /// Finalize create_record - Update on-chain state
    async function finalize_create_record(
        patient: address,
        record_id: field,
        record_type: u8,
        make_discoverable: bool
    ) {
        // Increment patient's record count
        let patient_key: field = patient as field;
        let current_count: u64 = patient_record_count.get_or_use(patient_key, 0u64);
        patient_record_count.set(patient_key, current_count + 1u64);

        // If patient wants record to be discoverable, add metadata
        if make_discoverable {
            let metadata: RecordMetadata = RecordMetadata {
                patient: patient,
                record_id: record_id,
                record_type: record_type,
                created_at: block.height,
                is_active: true,
            };
            record_metadata.set(record_id, metadata);
        }
    }

    /// grant_access - Grant temporary access to a healthcare provider
    ///
    /// Called by patients to share a specific record with a doctor.
    /// Generates a cryptographic access token that expires after specified duration.
    ///
    /// @param medical_record: The record to share (must be owned by caller)
    /// @param doctor: Address of the healthcare provider
    /// @param duration_blocks: How long access should last (in blocks)
    /// @param nonce: Client-provided random nonce for unique token generation
    ///
    /// @returns (MedicalRecord, access_token field)
    /// The access token should be encoded in QR code for the doctor to scan
    async transition grant_access(
        medical_record: MedicalRecord,
        doctor: address,
        duration_blocks: u32,
        nonce: field
    ) -> (MedicalRecord, field, Future) {
        // Validate caller owns the record (enforced by record ownership)
        // The fact that caller can pass this record proves ownership
        
        // Validate doctor address is not the patient themselves
        assert_neq(self.caller, doctor);

        // Validate duration is within acceptable bounds
        // Use ternary-like logic for bounds checking
        let clamped_min: u32 = duration_blocks < MIN_ACCESS_DURATION_BLOCKS ? MIN_ACCESS_DURATION_BLOCKS : duration_blocks;
        let safe_duration: u32 = clamped_min > MAX_ACCESS_DURATION_BLOCKS ? MAX_ACCESS_DURATION_BLOCKS : clamped_min;

        // Generate unique access token using hash of:
        // - Record ID
        // - Doctor address
        // - Patient address
        // - Client-provided nonce (prevents token prediction)
        let access_token: field = BHP256::hash_to_field(AccessTokenInput {
            record_id: medical_record.record_id,
            doctor: doctor,
            patient: self.caller,
            nonce: nonce,
        });

        // Return the record back to patient, the access token, and finalize future
        return (
            medical_record,
            access_token,
            finalize_grant_access(
                self.caller,
                doctor,
                medical_record.record_id,
                access_token,
                safe_duration
            )
        );
    }

    /// Finalize grant_access - Store access grant on-chain
    async function finalize_grant_access(
        patient: address,
        doctor: address,
        record_id: field,
        access_token: field,
        duration_blocks: u32
    ) {
        // Calculate expiration block height
        let expires_at: u32 = block.height + duration_blocks;

        // Create and store the access grant
        let grant: AccessGrant = AccessGrant {
            patient: patient,
            doctor: doctor,
            record_id: record_id,
            access_token: access_token,
            granted_at: block.height,
            expires_at: expires_at,
            is_revoked: false,
        };

        // Store in mappings
        access_grants.set(access_token, grant);
        access_token_valid.set(access_token, true);
    }

    /// verify_access - Verify if a doctor has valid access to a record
    ///
    /// Called by doctors (or the system) to check if access is still valid.
    /// This is a verification operation - transaction succeeds only if valid.
    ///
    /// @param access_token: The token received from patient's QR code
    /// @param doctor: The doctor's address (must match token)
    /// @param record_id: The record being accessed
    ///
    /// @returns Future - Transaction succeeds if access is valid, fails otherwise
    async transition verify_access(
        access_token: field,
        doctor: address,
        record_id: field
    ) -> Future {
        // Verification happens in async function where we can read mappings
        return finalize_verify_access(access_token, doctor, record_id);
    }

    /// Finalize verify_access - Check access validity on-chain
    async function finalize_verify_access(
        access_token: field,
        doctor: address,
        record_id: field
    ) {
        // Check if token exists and is valid
        let is_valid: bool = access_token_valid.get_or_use(access_token, false);
        assert(is_valid); // Fails if token doesn't exist or is invalid

        // Get the full access grant
        let grant: AccessGrant = access_grants.get(access_token);

        // Verify doctor address matches
        assert_eq(grant.doctor, doctor);

        // Verify record_id matches
        assert_eq(grant.record_id, record_id);

        // Verify not revoked
        assert(!grant.is_revoked);

        // Verify not expired
        assert(block.height <= grant.expires_at);

        // If all assertions pass, access is valid
        // The transaction succeeds, indicating valid access
    }

    /// revoke_access - Manually revoke access before expiration
    ///
    /// Called by patients to immediately revoke a doctor's access.
    /// Useful if patient changes their mind or suspects misuse.
    ///
    /// @param access_token: The token to revoke
    async transition revoke_access(
        access_token: field
    ) -> Future {
        return finalize_revoke_access(self.caller, access_token);
    }

    /// Finalize revoke_access - Mark access as revoked on-chain
    async function finalize_revoke_access(
        caller: address,
        access_token: field
    ) {
        // Get the existing grant
        let grant: AccessGrant = access_grants.get(access_token);

        // Verify caller is the patient who granted access
        assert_eq(grant.patient, caller);

        // Update grant with revoked status
        let revoked_grant: AccessGrant = AccessGrant {
            patient: grant.patient,
            doctor: grant.doctor,
            record_id: grant.record_id,
            access_token: grant.access_token,
            granted_at: grant.granted_at,
            expires_at: grant.expires_at,
            is_revoked: true,
        };

        // Update mappings
        access_grants.set(access_token, revoked_grant);
        access_token_valid.set(access_token, false);
    }

    /// get_access_info - Public view of access grant details
    ///
    /// Allows anyone to check the status of an access grant.
    /// Transaction fails if token doesn't exist.
    ///
    /// @param access_token: The token to look up
    async transition get_access_info(
        access_token: field
    ) -> Future {
        return finalize_get_access_info(access_token);
    }

    /// Finalize get_access_info - Read access grant from chain
    async function finalize_get_access_info(
        access_token: field
    ) {
        // Verify the token exists (will fail if not)
        // Reading the grant ensures the token is valid
        let grant: AccessGrant = access_grants.get(access_token);
        // Use the variable to satisfy compiler
        assert(grant.granted_at >= 0u32);
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /// compute_record_id - Helper to compute record ID off-chain
    /// 
    /// This is a pure function that allows clients to compute the record ID
    /// before calling create_record. Useful for client-side record tracking.
    ///
    /// @param patient: The patient's address
    /// @param data_hash: Hash of the encrypted data
    /// @param nonce: The nonce that will be used
    ///
    /// @returns The record_id that would be generated
    transition compute_record_id(
        patient: address,
        data_hash: field,
        nonce: field
    ) -> field {
        return BHP256::hash_to_field(RecordIdInput {
            patient: patient,
            data_hash: data_hash,
            nonce: nonce,
        });
    }

    /// compute_access_token - Helper to compute access token off-chain
    ///
    /// This is a pure function that allows clients to compute the access token
    /// before calling grant_access. Useful for QR code pre-generation.
    ///
    /// @param record_id: The record's ID
    /// @param doctor: The doctor's address
    /// @param patient: The patient's address
    /// @param nonce: The nonce that will be used
    ///
    /// @returns The access_token that would be generated
    transition compute_access_token(
        record_id: field,
        doctor: address,
        patient: address,
        nonce: field
    ) -> field {
        return BHP256::hash_to_field(AccessTokenInput {
            record_id: record_id,
            doctor: doctor,
            patient: patient,
            nonce: nonce,
        });
    }
}
