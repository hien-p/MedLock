import 'dotenv/config';
import fetch from 'node-fetch';
import { walrusRead } from './utils/walrus-bridge.js';

function getArg(flag: string, fallback?: string) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i+1]) return process.argv[i+1];
  return fallback;
}

async function main() {
  const blobId = getArg('--blob');
  const enclaveUrl = getArg('--enclave', process.env.ENCLAVE_URL || 'http://localhost:3000');
  if (!blobId) throw new Error('--blob <id> is required');
  if (!enclaveUrl) throw new Error('--enclave <url> is required or set ENCLAVE_URL');

  const walrusContext = process.env.WALRUS_CONTEXT;
  const walrusRpc = process.env.WALRUS_RPC_URL;
  const ciphertext = await walrusRead(blobId, walrusContext, walrusRpc);
  const b64 = ciphertext.toString('base64');

  const res = await fetch(`${enclaveUrl.replace(/\/$/, '')}/process_data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ encrypted_data_b64: b64, blob_id: blobId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Enclave responded ${res.status}: ${err}`);
  }
  const json = await res.json();
  console.log('Enclave response:');
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
