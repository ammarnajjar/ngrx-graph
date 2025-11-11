import fs from 'fs';
import path from 'path';
import { GraphStructure } from '../model/types';

export function writeStructure(struct: GraphStructure, outputDir: string, filename: string) {
  const full = path.join(outputDir, filename);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(full, JSON.stringify(struct, null, 2), 'utf8');
  return full;
}

export function readStructure(outputDir: string, filename: string): GraphStructure | null {
  const full = path.join(outputDir, filename);
  if (!fs.existsSync(full)) return null;
  try {
    const raw = fs.readFileSync(full, 'utf8');
    return JSON.parse(raw) as GraphStructure;
  } catch {
    return null;
  }
}
