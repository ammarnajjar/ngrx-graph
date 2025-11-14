import fs from 'fs/promises';
import path from 'path';
import cleanDotFilesIfNotRequested from '../../src/cli/cleanup';
import { createTempDir } from '../helpers/utils';

test('cleanDotFilesIfNotRequested removes dot files when not requested', async () => {
  const outDir = await createTempDir('cleanup-test');
  await fs.writeFile(path.join(outDir, 'a.dot'), 'digraph {}', 'utf8');
  await fs.writeFile(path.join(outDir, 'keep.txt'), 'keep', 'utf8');
  // ensure dot present
  let files = await fs.readdir(outDir);
  expect(files.some(f => f.endsWith('.dot'))).toBe(true);

  await cleanDotFilesIfNotRequested(outDir, false, false);
  await new Promise(r => setTimeout(r, 20));
  files = await fs.readdir(outDir).catch(() => [] as string[]);
  expect(files.some(f => f.endsWith('.dot'))).toBe(false);
  expect(files).toContain('keep.txt');
});

test('cleanDotFilesIfNotRequested leaves dot files when requested', async () => {
  const outDir = await createTempDir('cleanup-test-keep');
  await fs.writeFile(path.join(outDir, 'b.dot'), 'digraph {}', 'utf8');
  let files = await fs.readdir(outDir);
  expect(files.some(f => f.endsWith('.dot'))).toBe(true);

  await cleanDotFilesIfNotRequested(outDir, true, false);
  files = await fs.readdir(outDir);
  expect(files.some(f => f.endsWith('.dot'))).toBe(true);
});
