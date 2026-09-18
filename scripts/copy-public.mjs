import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await cp(path.join(root, 'src', 'public'), path.join(root, 'dist', 'public'), { recursive: true });
console.log('Copied src/public -> dist/public');
