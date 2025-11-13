import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { exportedActionA } from './index';

@Component({ selector: 'app-case4', template: '' })
export class Case4Component {
  constructor(private store: Store) {}

  doIt() {
    this.store.dispatch(exportedActionA());
  }
}
