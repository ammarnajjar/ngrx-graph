import fs from 'fs/promises';
import path from 'path';
import { cleanupTempRoots, createTempDir } from '../helpers/utils';

test('createTempDir creates and cleanupTempRoots removes dirs', async () => {
  const d = await createTempDir('unit-test');
  const stat = await fs.stat(d);
  expect(stat.isDirectory()).toBe(true);
  await cleanupTempRoots();
  await new Promise(r => setTimeout(r, 50));
  await expect(fs.stat(d)).rejects.toThrow();
});

test('cleanupTempRoots removes files inside temp roots and supports multiple roots', async () => {
  const d1 = await createTempDir('u1');
  const d2 = await createTempDir('u2');
  // create files in both dirs
  await fs.writeFile(path.join(d1, 'a.txt'), 'hello', 'utf8');
  await fs.writeFile(path.join(d2, 'b.txt'), 'world', 'utf8');
  // ensure files exist
  await expect(fs.stat(path.join(d1, 'a.txt'))).resolves.toBeDefined();
  await expect(fs.stat(path.join(d2, 'b.txt'))).resolves.toBeDefined();
  // cleanup
  await cleanupTempRoots();
  await new Promise(r => setTimeout(r, 50));
  await expect(fs.stat(d1)).rejects.toThrow();
  await expect(fs.stat(d2)).rejects.toThrow();
});
