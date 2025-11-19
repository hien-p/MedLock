module privacy_pipeline::result_logger {
    // === Imports ===
    use sui::bcs;
    use sui::event;
    use sui::ed25519;
    use privacy_pipeline::enclave_registry::{Self, Registry};

    // === Errors ===
    const EBadSig: u64 = 1;

    // === Structs ===
    /// Canonical payload the enclave signs (BCS-encoded)
    public struct SignedResult has copy, drop, store {
        pcr8: vector<u8>,
        result: u64,
        timestamp_ms: u64,
    }

    // === Events ===
    /// Emitted after a verified result
    public struct ResultLogged has copy, drop {
        pcr8: vector<u8>,
        result: u64,
        timestamp_ms: u64,
        by: address,
    }

    // === Entry Functions ===
    /// Verify an enclave-signed result and log it as an event.
    ///
    /// Message to sign = BCS( SignedResult{ pcr8, result, timestamp_ms } )
    /// Signature scheme: Ed25519 (verified with sui::ed25519::ed25519_verify).
    entry fun submit_result(
        registry: &Registry,
        pcr8: vector<u8>,
        result: u64,
        timestamp_ms: u64,
        signature: vector<u8>,
        ctx: &tx_context::TxContext,
    ) {
        // Look up enclave pubkey from the registry (registered via attestation)
        let pk_ref = enclave_registry::borrow_pubkey(registry, &pcr8);

        // Build canonical message
        let msg = bcs::to_bytes(&SignedResult {
            pcr8: bytes_clone(&pcr8),
            result,
            timestamp_ms
        });

        // Verify signature (true => valid)
        let ok = ed25519::ed25519_verify(&signature, pk_ref, &msg);
        assert!(ok, EBadSig);

        // Emit a verifiable log
        event::emit(ResultLogged {
            pcr8,
            result,
            timestamp_ms,
            by: tx_context::sender(ctx),
        });
    }

    // === Private Functions ===
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
