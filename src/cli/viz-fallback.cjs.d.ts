declare module './cli/viz-fallback.cjs' {
  export function renderDotWithViz(dotText: string): Promise<string | null>;
}
