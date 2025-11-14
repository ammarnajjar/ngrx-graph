import { createReducer, on } from '@ngrx/store';
import { action3 } from './actions';

const firstReducer = createReducer(
  on(action3, () => {
    s => ({ ...s });
  }),
);
