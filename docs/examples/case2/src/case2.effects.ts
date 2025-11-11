import { Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { switchMap } from 'rxjs/operators';
import { action1, action2, action3, nestedAction1, nestedAction2 } from './actions';
import { map } from 'lodash';

@Injectable()
export class ExampleEffects {
  effect1$ = createEffect(() =>
    this.actions$.pipe(
      ofType(action1),
      switchMap(() => [nestedAction1({ action: action2() }), action3()])),
    ),
  );

  effect2$ = createEffect(() =>
    this.actions$.pipe(
      ofType(nestedAction1),
      map(({ action }) => nestedAction2( { action: action()})),
    ),
  );

  effect3$ = createEffect(() =>
    this.actions$.pipe(
      ofType(nestedAction2),
      map(({ action }) => action())),
    ),
  );
}
