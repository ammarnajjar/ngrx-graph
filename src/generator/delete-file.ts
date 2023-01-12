import { existsSync, unlinkSync } from 'node:fs';

export function deleteFile(filename: string): void {
  if (existsSync(filename)) {
    unlinkSync(filename);
  }
}
