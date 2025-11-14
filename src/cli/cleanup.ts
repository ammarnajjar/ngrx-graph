import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export async function cleanDotFilesIfNotRequested(outDir: string, dotRequested: boolean, verbose = false) {
  if (!outDir || dotRequested) return;
  try {
    const existing = await fs.readdir(outDir).catch(() => [] as string[]);
    for (const f of existing.filter(x => x.endsWith('.dot'))) {
      try {
        await fs.rm(path.join(outDir, f));
        if (verbose) console.log(chalk.gray(`Removed DOT file ${path.join(outDir, f)} because --dot not requested`));
      } catch {
        // ignore errors during cleanup
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

export default cleanDotFilesIfNotRequested;
