import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const tempDir = path.resolve('temp_audio');
const segmentFiles = [];
for (let i = 0; i < 8; i++) {
  segmentFiles.push(path.join(tempDir, `seg_${i}.wav`));
}

const SCRIPT_SEGMENTS = [
  { time: 1.0 },
  { time: 21.0 },
  { time: 48.0 },
  { time: 72.0 },
  { time: 95.0 },
  { time: 125.0 },
  { time: 153.0 },
  { time: 168.0 }
];

console.log('🎛️ Building synchronized master audio track with FFmpeg...');

let filterComplex = '';
let inputs = [];

for (let i = 0; i < segmentFiles.length; i++) {
  inputs.push('-i', segmentFiles[i]);
  const delayMs = Math.round(SCRIPT_SEGMENTS[i].time * 1000);
  filterComplex += `[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
}

const mixInputs = segmentFiles.map((_, i) => `[a${i}]`).join('');
filterComplex += `${mixInputs}amix=inputs=${segmentFiles.length}:dropout_transition=0[aout]`;

const masterAudio = path.join(tempDir, 'master_narration.wav');
const mixArgs = [...inputs, '-filter_complex', filterComplex, '-map', '[aout]', '-y', masterAudio];

const mixRes = spawnSync(ffmpeg.path, mixArgs, { encoding: 'utf8' });
if (mixRes.status !== 0) {
  console.error('Failed to mix audio:', mixRes.stderr);
  process.exit(1);
}

console.log('✅ Master audio track created:', masterAudio);

// Now find user's recorded video and merge
const capturesDir = 'C:\\Users\\Silicon computer\\Videos\\Captures';
const videoFile = fs.readdirSync(capturesDir).find(f => f.startsWith('CloudPulse') && f.endsWith('.mp4'));
if (!videoFile) {
  console.error('Could not find CloudPulse recorded video in Captures!');
  process.exit(1);
}

const inputVideo = path.join(capturesDir, videoFile);
const outputVideo = path.join(capturesDir, 'CloudPulse_AI_Demo_Official_Dubbed.mp4');

console.log(`🎬 Merging narration with recorded video: "${videoFile}"...`);

// Mix original system audio (if any) with the narration track
// Using amix to combine [0:a] and [1:a] with volume boost on narration
const mergeArgs = [
  '-i', inputVideo,
  '-i', masterAudio,
  '-filter_complex', '[1:a]volume=1.8[narr];[0:a][narr]amix=inputs=2:duration=first[aout]',
  '-map', '0:v',
  '-map', '[aout]',
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-y', outputVideo
];

const mergeRes = spawnSync(ffmpeg.path, mergeArgs, { encoding: 'utf8' });
if (mergeRes.status !== 0) {
  // If original video has no audio track, fallback to using master audio directly
  console.log('Note: Video has no original audio stream, merging narration as primary audio...');
  const fallbackArgs = [
    '-i', inputVideo,
    '-i', masterAudio,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-y', outputVideo
  ];
  const fbRes = spawnSync(ffmpeg.path, fallbackArgs, { encoding: 'utf8' });
  if (fbRes.status !== 0) {
    console.error('Fallback merge failed:', fbRes.stderr);
    process.exit(1);
  }
}

console.log('\n🎉 SUCCESS! Dubbed Video Generated:');
console.log('   📁', outputVideo);
console.log('   Size:', (fs.statSync(outputVideo).size / 1024 / 1024).toFixed(2), 'MB');
