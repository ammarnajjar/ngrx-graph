import { Action, createAction, props } from '@ngrx/store';

export const nestedAction1 = createAction(
  'NestedAction1',
  props<{ action: Action }>(),
);
export const nestedAction2 = createAction(
  'NestedAction2',
  props<{ action: Action }>(),
);
export const action1 = createAction('Action1');
export const action2 = createAction('Action2');
export const action3 = createAction('Action3');

