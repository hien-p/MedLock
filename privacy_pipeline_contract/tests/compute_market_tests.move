#[test_only]
module privacy_pipeline::compute_market_tests {
    use sui::test_scenario;
    use sui::coin;
    use sui::sui::SUI;
    use std::string;
    use sui::clock;
    use privacy_pipeline::compute_market::{Self, ComputeRequest};
    use privacy_pipeline::subscription;
    use privacy_pipeline::enclave_registry;

    // Mock data
    const ADMIN: address = @0xAD;
    const USER: address = @0xCAFE;
    const WORKER: address = @0xBEEF;
    
    const FEE: u64 = 100;
    const TTL: u64 = 10000;

    #[test]
    fun test_end_to_end_flow() {
        let mut scenario = test_scenario::begin(ADMIN);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // 1. Setup Registry & Subscription Service
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            enclave_registry::init_for_testing(test_scenario::ctx(&mut scenario));
            
            // Create Service
            let cap = subscription::create_service(
                FEE, 
                TTL, 
                string::utf8(b"Privacy Service"), 
                test_scenario::ctx(&mut scenario)
            );
            subscription::transfer_cap(cap, ADMIN);
        };

        // 1b. Configure Service (Must be next tx to take shared object)
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut service = test_scenario::take_shared<subscription::Service>(&scenario);
            let cap = test_scenario::take_from_sender<subscription::Cap>(&scenario);
            
            subscription::publish(&mut service, &cap, string::utf8(b"mock_pcr_key"));
            
            test_scenario::return_shared(service);
            test_scenario::return_to_sender(&scenario, cap);
        };

        // 2. User Subscribes
        test_scenario::next_tx(&mut scenario, USER);
        {
            let service = test_scenario::take_shared<subscription::Service>(&scenario);
            let payment = coin::mint_for_testing<SUI>(FEE, test_scenario::ctx(&mut scenario));
            
            let sub = subscription::subscribe(payment, &service, &clock, test_scenario::ctx(&mut scenario));
            subscription::transfer(sub, USER);
            
            test_scenario::return_shared(service);
        };

        // 3. User Requests Compute
        test_scenario::next_tx(&mut scenario, USER);
        {
            let service = test_scenario::take_shared<subscription::Service>(&scenario);
            let sub = test_scenario::take_from_sender<subscription::Subscription>(&scenario);
            let payment = coin::mint_for_testing<SUI>(FEE, test_scenario::ctx(&mut scenario));
            
            // Construct a "PCR" that satisfies the subscription check (starts with service ID)
            let mut model_pcr = subscription::service_id_bytes(&service);
            vector::push_back(&mut model_pcr, 1); // Add some extra bytes
            
            compute_market::request_compute(
                payment,
                string::utf8(b"input_blob_id"),
                model_pcr,
                vector[1, 2, 3], // public_key
                &sub,
                &service,
                &clock,
                test_scenario::ctx(&mut scenario)
            );

            test_scenario::return_shared(service);
            test_scenario::return_to_sender(&scenario, sub);
        };

        // 4. Worker Fulfills Request
        test_scenario::next_tx(&mut scenario, WORKER);
        {
            let request = test_scenario::take_shared<ComputeRequest>(&scenario);
            let mut registry = test_scenario::take_shared<enclave_registry::Registry>(&scenario);
            
            // Register the worker manually for testing
            let service = test_scenario::take_shared<subscription::Service>(&scenario);
            let mut model_pcr = subscription::service_id_bytes(&service);
            vector::push_back(&mut model_pcr, 1);
            test_scenario::return_shared(service);

            enclave_registry::force_register_for_testing(&mut registry, model_pcr, vector[1, 2, 3]);

            compute_market::fulfill_request(
                request,
                &registry,
                string::utf8(b"output_blob_id"),
                vector[], // signature
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
