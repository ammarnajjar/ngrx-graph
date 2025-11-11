// @ts-nocheck
declare function createAction(name: string, ...rest: any[]): any;
declare function props<T>(): any;

export const nestedAction = createAction('NestedAction', props<{ action: any }>());
export const action1 = createAction('Action1');
export const action2 = createAction('Action2');
export const action3 = createAction('Action3');
