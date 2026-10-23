import fs from 'fs';
import path from 'path';

const dir = 'C:\\Users\\Silicon computer\\Videos\\Captures';
const files = fs.readdirSync(dir);
console.log('Files in Captures:');
for (const f of files) {
  const stat = fs.statSync(path.join(dir, f));
  console.log(` - "${f}" (${stat.size} bytes, modified: ${stat.mtime})`);
}
