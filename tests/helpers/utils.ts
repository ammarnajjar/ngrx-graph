import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const roots: string[] = [];

export function registerTempRoot(dir: string) {
  roots.push(dir);
}

export async function createTempDir(suffix = ''): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-'));
  const dir = suffix ? path.join(base, suffix) : base;
  await fs.mkdir(dir, { recursive: true });
  registerTempRoot(base);
  return dir;
}

export async function cleanupTempRoots() {
  for (const r of roots) {
    try {
      await fs.rm(r, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  roots.length = 0;
}

// register a global afterEach to run cleanup for tests that import this helper
if (typeof afterEach === 'function') {
  afterEach(async () => {
    await cleanupTempRoots();
  });
}
