import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
console.log('FFmpeg binary path:', ffmpeg.path);
console.log(execSync(`"${ffmpeg.path}" -version`).toString().split('\n')[0]);
