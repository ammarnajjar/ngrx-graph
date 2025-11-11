// alias import: import { createAction as ca } from 'x';
declare function ca(name: string, ...rest: any[]): any;

export const use = ca('Other');
