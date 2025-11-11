import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SealClient, EncryptedObject } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { walrusStore } from './utils/walrus-bridge.js';

function getArg(flag: string, fallback?: string) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const inPath = getArg('--in');
  if (!inPath) throw new Error('--in <file> is required');
  const inputPath = inPath;
  const outPath = getArg('--out', './encrypted.bin') ?? './encrypted.bin';

  const suiNetwork = process.env.SUI_NETWORK || 'testnet';
  const suiClient = new SuiClient({ url: getFullnodeUrl(suiNetwork as any) });

  const servers = (process.env.SEAL_KEY_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length === 0) {
    throw new Error('Set SEAL_KEY_SERVERS (comma-separated onchain object IDs) in .env');
  }
  const threshold = parseInt(process.env.SEAL_THRESHOLD || String(Math.min(2, servers.length)), 10);
  const verifyKeyServers = (process.env.SEAL_VERIFY_KEY_SERVERS || 'false').toLowerCase() === 'true';

  const client = new SealClient({
    suiClient,
    serverConfigs: servers.map((objectId) => ({ objectId, weight: 1 })),
    verifyKeyServers,
  });

  const pkgIdHex = process.env.SEAL_PACKAGE_ID;
  if (!pkgIdHex) throw new Error('SEAL_PACKAGE_ID is required');
  const policyIdHex = process.env.SEAL_POLICY_ID || '0x00';

  const data = await fs.readFile(inputPath);

  const { encryptedObject, key: backupKey } = await client.encrypt({
    threshold,
    packageId: pkgIdHex,
    id: policyIdHex,
    data,
  });

  await fs.writeFile(outPath, encryptedObject);
  console.log(`Wrote ciphertext -> ${outPath}`);

  const parsed = EncryptedObject.parse(encryptedObject);
  console.log(`Seal metadata: packageId=${parsed.packageId} id=${parsed.id} threshold=${parsed.threshold}`);

  const epochs = parseInt(process.env.WALRUS_EPOCHS || '2', 10);
  const walrusContext = process.env.WALRUS_CONTEXT;
  const walrusRpc = process.env.WALRUS_RPC_URL;
  const blobId = await walrusStore(outPath, { epochs, context: walrusContext, rpcUrl: walrusRpc });
  console.log(`Blob ID: ${blobId}`);

  const keyOut = path.resolve(path.dirname(outPath), `${path.basename(outPath)}.backupKey.hex`);
  await fs.writeFile(keyOut, Buffer.from(backupKey).toString('hex'));
  console.log(`Backup symmetric key saved at: ${keyOut}`);

  console.log(JSON.stringify({ blobId, outPath, keyHex: Buffer.from(backupKey).toString('hex') }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
