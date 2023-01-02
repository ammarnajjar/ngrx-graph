import * as fglob from 'fast-glob';
import { join } from 'node:path';

export const files = (srcDir: string, pattern: string): string[] =>
  fglob.sync(join(srcDir, pattern));

export const componentsFiles = (srcDir: string): string[] =>
  files(srcDir, '**/*.component.ts');

export const effectsFiles = (srcDir: string): string[] =>
  files(srcDir, '**/*.effects.ts');

export const reducerFiles = (srcDir: string): string[] =>
  files(srcDir, '**/*.reducer.ts');

export const actionFiles = (srcDir: string): string[] =>
  files(srcDir, '**/*.actions.ts');
