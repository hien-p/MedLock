module privacy_pipeline::allowlist {
    use std::string::String;

    use sui::dynamic_field;
    use sui::object;
    use sui::transfer;
    use sui::tx_context;

    const E_CAP_MISMATCH: u64 = 0;
    const E_APPROVAL_FAILED: u64 = 1;
    const E_ALREADY_ADDED: u64 = 2;
    const PUBLISH_VALUE: u64 = 3;

    public struct Allowlist has key {
        id: object::UID,
        name: String,
        list: vector<address>,
    }

    public struct Cap has key {
        id: object::UID,
        allowlist_id: object::ID,
    }

    public fun add(allowlist: &mut Allowlist, cap: &Cap, addr: address) {
        assert!(cap.allowlist_id == object::id(allowlist), E_CAP_MISMATCH);
        assert!(!vector::contains(&allowlist.list, &addr), E_ALREADY_ADDED);
        vector::push_back(&mut allowlist.list, addr);
    }

    fun approve_internal(addr: address, namespace_bytes: vector<u8>, allowlist: &Allowlist): bool {
        let ns = namespace(allowlist);
        if (vector::length(&ns) > vector::length(&namespace_bytes)) {
            return false;
        };

        let mut i = 0;
        while (i < vector::length(&ns)) {
            if (*vector::borrow(&ns, i) != *vector::borrow(&namespace_bytes, i)) {
                return false;
            };
            i = i + 1;
        };

        vector::contains(&allowlist.list, &addr)
    }

    public fun create_allowlist(name: String, ctx: &mut tx_context::TxContext): Cap {
        let allowlist = Allowlist {
            id: object::new(ctx),
            name,
            list: vector::empty<address>(),
        };

        let cap = Cap {
            id: object::new(ctx),
            allowlist_id: object::id(&allowlist),
        };

        transfer::share_object<Allowlist>(allowlist);
        cap
    }

    entry fun create_allowlist_entry(name: String, ctx: &mut tx_context::TxContext) {
        transfer::transfer<Cap>(create_allowlist(name, ctx), tx_context::sender(ctx));
    }

    public fun namespace(allowlist: &Allowlist): vector<u8> {
        object::uid_to_bytes(&allowlist.id)
    }

    public fun publish(allowlist: &mut Allowlist, cap: &Cap, key: String) {
        assert!(cap.allowlist_id == object::id(allowlist), E_CAP_MISMATCH);
        dynamic_field::add<String, u64>(&mut allowlist.id, key, PUBLISH_VALUE);
    }

    public fun remove(allowlist: &mut Allowlist, cap: &Cap, addr: address) {
        assert!(cap.allowlist_id == object::id(allowlist), E_CAP_MISMATCH);

        let len = vector::length(&allowlist.list);
        let mut write = 0;
        let mut read = 0;
        while (read < len) {
            let candidate = *vector::borrow(&allowlist.list, read);
            if (candidate != addr) {
                let slot = vector::borrow_mut(&mut allowlist.list, write);
                *slot = candidate;
                write = write + 1;
            };
            read = read + 1;
        };

        while (vector::length(&allowlist.list) > write) {
            vector::pop_back(&mut allowlist.list);
        };
    }

    entry fun seal_approve(namespace_bytes: vector<u8>, allowlist: &Allowlist, ctx: &tx_context::TxContext) {
        assert!(approve_internal(tx_context::sender(ctx), namespace_bytes, allowlist), E_APPROVAL_FAILED);
    }
}
