module privacy_pipeline::enclave_registry {
    use sui::event;
    use sui::table::{Self, Table};
    use sui::nitro_attestation::{Self, NitroAttestationDocument};

    /// Errors
    const E_NOT_ADMIN: u64 = 1;
    const E_BAD_PCRS: u64 = 2;
    const E_NO_PUBKEY: u64 = 3;
    const E_ALREADY_REGISTERED: u64 = 4;

    /// PCR expectation (index + expected bytes)
    public struct ExpectedPCR has copy, drop, store {
        index: u8,
        value: vector<u8>,
    }

    /// Shared registry of approved enclaves (keyed by PCR8 bytes)
    public struct Registry has key {
        id: object::UID,
        expected: vector<ExpectedPCR>,               // list of PCR constraints
        enclaves: Table<vector<u8>, vector<u8>>,     // PCR8 -> ed25519 pubkey bytes
    }

    /// Capability proving admin control of the registry.
    public struct RegistryAdminCap has key {
        id: object::UID,
        registry_id: object::ID,
        controller: address,
    }

    /// Emitted when a new enclave is registered
    public struct EnclaveRegistered has copy, drop {
        pcr8: vector<u8>,
        pubkey: vector<u8>,
        registrar: address,
    }

    /// Create & share the registry singleton. The caller becomes admin.
    fun init(ctx: &mut tx_context::TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            expected: vector::empty<ExpectedPCR>(),
            enclaves: table::new<vector<u8>, vector<u8>>(ctx),
        };

        let cap = RegistryAdminCap {
            id: object::new(ctx),
            registry_id: object::uid_to_inner(&registry.id),
            controller: tx_context::sender(ctx),
        };
        transfer::share_object(registry);
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    /// Admin: add a PCR constraint (e.g., index=8 with expected measurement)
    entry fun set_expected_pcr(registry: &mut Registry, cap: &RegistryAdminCap, index: u8, value: vector<u8>) {
        assert_admin(registry, cap);
        vector::push_back(&mut registry.expected, ExpectedPCR { index, value });
    }

    /// Register an enclave using a pre-verified Nitro attestation document and store its pubkey under PCR8.
    ///
    /// Callers should first invoke `sui::nitro_attestation::load_nitro_attestation` within the same programmable
    /// transaction, then feed the resulting `NitroAttestationDocument` into this function.
    public fun register_enclave(
        cap: &RegistryAdminCap,
        registry: &mut Registry,
        doc: NitroAttestationDocument,
    ) {
        assert_admin(registry, cap);

        // 1) Check our expected PCR constraints
        assert!(check_expected(&doc, &registry.expected), E_BAD_PCRS);

        // 2) Extract enclave pubkey from attestation (DER‑encoded ed25519 key expected by the app)
        let pk_opt_ref = nitro_attestation::public_key(&doc);          // &Option<vector<u8>>
        assert!(option::is_some(pk_opt_ref), E_NO_PUBKEY);
        let pubkey = bytes_clone(option::borrow(pk_opt_ref));

        // 3) Use PCR8 value as the enclave identity key
        let pcr8 = pcr_value(&doc, 8u8);                               // AWS supports PCR0..4,8 :contentReference[oaicite:13]{index=13}
        let pcr_for_contains = bytes_clone(&pcr8);
        assert!(!table::contains(&registry.enclaves, pcr_for_contains), E_ALREADY_REGISTERED);

        let pk_for_event = bytes_clone(&pubkey);
        let pcr_for_table = bytes_clone(&pcr8);
        table::add(&mut registry.enclaves, pcr_for_table, pubkey);
        event::emit(EnclaveRegistered { pcr8, pubkey: pk_for_event, registrar: cap.controller });
    }

    /// Borrow the stored pubkey for a given PCR8
    public fun borrow_pubkey(registry: &Registry, pcr8: &vector<u8>) : &vector<u8> {
        table::borrow(&registry.enclaves, bytes_clone(pcr8))
    }

    // ----------------- helpers -----------------

    fun assert_admin(registry: &Registry, cap: &RegistryAdminCap) {
        assert!(cap.registry_id == object::uid_to_inner(&registry.id), E_NOT_ADMIN);
    }

    /// Read PCR bytes for `index` or return empty vec
    fun pcr_value(doc: &NitroAttestationDocument, index: u8) : vector<u8> {
        let p = nitro_attestation::pcrs(doc);                          // &vector<PCREntry> :contentReference[oaicite:14]{index=14}
        let n = vector::length(p);
        let mut i = 0;
        while (i < n) {
            let e = vector::borrow(p, i);
            if (nitro_attestation::index(e) == index) {
                return bytes_clone(nitro_attestation::value(e))
            };
            i = i + 1;
        };
        vector::empty<u8>()
    }

    /// Ensure every expected PCR appears with exact bytes in the attestation
    fun check_expected(doc: &NitroAttestationDocument, expected: &vector<ExpectedPCR>) : bool {
        let n = vector::length(expected);
        let mut i = 0;
        while (i < n) {
            let exp = vector::borrow(expected, i);
            let have = pcr_value(doc, exp.index);
            if (!bytes_eq(&have, &exp.value)) return false;
            i = i + 1;
        };
        true
    }

    fun bytes_eq(a: &vector<u8>, b: &vector<u8>) : bool {
        let la = vector::length(a);
        let lb = vector::length(b);
        if (la != lb) return false;
        let mut i = 0;
        while (i < la) {
            if (*vector::borrow(a, i) != *vector::borrow(b, i)) return false;
            i = i + 1;
        };
        true
    }

    fun bytes_clone(src: &vector<u8>) : vector<u8> {
        let mut out = vector::empty<u8>();
        let len = vector::length(src);
        let mut i = 0;
        while (i < len) {
            vector::push_back(&mut out, *vector::borrow(src, i));
            i = i + 1;
        };
        out
    }
}
