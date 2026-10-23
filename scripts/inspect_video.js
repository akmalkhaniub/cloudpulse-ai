import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'child_process';

const videoPath = 'C:\\Users\\Silicon computer\\Videos\\Captures\\CloudPulse - Autonomous Cloud Security & FinOps Copilot - Google Chrome 2026-10-23 04-09-27.mp4';
const res = spawnSync(ffmpeg.path, ['-i', videoPath], { encoding: 'utf8' });
console.log(res.stderr.slice(800));
