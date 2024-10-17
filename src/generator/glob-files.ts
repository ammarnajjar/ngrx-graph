import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const pexec = promisify(exec);
const comm = (
  srcDir: string,
  searchPattern: string,
  filesPatterns: string,
): string => `rg -F -l -e "${searchPattern}" -g "${filesPatterns}" "${srcDir}"`;

function grepSync(
  srcDir: string,
  searchPattern: string,
  filesPatterns: string,
): string[] {
  const stdout = execSync(comm(srcDir, searchPattern, filesPatterns));
  const result = stdout.toString().split('\n').slice(0, -1);
  return result;
}

async function grep(
  srcDir: string,
  searchPattern: string,
  filesPatterns: string,
): Promise<string[]> {
  const { stdout } = await pexec(comm(srcDir, searchPattern, filesPatterns));
  const result = stdout.toString().split('\n').slice(0, -1);
  return result;
}

export const componentsFiles = (srcDir: string): Promise<string[]> =>
  grep(srcDir, 'dispatch', '**/*.component.ts');

export const effectsFiles = (srcDir: string): Promise<string[]> =>
  grep(srcDir, 'createEffect', '**/*.effects.ts');

export const reducerFiles = (srcDir: string): Promise<string[]> =>
  grep(srcDir, 'createReducer', '**/*.reducer.ts');

export const actionFiles = (srcDir: string): string[] =>
  grepSync(srcDir, 'createAction', '**/*.actions.ts');
