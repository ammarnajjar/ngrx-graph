import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs/operators';
import { action1, action2, nestedAction } from './actions';

@Injectable()
export class ExampleEffects {
  constructor(private actions$: Actions) {}

  effect1$ = createEffect(() =>
    this.actions$.pipe(
      ofType(action1),
      map(() => nestedAction({ action: action2() })),
    ),
  );

  effect2$ = createEffect(() =>
    this.actions$.pipe(
      ofType(nestedAction),
      map(({ action }) => action()),
    ),
  );
}
