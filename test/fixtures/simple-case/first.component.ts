import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { action1 } from './actions';

@Component({})
export class FirstComponent {
  constructor(private store: Store) {}
  onEvent() {
    this.store.dispatch(action1());
  }
}
