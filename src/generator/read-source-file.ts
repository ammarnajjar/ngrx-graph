import {
  CompilerOptions,
  SourceFile,
  createCompilerHost,
  createProgram,
} from 'typescript';

export function readSourceFile(file: string): SourceFile {
  const options: CompilerOptions = { allowJs: true };
  const compilerHost = createCompilerHost(options, /* setParentNodes */ true);
  const program = createProgram([file], options, compilerHost);
  return program.getSourceFile(file) as SourceFile;
}
