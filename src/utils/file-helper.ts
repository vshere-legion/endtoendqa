import * as fs from 'fs';
import * as path from 'path';

export function readJsonFile<T = unknown>(filePath: string): T {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(absolute, 'utf-8');
  return JSON.parse(content) as T;
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  ensureDirectoryExists(path.dirname(absolute));
  fs.writeFileSync(absolute, JSON.stringify(data, null, 2), 'utf-8');
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function cleanDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}
