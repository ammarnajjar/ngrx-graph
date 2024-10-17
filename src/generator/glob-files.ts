import { async, sync } from 'fast-glob';
// import { glob } from 'fs/promises';
import { join } from 'node:path';

const files = (srcDir: string, pattern: string): Promise<string[]> =>
  async(join(srcDir, pattern));

export const componentsFiles = (srcDir: string): Promise<string[]> =>
  files(srcDir, '**/*.component.ts');

export const effectsFiles = (srcDir: string): Promise<string[]> =>
  files(srcDir, '**/*.effects.ts');

export const reducerFiles = (srcDir: string): Promise<string[]> =>
  files(srcDir, '**/*.reducer.ts');

export const actionFiles = (srcDir: string): string[] =>
  sync(join(srcDir, '**/*.actions.ts'));
