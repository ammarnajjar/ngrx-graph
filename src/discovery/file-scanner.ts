import fg from 'fast-glob';
import path from 'path';

export async function findSourceFiles(srcDir: string): Promise<string[]> {
  const pattern = ['**/*.ts', '!**/*.spec.ts', '!**/*.test.ts', '!node_modules/**', '!dist/**'];
  const entries = await fg(pattern, { cwd: srcDir, absolute: true });
  // return absolute file paths
  return entries.map((e) => path.resolve(e));
}
