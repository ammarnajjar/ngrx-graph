import fs from 'fs';
import os from 'os';
import path from 'path';
import { runCli } from '../src/cli';

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ngrx-graph-test-'));
}

describe('CLI integration', () => {
  jest.setTimeout(20000);

  test('generates structure JSON with --jsonOnly', async () => {
    const out = mkdtemp();
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');

  // Call the CLI programmatically (pass user args only)
  await runCli(['-d', src, '-o', out, '-j', '-f']);

    const structPath = path.join(out, 'ngrx-graph.json');
    expect(fs.existsSync(structPath)).toBe(true);

  const produced = JSON.parse(fs.readFileSync(structPath, 'utf8')) as { allActions: Array<{ name: string }>; };
  const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'ngrx-graph.json'), 'utf8')) as { allActions: Array<{ name: string }>; };
  // Compare keys we care about
  expect(produced.allActions.map(a => a.name).sort()).toEqual(expected.allActions.map(a => a.name).sort());

    fs.rmSync(out, { recursive: true, force: true });
  });

  test('generates DOT for specific action and highlights it', async () => {
    const out = mkdtemp();
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');

  await runCli(['action1', '-d', src, '-o', out, '-f']);

    const dotPath = path.join(out, 'action1.dot');
    expect(fs.existsSync(dotPath)).toBe(true);

  const dot = fs.readFileSync(dotPath, 'utf8');
  expect(dot).toContain('action1');
  expect(dot).toContain('fillcolor="#007000"');

    fs.rmSync(out, { recursive: true, force: true });
  });

  test('runs CLI on all docs/examples and matches fixtures', async () => {
    const examplesDir = path.resolve(__dirname, '..', 'docs', 'examples');
    const entries = fs.readdirSync(examplesDir, { withFileTypes: true });

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      const src = path.join(examplesDir, name, 'src');
      const out = mkdtemp();

      await runCli(['-d', src, '-o', out, '-f', '-j']);

      const producedPath = path.join(out, 'ngrx-graph.json');
      const fixturePath = path.join(examplesDir, name, 'ngrx-graph.json');

      expect(fs.existsSync(producedPath)).toBe(true);

        const produced: unknown = JSON.parse(fs.readFileSync(producedPath, 'utf8'));
        const fixture: unknown = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      function normalize(obj: unknown): unknown {
        if (Array.isArray(obj)) {
          return (obj as Array<unknown>).map(normalize).sort((a, b) => {
            const sa = JSON.stringify(a);
            const sb = JSON.stringify(b);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
          });
        }
        if (obj && typeof obj === 'object') {
          const o = obj as Record<string, unknown>;
          const keys = Object.keys(o).sort();
          const out: Record<string, unknown> = {};
          for (const k of keys) out[k] = normalize(o[k]);
          return out;
        }
        return obj;
      }

      const nProduced = normalize(produced);
      const nFixture = normalize(fixture);

      expect(JSON.stringify(nProduced)).toEqual(JSON.stringify(nFixture));

      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('generates DOTs for all actions and highlights the selected action', async () => {
    const out = mkdtemp();
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');
    // request all DOTs but highlight 'action1'
    await runCli(['action1', '-d', src, '-o', out, '-a', '-f']);

    const actionFiles = ['action1.dot', 'action2.dot', 'action3.dot', 'nestedAction1.dot', 'nestedAction2.dot'];
    for (const f of actionFiles) {
      const p = path.join(out, f);
      expect(fs.existsSync(p)).toBe(true);
      const dot = fs.readFileSync(p, 'utf8');
  // every dot should contain its action node (unprefixed)
  const name = f.replace('.dot', '');
  expect(dot).toContain(name);
    }

    // highlighted action should contain the highlight color
    const highlighted = fs.readFileSync(path.join(out, 'action1.dot'), 'utf8');
    expect(highlighted).toContain('fillcolor="#007000"');

    // another action should not contain the highlight color
    const other = fs.readFileSync(path.join(out, 'action2.dot'), 'utf8');
    expect(other).not.toContain('fillcolor="#007000"');

    fs.rmSync(out, { recursive: true, force: true });
  });
});
