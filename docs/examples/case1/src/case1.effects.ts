import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap } from 'rxjs/operators';
import { action1, action2, action3 } from './actions';

@Injectable()
export class FirstEffects {
  effect1$ = createEffect(() =>
    this.actions$.pipe(
      ofType(action1),
      switchMap(() => [action2(), action3()]),
    ),
  );

  constructor(private actions$: Actions) {}
}
