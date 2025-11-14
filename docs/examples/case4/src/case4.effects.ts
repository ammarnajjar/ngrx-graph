import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs/operators';
import { actionB, exportedActionA } from './index';

@Injectable()
export class Case4Effects {
  constructor(private actions$: Actions) {}

  effect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(exportedActionA),
      map(() => actionB({ payload: 'x' })),
    ),
  );
}
