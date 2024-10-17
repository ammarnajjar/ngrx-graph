import { globSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { join } from 'node:path';

const files = (srcDir: string, pattern: string): AsyncIterableIterator<string> =>
  glob(join(srcDir, pattern));

export const componentsFiles = (srcDir: string): AsyncIterableIterator<string> =>
  files(srcDir, '**/*.component.ts');

export const effectsFiles = (srcDir: string): AsyncIterableIterator<string> =>
  files(srcDir, '**/*.effects.ts');

export const reducerFiles = (srcDir: string): AsyncIterableIterator<string> =>
  files(srcDir, '**/*.reducer.ts');

export const actionFiles = (srcDir: string): string[] =>
  globSync(join(srcDir, '**/*.actions.ts'));
