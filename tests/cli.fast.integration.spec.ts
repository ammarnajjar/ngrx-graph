import fs from 'fs';
import os from 'os';
import path from 'path';
import { runCli } from '../src/cli';

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ngrx-graph-test-'));
}

describe('CLI fast mode', () => {
  jest.setTimeout(30000);

  test('run with --fast uses incremental path and writes json', async () => {
    const out = mkdtemp();
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');

    // run CLI with fast flag
    await runCli(['-d', src, '-o', out, '-j', '--fast', '-f']);

    const structPath = path.join(out, 'ngrx-graph.json');
    expect(fs.existsSync(structPath)).toBe(true);

    const produced = JSON.parse(fs.readFileSync(structPath, 'utf8')) as { allActions: Array<{ name: string }>; };
    expect(produced.allActions && produced.allActions.length).toBeGreaterThan(0);

    fs.rmSync(out, { recursive: true, force: true });
  });
});

export { };

