import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';

export async function cleanDotFilesIfNotRequested(outDir: string, dotRequested: boolean, verbose = false) {
  if (!outDir || dotRequested) return;
  try {
    // Recursively remove any .dot files under outDir. This covers nested
    // DOTs that might have been produced previously or left behind.
    async function removeDotsRecursively(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [] as Dirent[]);
      for (const e of entries) {
        try {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) {
            await removeDotsRecursively(p);
          } else if (e.isFile() && e.name.endsWith('.dot')) {
            await fs.rm(p).catch(() => {});
            if (verbose) console.log(`Removed DOT file ${p} because --dot not requested`);
          }
        } catch {
          // ignore errors during cleanup
        }
      }
    }
    await removeDotsRecursively(outDir);
  } catch {
    // best-effort: ignore cleanup errors
  }
}

export default cleanDotFilesIfNotRequested;
