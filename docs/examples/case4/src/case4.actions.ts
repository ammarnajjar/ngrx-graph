import { createAction, props } from '@ngrx/store';

export const actionA = createAction('[Case4] Action A');
export const actionB = createAction('[Case4] Action B', props<{ payload: string }>());
