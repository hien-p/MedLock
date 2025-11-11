# Privacy-Preserving AI on Walrus

Medlock is a web-based dApp showcasing a privacy-preserving AI workflow for medical data, built on the **Walrus–Seal–Nautilus** stack. It allows a hospital (data owner) to encrypt and share an fMRI brain scan with an AI researcher in a way that no raw data is ever exposed

# Key Concepts


![Encrypted inference pipeline](public/seqtoseq.svg)

* Roles: **Data Owner (Hospital)** who uploads sensitive fMRI data, and **Researcher** who runs AI inference on the data.

* **Tech Stack**: Seal SDK handles on-device encryption and on-chain **consent policy** creation. **Walrus** provides **decentralized blob storage** (storing encrypted fMRI files with on-chain proofs) **Nautilus TEE** enclaves perform AI computation on the encrypted data and produce attested results. **Sui smart contracts** coordinate policy enforcement, consent, and audit logging.

* **Trust Guarantees**: Medlock visually highlights that data remains **encrypted at rest, in transit, and in use**. Decryption happens only inside a verified TEE enclave; all access is gated by on-chain policy and enclave attestation . Every action (data upload, access request, result submission) leaves an audit trail on-chain , assuring the user of compliance and accountability.




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
