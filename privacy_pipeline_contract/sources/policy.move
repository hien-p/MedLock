module privacy_pipeline::policy;

    use sui::bcs;

    /// Errors
    const E_BAD_ID: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_TOO_EARLY: u64 = 3;

    /// Identity encoding (BCS):
    ///   bytes = BCS(address allowed, u64 not_before_ms)
    ///
    /// Approves iff:
    ///   - tx sender == `allowed`
    ///   - clock.timestamp_ms() >= `not_before_ms`
    ///
    /// Seal requires: entry fun, name starts with `seal_approve*`, first arg vector<u8>, no return. :contentReference[oaicite:5]{index=5}
    entry fun seal_approve_access(id: vector<u8>, clock: &sui::clock::Clock, ctx: &tx_context::TxContext) {
        // Decode ID
        let mut data = bcs::new(id);
        let allowed = bcs::peel_address(&mut data);
        let not_before = bcs::peel_u64(&mut data);
        let leftovers = bcs::into_remainder_bytes(data);
        assert!(vector::length(&leftovers) == 0, E_BAD_ID);

        // Enforce sender + time
        let sender = tx_context::sender(ctx);               // tx signer address :contentReference[oaicite:6]{index=6}
        assert!(sender == allowed, E_NOT_AUTHORIZED);
        let now = sui::clock::timestamp_ms(clock);          // on-chain time via the shared Clock object (0x6) :contentReference[oaicite:7]{index=7}
        assert!(now >= not_before, E_TOO_EARLY);
    }
