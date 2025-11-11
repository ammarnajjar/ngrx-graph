import fs from 'fs';
import path from 'path';
import { GraphStructure } from '../src/model/types';
import { readStructure, writeStructure } from '../src/serialize/cache';

describe('graph cache', () => {
  it('writes and reads structure JSON and honors overwrite', () => {
    const tmp = path.join('/tmp', `ngrx-graph-test-${Date.now()}`);
    const struct: GraphStructure = { nodes: [], edges: [], generatedAt: new Date().toISOString(), version: '0.0.1' };
    const filename = 'cache-test.json';
    const p = writeStructure(struct, tmp, filename);
    expect(fs.existsSync(p)).toBeTruthy();
    const read = readStructure(tmp, filename);
    expect(read).not.toBeNull();
    // simulate force: overwrite
    struct.version = '0.0.2';
    writeStructure(struct, tmp, filename);
    const read2 = readStructure(tmp, filename);
    expect(read2 && read2.version).toBe('0.0.2');
  });
});
