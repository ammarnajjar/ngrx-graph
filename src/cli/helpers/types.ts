export type CliOptions = {
  action?: string;
  all?: boolean;
  svg?: boolean;
  viz?: boolean;
  dot?: boolean;
  json?: boolean;
  verbose?: boolean;
  concurrency?: string | number;
  dir?: string;
  out?: string;
  cache?: boolean;
};

export type GenerateDotOptions = {
  opts: CliOptions;
  outFile: string;
  dotOut: string;
  dotExplicit: boolean;
  verbose?: boolean;
};
