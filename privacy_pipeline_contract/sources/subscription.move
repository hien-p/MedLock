module privacy_pipeline::subscription {
    // === Imports ===
    use std::string::String;

    // === Errors ===
    const EFeeMismatch: u64 = 1;
    const EPublishUnauthorized: u64 = 0;
    const EApprovalFailure: u64 = 2;

    // === Constants ===
    const PUBLISH_VALUE: u64 = 3;

    // === Structs ===
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

    // === Public Functions ===
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

    public fun publish(service: &mut Service, cap: &Cap, key: String) {
        assert!(cap.service_id == sui::object::id(service), EPublishUnauthorized);
        sui::dynamic_field::add<String, u64>(&mut service.id, key, PUBLISH_VALUE);
    }

    public fun subscribe(
        payment: sui::coin::Coin<sui::sui::SUI>,
        service: &Service,
        clk: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext,
    ): Subscription {
        assert!(sui::coin::value(&payment) == service.fee, EFeeMismatch);
        sui::transfer::public_transfer<sui::coin::Coin<sui::sui::SUI>>(payment, service.owner);
        Subscription {
            id: sui::object::new(ctx),
            service_id: sui::object::id(service),
            created_at: sui::clock::timestamp_ms(clk),
        }
    }

    public fun transfer(subscription: Subscription, recipient: address) {
        sui::transfer::transfer<Subscription>(subscription, recipient);
    }

    // === Entry Functions ===
    entry fun create_service_entry(
        fee: u64,
        ttl: u64,
        name: String,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        sui::transfer::transfer<Cap>(create_service(fee, ttl, name, ctx), sui::tx_context::sender(ctx));
    }

    entry fun seal_approve(
        namespace_bytes: vector<u8>,
        subscription: &Subscription,
        service: &Service,
        clk: &sui::clock::Clock,
    ) {
        assert!(approve_internal(namespace_bytes, subscription, service, clk), EApprovalFailure);
    }

    // === Private Functions ===
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
}
