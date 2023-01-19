import { expect } from 'chai';
import { chainActionsByInput } from '../../src/generator/chain-actions';

const fromEffects = {
  effect1$: {
    input: ['action1', 'action2'],
    output: ['action6', 'action7'],
  },
  effect2$: {
    input: ['action5'],
    output: ['action1'],
  },
  effect3$: {
    input: ['action3', 'action4'],
    output: ['action2'],
  },
  effect4$: {
    input: ['action5'],
    output: ['action3', 'action4'],
  },
  effect5$: {
    input: ['action8'],
    output: ['action9'],
  },
};

describe('chainActionsByInput', () => {
  for (const { action, expected } of [
    {
      action: 'action1',
      expected: [fromEffects.effect1$],
    },
    {
      action: 'action4',
      expected: [fromEffects.effect3$, fromEffects.effect1$],
    },
    {
      action: 'action5',
      expected: [
        fromEffects.effect2$,
        fromEffects.effect1$,
        fromEffects.effect4$,
        fromEffects.effect3$,
      ],
    },
    {
      action: 'action8',
      expected: [fromEffects.effect5$],
    },
    {
      action: 'action9',
      expected: [],
    },
  ]) {
    it(`chains ${action}`, () => {
      const chain = chainActionsByInput(fromEffects, action);
      expect(chain).to.eql(expected);
    });
  }
});
