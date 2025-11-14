import fs from 'fs/promises';

const roots: string[] = [];

export function registerTempRoot(dir: string) {
  roots.push(dir);
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
