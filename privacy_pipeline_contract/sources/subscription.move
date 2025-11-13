module privacy_pipeline::subscription {
    use std::string::String;

    const E_FEE_MISMATCH: u64 = 1;
    const E_PUBLISH_UNAUTHORIZED: u64 = 0;
    const E_APPROVAL_FAILURE: u64 = 2;
    const PUBLISH_VALUE: u64 = 3;

    public struct Service has key {
        id: sui::object::UID,
        fee: u64,
        ttl: u64,
        owner: address,
        name: String,
    }

    public struct Subscription has key {
        id: sui::object::UID,
        service_id: sui::object::ID,
        created_at: u64,
    }

    public struct Cap has key {
        id: sui::object::UID,
        service_id: sui::object::ID,
    }

    public fun transfer(subscription: Subscription, recipient: address) {
        sui::transfer::transfer<Subscription>(subscription, recipient);
    }

    fun approve_internal(
        namespace_bytes: vector<u8>,
        subscription: &Subscription,
        service: &Service,
        clk: &sui::clock::Clock,
    ): bool {
        if (sui::object::id(service) != subscription.service_id) {
            return false
        };
        if (sui::clock::timestamp_ms(clk) > subscription.created_at + service.ttl) {
            return false
        };

        let ns = sui::object::uid_to_bytes(&service.id);
        if (vector::length(&ns) > vector::length(&namespace_bytes)) {
            return false
        };

        let mut i = 0;
        while (i < vector::length(&ns)) {
            if (*vector::borrow(&ns, i) != *vector::borrow(&namespace_bytes, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }

    public fun create_service(
        fee: u64,
        ttl: u64,
        name: String,
        ctx: &mut sui::tx_context::TxContext,
    ): Cap {
        let service = Service {
            id: sui::object::new(ctx),
            fee,
            ttl,
            owner: sui::tx_context::sender(ctx),
            name,
        };
        let cap = Cap {
            id: sui::object::new(ctx),
            service_id: sui::object::id(&service),
        };
        sui::transfer::share_object<Service>(service);
        cap
    }

    entry fun create_service_entry(
        fee: u64,
        ttl: u64,
        name: String,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        sui::transfer::transfer<Cap>(create_service(fee, ttl, name, ctx), sui::tx_context::sender(ctx));
    }

    public fun publish(service: &mut Service, cap: &Cap, key: String) {
        assert!(cap.service_id == sui::object::id(service), E_PUBLISH_UNAUTHORIZED);
        sui::dynamic_field::add<String, u64>(&mut service.id, key, PUBLISH_VALUE);
    }

    entry fun seal_approve(
        namespace_bytes: vector<u8>,
        subscription: &Subscription,
        service: &Service,
        clk: &sui::clock::Clock,
    ) {
        assert!(approve_internal(namespace_bytes, subscription, service, clk), E_APPROVAL_FAILURE);
    }

    public fun subscribe(
        payment: sui::coin::Coin<sui::sui::SUI>,
        service: &Service,
        clk: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext,
    ): Subscription {
        assert!(sui::coin::value(&payment) == service.fee, E_FEE_MISMATCH);
        sui::transfer::public_transfer<sui::coin::Coin<sui::sui::SUI>>(payment, service.owner);
        Subscription {
            id: sui::object::new(ctx),
            service_id: sui::object::id(service),
            created_at: sui::clock::timestamp_ms(clk),
        }
    }
}
