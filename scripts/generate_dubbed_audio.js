import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const SCRIPT_SEGMENTS = [
  {
    time: 1.0,
    text: "Alexa+ already handles calendars and email. We asked: what if Alexa+ could act as a senior cloud architect for your engineering team? Meet CloudPulse AI, backed by Amazon Bedrock Nova Pro."
  },
  {
    time: 21.0,
    text: "I ask Alexa+ for my morning cloud briefing. Alexa+ audits the Terraform and reports one critical open-SSH rule, an unencrypted database, and $462.53 a month in compute rightsizing savings."
  },
  {
    time: 48.0,
    text: "When I say 'Alexa, fix all violations and ship a pull request', CloudPulse combines four compliant fixes into one unified Git patch that applies cleanly with git apply, and stages the PR."
  },
  {
    time: 72.0,
    text: "The audit runs through a real Amazon Bedrock Converse tool-use loop on Nova Pro. Here is the unified patch with zero false positives, editing attributes in place."
  },
  {
    time: 95.0,
    text: "Here is the MCP server itself: JSON-RPC 2.0 complying with protocol version 2026-07-28, with six registered tools, output schemas, and rich annotations."
  },
  {
    time: 125.0,
    text: "Two concept extensions: standup transcript sync checking spoken risks against Terraform, and a 10-foot Fire TV NOC wallboard with D-pad remote navigation."
  },
  {
    time: 153.0,
    text: "We documented concrete product feedback for Alexa+ MCP and Bedrock Converse, plus feature requests for Bee webhooks and Fire TV / Vega OS."
  },
  {
    time: 168.0,
    text: "Everything is backed by 43 automated assertions, including patch-correctness tests, and a 1.000 F1 score on labeled, clean, and adversarial Terraform. Thank you!"
  }
];

const tempDir = path.resolve('temp_audio');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

console.log('🎙️ Synthesizing narration audio segments with Windows TTS...');
const segmentFiles = [];

for (let i = 0; i < SCRIPT_SEGMENTS.length; i++) {
  const seg = SCRIPT_SEGMENTS[i];
  const outWav = path.join(tempDir, `seg_${i}.wav`);
  segmentFiles.push(outWav);

  const psScript = `
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $s.SelectVoice('Microsoft David Desktop')
    $s.Rate = 0
    $s.SetOutputToWaveFile('${outWav.replace(/\\/g, '\\\\')}')
    $s.Speak('${seg.text.replace(/'/g, "''")}')
    $s.Dispose()
  `;

  fs.writeFileSync(path.join(tempDir, `gen_${i}.ps1`), psScript);
  const res = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(tempDir, `gen_${i}.ps1`)]);
  if (res.status !== 0) {
    console.error(`Failed to generate segment ${i}:`, res.stderr.toString());
  } else {
    console.log(` ✅ Generated segment ${i + 1}/${SCRIPT_SEGMENTS.length} (${(fs.statSync(outWav).size / 1024).toFixed(1)} KB)`);
  }
}

console.log('\n🎛️ Building synchronized master audio track with FFmpeg...');

// Construct an FFmpeg filter_complex that delays each segment to its start time
let filterComplex = '';
let inputs = [];

for (let i = 0; i < segmentFiles.length; i++) {
  inputs.push('-i', segmentFiles[i]);
  const delayMs = Math.round(SCRIPT_SEGMENTS[i].time * 1000);
  filterComplex += `[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
}

const mixInputs = segmentFiles.map((_, i) => `[a${i}]`).join('');
filterComplex += `${mixInputs}amix=inputs=${segmentFiles.length}:normalize=0[aout]`;

const masterAudio = path.join(tempDir, 'master_narration.wav');
const mixArgs = [...inputs, '-filter_complex', filterComplex, '-map', '[aout]', '-y', masterAudio];

const mixRes = spawnSync(ffmpeg.path, mixArgs, { encoding: 'utf8' });
if (mixRes.status !== 0) {
  console.error('Failed to mix audio:', mixRes.stderr);
  process.exit(1);
}

console.log('✅ Master audio track created successfully:', masterAudio);
console.log('   Size:', (fs.statSync(masterAudio).size / 1024 / 1024).toFixed(2), 'MB');
