import { createReducer, on } from '@ngrx/store';
import { actionB } from './case4.actions';

export const initialState = {};

export const case4Reducer = createReducer(
  initialState,
  on(actionB, (state, _action) => ({ ...state }))
);
