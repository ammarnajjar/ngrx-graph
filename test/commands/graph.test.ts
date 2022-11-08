import { expect, test } from '@oclif/test';

describe('graph', () => {
  test
  .stdout()
  .command(['graph', 'actionName'])
  .it('runs graph cmd', ctx => {
    expect(ctx.stdout).to.contain('actionName');
  });
});
