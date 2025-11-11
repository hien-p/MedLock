import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SealClient, EncryptedObject } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromHEX } from '@mysten/sui/utils';
import { walrusStore } from './utils/walrus-bridge.js';

function getArg(flag: string, fallback?: string) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i+1]) return process.argv[i+1];
  return fallback;
}

async function main() {
  const inPath = getArg('--in');
  const outPath = getArg('--out', './encrypted.bin');
  if (!inPath) throw new Error('--in <file> is required');

  const suiNetwork = process.env.SUI_NETWORK || 'testnet';
  const suiClient = new SuiClient({ url: getFullnodeUrl(suiNetwork as any) });

  const servers = (process.env.SEAL_KEY_SERVERS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (servers.length === 0) throw new Error('Set SEAL_KEY_SERVERS (comma-separated onchain object IDs) in .env');
  const threshold = parseInt(process.env.SEAL_THRESHOLD || String(Math.min(2, servers.length)), 10);
  const verifyKeyServers = (process.env.SEAL_VERIFY_KEY_SERVERS || 'false').toLowerCase() === 'true';

  const client = new SealClient({
    suiClient,
    serverConfigs: servers.map((objectId) => ({ objectId, weight: 1 })),
    verifyKeyServers,
  });

  const pkgIdHex = process.env.SEAL_PACKAGE_ID;
  if (!pkgIdHex) throw new Error('SEAL_PACKAGE_ID is required');
  const policyIdHex = (process.env.SEAL_POLICY_ID || '00'); // can be empty vector if unused

  const data = await fs.readFile(inPath);

  const { encryptedObject, key: backupKey } = await client.encrypt({
    threshold,
    packageId: fromHEX(pkgIdHex),
    id: fromHEX(policyIdHex),
    data,
  });

  // Persist ciphertext
  await fs.writeFile(outPath, encryptedObject);
  console.log(`Wrote ciphertext -> ${outPath}`);

  // Also show some metadata for debugging
  const parsed = EncryptedObject.parse(encryptedObject);
  console.log(`Seal metadata: packageId=${parsed.packageId} id=${parsed.id} threshold=${parsed.threshold}`);

  // Store on Walrus
  const epochs = parseInt(process.env.WALRUS_EPOCHS || '2', 10);
  const walrusContext = process.env.WALRUS_CONTEXT;
  const walrusRpc = process.env.WALRUS_RPC_URL;
  const blobId = await walrusStore(outPath, { epochs, context: walrusContext, rpcUrl: walrusRpc });
  console.log(`Blob ID: ${blobId}`);

  // (Optional) persist backup key for disaster recovery (DO NOT ship this in production)
  const keyOut = path.resolve(path.dirname(outPath), path.basename(outPath) + '.backupKey.hex');
  await fs.writeFile(keyOut, Buffer.from(backupKey).toString('hex'));
  console.log(`Backup symmetric key saved at: ${keyOut}`);

  // Emit a machine-readable JSON line for scripting
  console.log(JSON.stringify({ blobId, outPath, keyHex: Buffer.from(backupKey).toString('hex') }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
