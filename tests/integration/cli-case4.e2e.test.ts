import { fork } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

function runCli(args: string[], cwd = process.cwd()): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const script = path.join(cwd, 'src', 'cli.ts');
    const proc = fork(script, args, { cwd, execArgv: ['-r', 'ts-node/register'], silent: true });
    let out = '';
    let err = '';
    if (proc.stdout) proc.stdout.on('data', d => (out += d.toString()));
    if (proc.stderr) proc.stderr.on('data', d => (err += d.toString()));
    proc.on('exit', code => {
      if (code !== 0) return reject(new Error(`CLI exited ${code}: ${err}`));
      resolve({ stdout: out, stderr: err });
    });
    proc.on('error', e => reject(e));
  });
}

test('CLI end-to-end for case4 produces expected JSON and DOT', async () => {
  const base = path.join(process.cwd(), 'docs', 'examples', 'case4');
  const src = path.join(base, 'src');
  const out = path.join(base, 'out');
  const testOut = path.join(out, 'test-run');

  // clean per-test out dir
  await fs.rm(testOut, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(testOut, { recursive: true });

  await runCli(['-d', src, '-o', testOut, '--dot']);

  const jsonPath = path.join(testOut, 'ngrx-graph.json');
  const jsonTxt = await fs.readFile(jsonPath, 'utf8');
  const json = JSON.parse(jsonTxt);

  // assert component dispatch mapping includes actionA
  expect(json.fromComponents).toBeDefined();
  const comps = json.fromComponents;
  expect(comps.Case4Component).toBeDefined();
  expect(comps.Case4Component.includes('actionA')).toBeTruthy();

  // assert effect input/output shows actionA -> actionB
  expect(json.fromEffects).toBeDefined();
  const eff = json.fromEffects.effect$;
  expect(eff.input.includes('actionA')).toBeTruthy();
  expect(eff.output.includes('actionB')).toBeTruthy();

  // check actionA.dot contains edges Case4Component -> actionA and actionA -> actionB
  const dot = await fs.readFile(path.join(testOut, 'actionA.dot'), 'utf8');
  expect(dot.includes('Case4Component -> actionA')).toBeTruthy();
  expect(dot.includes('actionA -> actionB')).toBeTruthy();
});
