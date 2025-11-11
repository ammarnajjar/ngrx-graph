// @ts-nocheck
// fixtures: plain identifiers to be parsed by the AST parser
declare function createAction(name: string, ...rest: any[]): any;
export const action1 = createAction('Action1');
export const action2 = createAction('Action2');
export const action3 = createAction('Action3');
