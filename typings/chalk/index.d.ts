// ponytail: type stub for chalk 6 under moduleResolution "node". Drop when migrating to node16/nodenext.
declare module 'chalk' {
  type ChalkFn = (...text: unknown[]) => string;
  interface Chalk extends ChalkFn {
    red: ChalkFn;
    green: ChalkFn;
    yellow: ChalkFn;
    gray: ChalkFn;
    hex(color: string): ChalkFn;
  }
  const chalk: Chalk;
  export default chalk;
}
