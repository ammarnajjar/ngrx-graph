import fs from 'fs/promises';
import path from 'path';

beforeEach(() => {
  jest.resetAllMocks();
  jest.resetModules();
});

async function loadWithMocks({ execSucceeds = true, vizResult = null as string | null } = {}) {
  const childMock = jest.fn().mockImplementation((_cmd: string, _args: string[], cb: (err?: Error | null) => void) => {
    if (execSucceeds) cb(null);
    else cb(new Error('dot failed'));
  });
  jest.doMock('child_process', () => ({ execFile: childMock }));
  const vizPath = path.resolve(__dirname, '../../../src/cli/viz-fallback.cjs');
  jest.doMock(vizPath, () => ({ renderDotWithViz: jest.fn().mockResolvedValue(vizResult) }));
  const svgModule = await import('../../../src/cli/svg');
  // return both module and mocks for assertions
  const vizModule = await import(vizPath);
  const vizMock = vizModule.renderDotWithViz as jest.Mock;
  return { svgModule, childMock: childMock as jest.Mock, vizMock };
}

test('preferViz uses viz when available', async () => {
  const { svgModule, vizMock } = await loadWithMocks({ execSucceeds: false, vizResult: '<svg>ok</svg>' });
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-svg-'));
  const dot = path.join(tmp, 'pv.dot');
  const svg = path.join(tmp, 'pv.svg');
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await svgModule.tryDotOrViz(dot, svg, true);
  expect(vizMock).toHaveBeenCalled();
  expect(res.ok).toBe(true);
  expect(res.via).toBe('viz');
});

test('preferViz falls back to dot when viz fails', async () => {
  const { svgModule, childMock, vizMock } = await loadWithMocks({ execSucceeds: true, vizResult: null });
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-svg-'));
  const dot = path.join(tmp, 'pvd.dot');
  const svg = path.join(tmp, 'pvd.svg');
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await svgModule.tryDotOrViz(dot, svg, true);
  expect(childMock).toHaveBeenCalled();
  expect(vizMock).toHaveBeenCalled();
  expect(res.ok).toBe(true);
  expect(res.via).toBe('dot');
});

test('non-prefer path prefers dot then viz', async () => {
  const { svgModule, childMock, vizMock } = await loadWithMocks({ execSucceeds: true, vizResult: null });
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-svg-'));
  const dot = path.join(tmp, 'np.dot');
  const svg = path.join(tmp, 'np.svg');
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await svgModule.tryDotOrViz(dot, svg, false);
  expect(childMock).toHaveBeenCalled();
  expect(vizMock).not.toHaveBeenCalled();
  expect(res.ok).toBe(true);
  expect(res.via).toBe('dot');
});

test('non-prefer path falls back to viz when dot fails', async () => {
  const { svgModule, childMock, vizMock } = await loadWithMocks({ execSucceeds: false, vizResult: '<svg>ok</svg>' });
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-svg-'));
  const dot = path.join(tmp, 'np2.dot');
  const svg = path.join(tmp, 'np2.svg');
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await svgModule.tryDotOrViz(dot, svg, false);
  expect(childMock).toHaveBeenCalled();
  expect(vizMock).toHaveBeenCalled();
  expect(res.ok).toBe(true);
  expect(res.via).toBe('viz');
});

test('returns none when both dot and viz fail', async () => {
  const { svgModule, childMock, vizMock } = await loadWithMocks({ execSucceeds: false, vizResult: null });
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-svg-'));
  const dot = path.join(tmp, 'none.dot');
  const svg = path.join(tmp, 'none.svg');
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await svgModule.tryDotOrViz(dot, svg, false);
  expect(childMock).toHaveBeenCalled();
  expect(vizMock).toHaveBeenCalled();
  expect(res.ok).toBe(false);
  expect(res.via).toBe('none');
});
