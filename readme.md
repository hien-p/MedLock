# Privacy-Preserving AI on Walrus

Safely training and deploying AI on biomedical data (like fMRI scans) is blocked by privacy regulation and brittle custodial workflows. Traditional cloud pipelines require blind trust in operators, routinely violating GDPR/HIPAA principles around data minimization, provenance, and auditability.

This repo documents a zero-trust alternative built on the Walrus ecosystem. Every step—encryption, storage, computation, and audit—is cryptographically verifiable and never exposes raw patient data outside of a hardware-enforced enclave.


## Solution Overview

- **Walrus** stores encrypted datasets in decentralized blob storage with integrity proofs.
- **Seal** enforces Move-based access control and manages threshold encryption, only releasing key shares for approved identities or enclaves.
- **Nautilus** executes inference workloads inside TEEs (AWS Nitro) and emits signed, attestable outputs.
- **Sui blockchain** coordinates policies, attestation verification, and immutable logging.

The result is an end-to-end workflow where data is encrypted at the source, decrypted only inside a verified enclave, and every access is transparently recorded on-chain.


## End-to-End Flow

1. **Encrypt at the edge** – Hospitals use the Seal SDK to encrypt scans locally under a policy defined in Move smart contracts.
2. **Store immutably** – Ciphertexts are uploaded via the Walrus CLI/API. Walrus keeps verifiable commitments to each blob for later auditing.
3. **Request computation** – Authorized researchers submit an inference job; the request is checked against on-chain policy.
4. **Verify enclave** – A Nautilus enclave attests itself on-chain. Once verified, Seal’s threshold key servers release the necessary key shares.
5. **Run privately** – The enclave decrypts the blobs inside secure memory, executes the AI model, and never exposes plaintext outside the TEE boundary.
6. **Log & prove** – The enclave signs the result. Attestation plus signature is recorded on Sui, creating a tamper-proof compliance trail.


## Technical Stack

- **Smart Contracts (Move):** Access control, attestation checks, and audit logging.
- **Seal SDK (TypeScript):** Client-side encryption, policy binding, and threshold key orchestration.
- **Walrus CLI / API:** Interaction with decentralized blob storage on Sui Testnet.
- **Nautilus (Rust):** Enclave lifecycle management and proof generation.
- **AWS Nitro Enclaves:** Trusted Execution Environment hosting Nautilus workloads.
- **Sui Blockchain:** Coordination layer for policy enforcement and verifiable logging.
