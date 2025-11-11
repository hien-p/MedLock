import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);

function buildWalrusArgsStore(filePath: string, epochs: number, context?: string, rpcUrl?: string) {
  const args = ['store', filePath, '--epochs', String(epochs)];
  if (context) args.push('--context', context);
  if (rpcUrl) args.push('--rpc-url', rpcUrl);
  return args;
}

function buildWalrusArgsRead(blobId: string, outPath: string, context?: string, rpcUrl?: string) {
  const args = ['read', blobId, '--out', outPath];
  if (context) args.push('--context', context);
  if (rpcUrl) args.push('--rpc-url', rpcUrl);
  return args;
}

export async function walrusStore(filePath: string, opts?: { epochs?: number; context?: string; rpcUrl?: string }) {
  const epochs = opts?.epochs ?? 2;
  const args = buildWalrusArgsStore(filePath, epochs, opts?.context, opts?.rpcUrl);
  const { stdout, stderr } = await execFileAsync('walrus', args, { maxBuffer: 50 * 1024 * 1024 });
  const out = `${stdout}\n${stderr}`;
  // Look for 0x-prefixed 64+ hex (Blob ID / Sui object id commonly printed by CLI)
  const m = out.match(/0x[0-9a-fA-F]{64,}/);
  if (!m) throw new Error(`Could not parse Walrus blob id from output. Full output:\n${out}`);
  return m[0];
}

export async function walrusRead(blobId: string, context?: string, rpcUrl?: string): Promise<Buffer> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'walrus-'));
  const out = path.join(tmp, 'blob.bin');
  const args = buildWalrusArgsRead(blobId, out, context, rpcUrl);
  await execFileAsync('walrus', args, { maxBuffer: 100 * 1024 * 1024 });
  const buf = await fs.readFile(out);
  await fs.rm(tmp, { recursive: true, force: true });
  return buf;
}
