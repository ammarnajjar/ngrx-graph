import * as fs from 'node:fs';

export function deleteFile(filename: string): void {
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }
}
