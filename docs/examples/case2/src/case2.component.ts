// @ts-ignore
import { Component } from '@angular/core';
// @ts-ignore
import { Store } from '@ngrx/store';
import { action1, nestedAction1 } from './actions';

@Component({ selector: 'first-cmp', template: '' })
export class FirstComponent {
  constructor(private store: Store) {}

  onEvent() {
    this.store.dispatch(nestedAction1({ action: action1() }));
  }
}
