import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { action1, nestedAction } from './actions';

@Component({ selector: 'first-cmp', template: '' })
export class FirstComponent {
  constructor(private store: Store) {}

  onEvent() {
    this.store.dispatch(nestedAction({ action: action1() }));
  }
}
