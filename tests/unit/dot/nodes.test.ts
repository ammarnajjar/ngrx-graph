import { makeNodes } from '../../../src/dot/nodes';

test('makeNodes produces focused, nested and reducer nodes', () => {
  const payload = {
    allActions: [
      { name: 'act1', nested: false },
      { name: 'act2', nested: true },
      { name: 'focus', nested: false },
    ],
    fromComponents: { CompA: ['act1'] },
    fromReducers: { myReducer: ['act1'] },
  } as any;

  const lines = makeNodes(payload, 'focus');
  // should include component node
  expect(lines.some(l => l.startsWith('CompA'))).toBeTruthy();
  // should highlight focused action
  expect(lines.some(l => l.includes('focus') && l.includes('fillcolor="#007000"'))).toBeTruthy();
  // should include nested styling for act2
  expect(lines.some(l => l.includes('act2') && l.includes('lightcyan'))).toBeTruthy();
  // should include reducer hexagon node
  expect(lines.some(l => l.startsWith('myReducer') && l.includes('hexagon'))).toBeTruthy();
});
