import 'dotenv/config';
import * as fs from 'node:fs/promises';
import { walrusRead } from './utils/walrus-bridge.js';

function getArg(flag: string, fallback?: string) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i+1]) return process.argv[i+1];
  return fallback;
}

async function main() {
  const blobId = getArg('--blob');
  const outPath = getArg('--out', './downloaded.bin') ?? './downloaded.bin';
  if (!blobId) throw new Error('--blob <id> is required');
  const walrusContext = process.env.WALRUS_CONTEXT;
  const walrusRpc = process.env.WALRUS_RPC_URL;
  const data = await walrusRead(blobId, walrusContext, walrusRpc);
  await fs.writeFile(outPath, data);
  console.log(`Wrote ${data.length} bytes to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
