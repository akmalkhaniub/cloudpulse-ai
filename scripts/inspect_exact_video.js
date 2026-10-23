import fs from 'fs';
import path from 'path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'child_process';

const dir = 'C:\\Users\\Silicon computer\\Videos\\Captures';
const targetFile = fs.readdirSync(dir).find(f => f.startsWith('CloudPulse'));
console.log('Found video file:', targetFile);

const srcPath = path.join(dir, targetFile);
const res = spawnSync(ffmpeg.path, ['-i', srcPath], { encoding: 'utf8' });
const durationMatch = (res.stderr || '').match(/Duration:\s*(\d+:\d+:\d+\.\d+)/);
console.log('Recorded Video Duration:', durationMatch ? durationMatch[1] : 'unknown');
