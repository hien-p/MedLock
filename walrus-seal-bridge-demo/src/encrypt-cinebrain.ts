// encrypt-cinebrain.ts
import fs from 'node:fs';
import path from 'node:path';
import { TextEncoder } from 'node:util';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SealClient } from '@mysten/seal';

const PACKAGE_ID = '0xYOUR_PACKAGE_ID';
const INPUT_DIR = './public/cinebrain_samples';
const OUTPUT_DIR = './public/encrypted';
const THRESHOLD = 2;

const KEY_SERVERS = [
  { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
  { objectId: '0xf5d1c96bacc59e9db4102ab7ceee9465ca2059346fbe1aee13a14916f40523c8', weight: 1 },
];

const encoder = new TextEncoder();

async function main() {
  const sui = new SuiClient({ url: getFullnodeUrl('testnet') });

  // Initialize Seal client with the given key servers (2/2 threshold demo)
  const seal = new SealClient({
    suiClient: sui,
    serverConfigs: KEY_SERVERS,
    verifyKeyServers: false,
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const fileName of fs.readdirSync(INPUT_DIR)) {
    const inPath = path.join(INPUT_DIR, fileName);
    if (!fs.statSync(inPath).isFile()) continue;

    const data = new Uint8Array(fs.readFileSync(inPath));
    const idBytes = encoder.encode(`medlock:${fileName}`);
    const id = `0x${Buffer.from(idBytes).toString('hex')}`;

    const { encryptedObject: encryptedBytes } = await seal.encrypt({
      threshold: THRESHOLD,
      packageId: PACKAGE_ID,
      id,
      data,
    });

    const outPath = path.join(OUTPUT_DIR, `${fileName}.enc`);
    fs.writeFileSync(outPath, Buffer.from(encryptedBytes));
    console.log(`Encrypted: ${inPath} -> ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
