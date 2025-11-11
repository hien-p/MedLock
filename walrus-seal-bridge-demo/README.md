# Walrus + Seal bridge demo (orchestrator)

This mini-project wires **Seal** (policy-based encryption) with **Walrus** (blob storage) and provides a tiny orchestrator to hand ciphertext to a TEE enclave.

## What you get
- `src/encrypt_and_store.ts`: Encrypt any file with Seal, save ciphertext, `walrus store` it, and print the Walrus **Blob ID**.
- `src/read_from_walrus.ts`: Download a blob (`walrus read`) by Blob ID.
- `src/start_job.ts`: Pull ciphertext by Blob ID and POST it (base64) to an enclave's `/process_data` endpoint.
- `src/utils/walrus-bridge.ts`: Thin wrapper around the Walrus CLI.

## Prereqs
- Node.js 18+
- Walrus & Sui CLI installed and configured (wallet on the right network, WAL test tokens for storage).
  - `walrus store <FILE> --epochs <N>` and `walrus read <BLOB_ID>` are the same commands we call under the hood.
- Your Move package with a `seal_approve*` policy deployed; collect its **package id**.
- A list of **Seal key server object IDs** for your network (see Seal docs).

## Install
```bash
npm i
cp .env.example .env
# edit .env (SEAL_PACKAGE_ID, SEAL_KEY_SERVERS, etc.)
```

## 1) Encrypt a file and store on Walrus
```bash
npx tsx src/encrypt_and_store.ts --in ./fmri_data.bin --out ./encrypted_fmri.bin
# -> prints: Blob ID: 0x....  and writes encrypted_fmri.bin
```

## 2) Read a blob (optional check)
```bash
npx tsx src/read_from_walrus.ts --blob 0xBLOB_ID --out ./downloaded.bin
```

## 3) Start enclave job with the ciphertext
```bash
npx tsx src/start_job.ts --blob 0xBLOB_ID --enclave $ENCLAVE_URL
```

## Notes
- If your Walrus CLI doesn't support `--context`, unset `WALRUS_CONTEXT` in `.env`. The CLI will then use its configured wallet network or the `--rpc-url` you provide.
- This repo purposely **does not** attempt to fetch keys from Seal inside the enclave. For a real integration, port the Seal key-server calls into your TEE or provision a key through a secure channel after attestation.
