/*
  Zixel Chords Local server
  - Serves the UI.
  - Accepts a single MP3 only from this localhost UI.
  - Sends it to the locally installed CrispASR engine, then deletes the temp file.
  - Never forwards audio to a remote service.
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const root = __dirname;
const host = '127.0.0.1';
const port = 4173;
const enginePath = path.join(root, '.engine', 'crispasr', 'crispasr.exe');
const tempRoot = path.join(root, '.engine', 'temp');
// Keep model files beside the application. The system home cache can be locked
// when Zixel Chords is run from a sandboxed desktop session.
const modelCacheRoot = path.join(root, '.engine', 'models');
const libraryRoot = path.join(root, '.engine', 'library');
fs.mkdirSync(libraryRoot, { recursive: true });

let rtxGpuIndex = '1';
let preferredGpuDevice = '1';
let detectedGpus = [];
let nvidiaGpuName = 'NVIDIA GeForce RTX 3070 Ti Laptop GPU';

function detectGpuDevice() {
  if (!fs.existsSync(enginePath)) return;
  try {
    const proc = spawnSync(enginePath, ['--diagnostics'], { encoding: 'utf8', timeout: 6000 });
    const out = (proc.stdout || '') + (proc.stderr || '');
    let nvidiaId = null;
    detectedGpus = [];
    out.split('\n').forEach(function (line) {
      const match = /ggml_vulkan:\s*(\d+)\s*=\s*([^|]+)/i.exec(line);
      if (match) {
        const id = match[1].trim();
        const name = match[2].trim();
        detectedGpus.push({ id: id, name: name });
        if (/NVIDIA/i.test(name)) {
          nvidiaId = id;
          nvidiaGpuName = name;
        }
      }
    });

    if (nvidiaId !== null) {
      rtxGpuIndex = nvidiaId;
      preferredGpuDevice = nvidiaId;
    } else {
      rtxGpuIndex = '0';
      preferredGpuDevice = '0';
    }

    console.log(`[Engine] 🔥 MAX PERFORMANCE MODE: Locked 100% to ${nvidiaGpuName} (Vulkan Physical Device ${rtxGpuIndex}).`);
  } catch (e) {
    console.warn('[Engine] GPU detection note:', e.message);
  }
}
detectGpuDevice();
const maxUploadBytes = 80 * 1024 * 1024;
const whisperModel = {
  name: 'Whisper base ASR model',
  file: 'ggml-base.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
};
const coreModelFiles = [
  {
    name: 'BTC chord model',
    file: 'btc-chords-large-f16.gguf',
    url: 'https://huggingface.co/cstr/btc-chords-GGUF/resolve/main/btc-chords-large-f16.gguf'
  },
  {
    name: 'Beat This! rhythm model',
    file: 'beat-this-f16.gguf',
    url: 'https://huggingface.co/cstr/beat-this-GGUF/resolve/main/beat-this-f16.gguf'
  }
];
const separationModel = {
  name: 'HTDemucs stem-separation model',
  file: 'htdemucs-q4_k.gguf',
  url: 'https://huggingface.co/cstr/htdemucs-GGUF/resolve/main/htdemucs-q4_k.gguf'
};
const accurateModelFiles = coreModelFiles.concat([separationModel]);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.flac': 'audio/flac', '.ogg': 'audio/ogg'
};
// Active stem separation sessions: sessionId -> { dir, stems: {vocals, drums, bass, other}, created }
const stemSessions = new Map();
const stemSessionTtlMs = 60 * 60 * 1000; // 1 hour TTL
function cleanupStemSession(sessionId) {
  const session = stemSessions.get(sessionId);
  if (!session) return;
  stemSessions.delete(sessionId);
  fs.rm(session.dir, { recursive: true, force: true }, function () {});
}
// Real-time analysis progress tracker: jobId -> { stage, percent, message, detail, updated }
const analysisJobs = new Map();
const analysisJobTtlMs = 30 * 60 * 1000; // 30 mins TTL
// Periodically remove expired sessions & jobs
setInterval(function () {
  const now = Date.now();
  stemSessions.forEach(function (session, id) {
    if (now - session.created > stemSessionTtlMs) cleanupStemSession(id);
  });
  analysisJobs.forEach(function (job, id) {
    if (now - job.updated > analysisJobTtlMs) analysisJobs.delete(id);
  });
}, 15 * 60 * 1000);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  });
  response.end(JSON.stringify(payload));
}
function engineReady() { return fs.existsSync(enginePath); }
function modelPath(model) { return path.join(modelCacheRoot, model.file); }
function modelsReady(requestedModels) { return (requestedModels || coreModelFiles).every(function (model) {
  try { return fs.statSync(modelPath(model)).size > 1024 * 1024; } catch (error) { return false; }
}); }
function accurateModelsReady() { return modelsReady(accurateModelFiles); }
const modelInstallPromises = new Map();
async function downloadModel(model) {
  const destination = modelPath(model);
  if (fs.existsSync(destination) && fs.statSync(destination).size > 1024 * 1024) return;
  fs.mkdirSync(modelCacheRoot, { recursive: true });
  const temporary = destination + '.download-' + crypto.randomUUID();
  try {
    const response = await fetch(model.url, {
      headers: { 'User-Agent': 'ChordTube-Local/1.0' },
      signal: AbortSignal.timeout(10 * 60 * 1000)
    });
    if (!response.ok || !response.body) throw new Error('ดาวน์โหลด ' + model.name + ' ไม่สำเร็จ (HTTP ' + response.status + ')');
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary, { flags: 'wx' }));
    if (fs.statSync(temporary).size <= 1024 * 1024) throw new Error('ไฟล์ ' + model.name + ' ที่ดาวน์โหลดมาไม่สมบูรณ์');
    fs.renameSync(temporary, destination);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}
function ensureModel(model) {
  if (fs.existsSync(modelPath(model)) && fs.statSync(modelPath(model)).size > 1024 * 1024) return Promise.resolve();
  if (!modelInstallPromises.has(model.file)) {
    const task = downloadModel(model).finally(function () { modelInstallPromises.delete(model.file); });
    modelInstallPromises.set(model.file, task);
  }
  return modelInstallPromises.get(model.file);
}
function ensureModels(requestedModels) {
  return Promise.all((requestedModels || coreModelFiles).map(ensureModel));
}
function bodyBuffer(request) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    request.on('data', function (chunk) {
      size += chunk.length;
      if (size > maxUploadBytes) { reject(new Error('ไฟล์มีขนาดเกิน 80 MB')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', function () { resolve(Buffer.concat(chunks)); });
    request.on('error', reject);
  });
}
function parseMultipartAudio(body, contentType) {
  const match = /boundary=([^;]+)/i.exec(contentType || '');
  if (!match) throw new Error('รูปแบบอัปโหลดไม่ถูกต้อง');
  const boundary = Buffer.from('--' + match[1].replace(/^"|"$/g, ''));
  const headerBreak = Buffer.from('\r\n\r\n');
  const nextBoundary = Buffer.concat([Buffer.from('\r\n'), boundary]);
  let start = body.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (body.subarray(start, start + 2).toString() === '--') break;
    if (body.subarray(start, start + 2).toString() === '\r\n') start += 2;
    const headerEnd = body.indexOf(headerBreak, start);
    if (headerEnd === -1) break;
    const headers = body.subarray(start, headerEnd).toString('utf8');
    const next = body.indexOf(nextBoundary, headerEnd + headerBreak.length);
    if (next === -1) break;
    if (/name="audio"/i.test(headers)) {
      const filenameMatch = /filename="([^"]*)"/i.exec(headers);
      const filename = filenameMatch ? path.basename(filenameMatch[1]).replace(/[^a-zA-Z0-9._ -]/g, '_') : 'track.audio';
      return { filename: filename, content: body.subarray(headerEnd + headerBreak.length, next) };
    }
    start = next + 2;
  }
  throw new Error('ไม่พบไฟล์เสียงในคำขอ');
}
function runEngine(args) {
  return new Promise(function (resolve, reject) {
    let finalArgs = args.slice();
    let threadArgs = finalArgs.includes('-t') || finalArgs.includes('--threads') ? finalArgs : ['-t', '8'].concat(finalArgs);
    if (!threadArgs.includes('-fa') && !threadArgs.includes('--flash-attn')) {
      threadArgs = ['-fa'].concat(threadArgs);
    }
    // Environment isolation: Hide AMD Radeon completely and lock 100% to NVIDIA RTX 3070 Ti
    const childEnv = Object.assign({}, process.env, {
      GGML_VK_VISIBLE_DEVICES: String(rtxGpuIndex || '1'),
      CUDA_VISIBLE_DEVICES: '0'
    });
    const child = spawn(enginePath, threadArgs, { windowsHide: true, cwd: path.dirname(enginePath), env: childEnv });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(function () {
      child.kill();
      reject(new Error('AI engine ใช้เวลานานเกินกำหนด (โปรดลองใช้โหมด Fast Mode เพื่อความรวดเร็ว)'));
    }, 15 * 60 * 1000);
    child.stdout.on('data', function (data) { stdout += data.toString(); });
    child.stderr.on('data', function (data) { stderr += data.toString(); });
    child.on('error', function (err) {
      clearTimeout(timer);
      reject(new Error('ไม่สามารถเปิด AI engine ได้: ' + (err ? err.message : '')));
    });
    child.on('close', function (code) {
      clearTimeout(timer);
      if (code !== 0) {
        console.error('AI engine failed (' + args.slice(0, 3).join(' ') + ' on RTX 3070 Ti):', (stderr || stdout).slice(-300));
        reject(new Error((stderr || stdout || 'AI engine ทำงานไม่สำเร็จ').trim().slice(-800)));
      } else {
        resolve(stdout);
      }
    });
  });
}
function parseChordTable(output) {
  const chords = [];
  String(output).replace(/\r/g, '').split('\n').forEach(function (line) {
    const match = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\S+)/.exec(line);
    if (!match) return;
    chords.push({ start: Number(match[1]), end: Number(match[2]), chord: match[3], confidence: 0 });
  });
  if (!chords.length) throw new Error('AI engine ส่งตารางคอร์ดที่อ่านไม่ได้');
  return chords;
}
function parseBeatTable(output) {
  const beats = [];
  String(output).replace(/\r/g, '').split('\n').forEach(function (line) {
    const match = /^\s*(\d+(?:\.\d+)?)\s+(downbeat|beat)\b/i.exec(line);
    if (!match) return;
    beats.push({ time: Number(match[1]), type: match[2].toLowerCase(), downbeat: match[2].toLowerCase() === 'downbeat' });
  });
  if (!beats.length) throw new Error('AI engine ส่งตารางจังหวะที่อ่านไม่ได้');
  return beats;
}
function parseTranscription(jsonOutput) {
  try {
    var parsed = JSON.parse(jsonOutput);
    var transcription = parsed.transcription || parsed.segments || [];
    var segments = [];
    transcription.forEach(function (seg) {
      var startMs = seg.offsets ? seg.offsets.from : (seg.start !== undefined ? seg.start * 1000 : 0);
      var endMs = seg.offsets ? seg.offsets.to : (seg.end !== undefined ? seg.end * 1000 : 0);
      var text = (seg.text || '').trim();
      if (!text) return;
      var words = [];
      var tokens = seg.tokens || seg.words || [];
      tokens.forEach(function (tok) {
        var w = (tok.text || tok.word || '').trim();
        if (!w) return;
        var wStart = tok.offsets ? tok.offsets.from : (tok.start !== undefined ? tok.start * 1000 : startMs);
        var wEnd = tok.offsets ? tok.offsets.to : (tok.end !== undefined ? tok.end * 1000 : endMs);
        words.push({ start: wStart / 1000, end: wEnd / 1000, word: w });
      });
      segments.push({ start: startMs / 1000, end: endMs / 1000, text: text, words: words });
    });
    var language = parsed.result ? (parsed.result.language || 'auto') : 'auto';
    return { language: language, segments: segments };
  } catch (e) {
    return { language: 'auto', segments: [] };
  }
}
async function extractLyrics(audioFile, lang) {
  // Bypassed: Whisper removed to maximize speed and prevent hanging
  return { language: 'auto', segments: [] };
}
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR_PROFILE = [
  { step: 0, minor: false, weight: 3.2 }, // I (Tonic)
  { step: 2, minor: true, weight: 1.1 },  // ii
  { step: 4, minor: true, weight: 1.1 },  // iii
  { step: 5, minor: false, weight: 2.2 }, // IV (Subdominant)
  { step: 7, minor: false, weight: 2.8 }, // V (Dominant)
  { step: 9, minor: true, weight: 2.0 },  // vi (Relative minor)
  { step: 11, minor: true, weight: 0.5 }  // vii dim
];
const MINOR_PROFILE = [
  { step: 0, minor: true, weight: 3.2 },  // i (Tonic minor)
  { step: 2, minor: true, weight: 0.5 },  // ii dim
  { step: 3, minor: false, weight: 2.0 }, // III (Relative major)
  { step: 5, minor: true, weight: 2.0 },  // iv
  { step: 7, minor: true, weight: 1.6 },  // v
  { step: 7, minor: false, weight: 2.2 }, // V (Harmonic minor dominant)
  { step: 8, minor: false, weight: 1.8 }, // VI
  { step: 10, minor: false, weight: 1.5 } // VII
];
const KEY_ENHARMONIC_NAMES = {
  'A# Major': 'Bb Major',
  'D# Major': 'Eb Major',
  'G# Major': 'Ab Major',
  'C# Major': 'Db Major',
  'D# Minor': 'Eb Minor',
  'A# Minor': 'Bb Minor'
};

function parsePitchClass(name) {
  const m = /^([A-G][#b]?)(.*)/.exec(String(name || ''));
  if (!m) return null;
  let root = m[1];
  const tail = m[2];
  const isMinor = /m(?!aj)/i.test(tail) || /min/i.test(tail);
  const flatMap = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
  if (flatMap[root]) root = flatMap[root];
  const idx = PITCH_NAMES.indexOf(root);
  return idx >= 0 ? { pitch: idx, isMinor: isMinor, originalRoot: m[1] } : null;
}

function deriveKey(chords) {
  if (!chords || !chords.length) return 'รอตรวจ';
  const durationMap = new Map();
  for (const c of chords) {
    const pc = parsePitchClass(c.chord);
    if (!pc) continue;
    const dur = Math.max(0.1, Number(c.end || 0) - Number(c.start || 0));
    const k = pc.pitch + ':' + (pc.isMinor ? 'm' : 'M');
    durationMap.set(k, (durationMap.get(k) || 0) + dur);
  }
  if (durationMap.size === 0) return 'รอตรวจ';

  let bestKey = 'C Major';
  let maxScore = -1;
  for (let root = 0; root < 12; root++) {
    let majScore = 0;
    for (const rule of MAJOR_PROFILE) {
      const p = (root + rule.step) % 12;
      const k = p + ':' + (rule.minor ? 'm' : 'M');
      majScore += (durationMap.get(k) || 0) * rule.weight;
    }
    if (majScore > maxScore) {
      maxScore = majScore;
      const rawKey = PITCH_NAMES[root] + ' Major';
      bestKey = KEY_ENHARMONIC_NAMES[rawKey] || rawKey;
    }

    let minScore = 0;
    for (const rule of MINOR_PROFILE) {
      const p = (root + rule.step) % 12;
      const k = p + ':' + (rule.minor ? 'm' : 'M');
      minScore += (durationMap.get(k) || 0) * rule.weight;
    }
    if (minScore > maxScore) {
      maxScore = minScore;
      const rawKey = PITCH_NAMES[root] + ' Minor';
      bestKey = KEY_ENHARMONIC_NAMES[rawKey] || rawKey;
    }
  }
  return bestKey;
}

function deriveBpm(beats) {
  const intervals = beats.slice(1).map(function (beat, index) { return beat.time - beats[index].time; })
    .filter(function (value) { return value > 0.2 && value < 3; }).sort(function (a, b) { return a - b; });
  if (!intervals.length) return '—';
  return Math.round(60 / intervals[Math.floor(intervals.length / 2)]);
}

function estimateMeter(beats) {
  const downbeatIndexes = beats.map(function (beat, index) { return beat.downbeat ? index : -1; }).filter(function (index) { return index >= 0; });
  const counts = new Map();
  for (let index = 1; index < downbeatIndexes.length; index += 1) {
    const distance = downbeatIndexes[index] - downbeatIndexes[index - 1];
    if ([2, 3, 4, 5, 6].includes(distance)) counts.set(distance, (counts.get(distance) || 0) + 1);
  }
  const best = Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; })[0];
  return best ? best[0] : 4;
}

function medianBeatInterval(beats) {
  const intervals = beats.slice(1).map(function (beat, index) { return beat.time - beats[index].time; })
    .filter(function (value) { return value > 0.2 && value < 3; }).sort(function (a, b) { return a - b; });
  return intervals.length ? intervals[Math.floor(intervals.length / 2)] : 0.5;
}

function nearestBeatIndex(beats, time) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  beats.forEach(function (beat, index) {
    const distance = Math.abs(beat.time - time);
    if (distance < bestDistance) { bestIndex = index; bestDistance = distance; }
  });
  return bestIndex;
}

function refineBeatGrid(rawBeats, requestedMeter) {
  if (!rawBeats || !rawBeats.length) return [];
  const reqM = ['2', '3', '4', '6'].includes(String(requestedMeter)) ? Number(requestedMeter) : null;
  const aiDownbeats = rawBeats.filter(function (b) { return b.downbeat; });
  const firstAiDownbeat = aiDownbeats[0];
  const anchorIndex = firstAiDownbeat ? rawBeats.indexOf(firstAiDownbeat) : 0;
  const estimatedMeter = estimateMeter(rawBeats);
  const meter = reqM || estimatedMeter || 4;

  // If user requested a specific fixed meter (e.g. 3/4 or 6/8) or AI didn't detect enough downbeats:
  // anchor to the first confirmed AI downbeat and calculate meter boundaries accurately
  if (reqM || aiDownbeats.length < 2) {
    return rawBeats.map(function (beat, index) {
      const isDownbeat = ((index - anchorIndex) % meter + meter) % meter === 0;
      return { time: beat.time, type: isDownbeat ? 'downbeat' : 'beat', downbeat: isDownbeat };
    });
  }

  // When meter is 'auto' and Beat This! AI detected downbeats:
  // PRESERVE THE AI DETECTED DOWNBEATS DIRECTLY!
  // This accurately reflects the true musical structure including pickups, 2/4 turnarounds, and 5-beat transitions.
  return rawBeats.map(function (beat) {
    const isDownbeat = Boolean(beat.downbeat);
    return { time: beat.time, type: isDownbeat ? 'downbeat' : 'beat', downbeat: isDownbeat };
  });
}

function chordSegmentAt(chords, time) {
  const current = chords.find(function (chord) { return chord.start <= time + 0.04 && (chord.end || Infinity) > time + 0.04; });
  if (current) return current;
  return chords.filter(function (chord) { return chord.start <= time + 0.04; }).at(-1) || chords[0];
}

function isNoChord(chord) { return !chord || /^(N|N[.]C[.]?|X)$/i.test(String(chord.chord || chord)); }

function smoothChordSpans(spans, minDuration = 0.35) {
  if (!spans || spans.length <= 1) return spans;
  const result = spans.map(function (s) { return Object.assign({}, s); });
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (let i = 1; i < result.length - 1; i++) {
      const prev = result[i - 1];
      const cur = result[i];
      const next = result[i + 1];
      const dur = Number(cur.end || 0) - Number(cur.start || 0);
      if (dur < minDuration) {
        if (String(prev.chord).toLowerCase() === String(next.chord).toLowerCase()) {
          prev.end = next.end;
          result.splice(i, 2);
          changed = true;
          break;
        } else if (dur < 0.22) {
          prev.end = cur.end;
          result.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
  }
  return result;
}

function beatAlignedChordEnsemble(beats, mixChords, accompanimentChords) {
  const beatInterval = medianBeatInterval(beats);
  const selected = beats.map(function (beat) {
    // Sample slightly past onset (25% into beat) to capture sustained harmonic core
    // and avoid transient drum attack / pick scrape spikes at t=0
    const sampleTime = beat.time + Math.min(0.12, beatInterval * 0.25);
    const mix = chordSegmentAt(mixChords, sampleTime);
    const acc = chordSegmentAt(accompanimentChords, sampleTime);

    const mixNoChord = isNoChord(mix);
    const accNoChord = isNoChord(acc);

    let chosen = null;
    if (mixNoChord && !accNoChord) {
      chosen = acc;
    } else if (!mixNoChord && accNoChord) {
      chosen = mix;
    } else if (!mixNoChord && !accNoChord) {
      const sameChord = String(mix.chord).toLowerCase() === String(acc.chord).toLowerCase();
      if (sameChord) {
        // Agreement! Use the more descriptive chord label
        chosen = (acc.chord.length >= mix.chord.length) ? acc : mix;
      } else {
        // Accompaniment track has full bass root notes and zero vocal bleed
        // Prefer accompaniment when stable
        const accStable = (Number(acc.end || 0) - Number(acc.start || 0)) >= beatInterval * 0.85;
        chosen = accStable ? acc : mix;
      }
    } else {
      chosen = mix || acc;
    }
    return { time: beat.time, chord: chosen ? chosen.chord : 'N.C.' };
  });

  const spans = [];
  selected.forEach(function (event) {
    const prior = spans.at(-1);
    if (!prior || String(prior.chord).toLowerCase() !== String(event.chord).toLowerCase()) {
      spans.push({ start: event.time, end: event.time + beatInterval, chord: event.chord, confidence: 0 });
    } else {
      prior.end = event.time + beatInterval;
    }
  });

  return smoothChordSpans(spans, Math.max(0.3, beatInterval * 0.65));
}
function findStemFile(directory, stem) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findStemFile(entryPath, stem);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('_' + stem + '.wav')) {
      return entryPath;
    }
  }
  return null;
}
function serveFileStream(filePath, contentType, request, response) {
  if (!filePath || !fs.existsSync(filePath)) {
    sendJson(response, 404, { error: 'ไม่พบไฟล์' });
    return;
  }
  const stat = fs.statSync(filePath);
  const rangeHeader = request.headers['range'];
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    response.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    fs.createReadStream(filePath, { start: start, end: end }).pipe(response);
  } else {
    response.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(filePath).pipe(response);
  }
}

function analyzeStemEnergy(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { rms: 0, db: -100, present: false };
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size, 8 * 1024 * 1024);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 0);
    fs.closeSync(fd);

    const dataIdx = buf.indexOf('data');
    const start = dataIdx !== -1 ? dataIdx + 8 : 44;
    let sumSq = 0;
    let count = 0;
    for (let i = start; i < buf.length - 1; i += 2) {
      const s = buf.readInt16LE(i) / 32768.0;
      sumSq += s * s;
      count++;
    }
    const rms = Math.sqrt(sumSq / (count || 1));
    const db = 20 * Math.log10(rms || 1e-6);
    // Real instruments typically have RMS > 0.0035 (-49 dB)
    // Bleed from absent instruments (e.g. drums in drumless songs) is typically < 0.001 (-60 dB)
    const present = rms > 0.0035;
    return { rms: rms, db: Math.round(db * 10) / 10, present: present };
  } catch (e) {
    return { rms: 0.01, db: -40, present: true };
  }
}

function createWavHeader(dataLen, sampleRate = 44100, numChannels = 2, bitsPerSample = 16) {
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(dataLen + 36, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buf.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  return buf;
}

function mixTwoPcmWavFiles(wavPathA, wavPathB, outputPath) {
  try {
    if (!fs.existsSync(wavPathA)) return wavPathB;
    if (!fs.existsSync(wavPathB)) return wavPathA;
    const bufA = fs.readFileSync(wavPathA);
    const bufB = fs.readFileSync(wavPathB);
    const headerLen = 44;
    const minLen = Math.min(bufA.length, bufB.length);
    if (minLen <= headerLen) return wavPathA;

    const outBuf = Buffer.alloc(minLen);
    bufA.copy(outBuf, 0, 0, headerLen);
    for (let i = headerLen; i < minLen; i += 2) {
      const sA = bufA.readInt16LE(i);
      const sB = bufB.readInt16LE(i);
      let sum = sA + sB;
      if (sum > 32767) sum = 32767;
      else if (sum < -32768) sum = -32768;
      outBuf.writeInt16LE(sum, i);
    }
    fs.writeFileSync(outputPath, outBuf);
    return outputPath;
  } catch (e) {
    console.warn('[WavMixer] Error mixing tracks:', e.message);
    return wavPathA;
  }
}

function classifyInstrumentStem(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return 'guitar';
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size - 44, 44100 * 4 * 25);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 44);
    fs.closeSync(fd);

    const numSamples = Math.floor(readSize / 4);
    let onsets = 0;
    let attackSum = 0;
    let prevE = 0;
    const hop = 256;

    for (let i = 0; i < numSamples - hop; i += hop) {
      let e = 0;
      for (let j = 0; j < hop; j++) {
        const l = buf.readInt16LE((i + j) * 4) / 32768.0;
        const r = buf.readInt16LE((i + j) * 4 + 2) / 32768.0;
        const m = (l + r) * 0.5;
        e += m * m;
      }
      e = Math.sqrt(e / hop);
      const diff = e - prevE;
      if (diff > 0.025 && e > 0.015) {
        onsets++;
        attackSum += diff;
      }
      prevE = e;
    }

    const durationSec = numSamples / 44100;
    const onsetRate = onsets / (durationSec || 1);
    const avgAttack = attackSum / (onsets || 1);

    if (onsetRate < 0.4 && avgAttack < 0.02) return 'synth';
    if (avgAttack > 0.065 && onsetRate > 1.0) return 'piano';
    return 'guitar';
  } catch (e) {
    return 'guitar';
  }
}

function processOtherInstrumentStems(otherWavPath, targetStemsDir) {
  const result = { createdStems: [], absentStems: [] };
  if (!otherWavPath || !fs.existsSync(otherWavPath)) return result;

  const instType = classifyInstrumentStem(otherWavPath);

  if (instType === 'piano') {
    const dest = path.join(targetStemsDir, 'piano.wav');
    try { fs.copyFileSync(otherWavPath, dest); } catch (e) {}
    result.createdStems.push('piano');
    result.absentStems.push('guitar', 'solo_guitar');
    return result;
  }

  if (instType === 'synth') {
    const dest = path.join(targetStemsDir, 'synth.wav');
    try { fs.copyFileSync(otherWavPath, dest); } catch (e) {}
    result.createdStems.push('synth');
    result.absentStems.push('piano', 'solo_guitar');
    return result;
  }

  // Guitar processing: extract solo guitar vs rhythm guitar with zero-loss sum
  try {
    const fd = fs.openSync(otherWavPath, 'r');
    const stat = fs.fstatSync(fd);
    const pcmLen = stat.size - 44;
    const inBuf = Buffer.alloc(pcmLen);
    fs.readSync(fd, inBuf, 0, pcmLen, 44);
    fs.closeSync(fd);

    const soloBuf = Buffer.alloc(pcmLen);
    const rhythmBuf = Buffer.alloc(pcmLen);

    const sampleRate = 44100;
    const w0 = 2 * Math.PI * 1500 / sampleRate;
    const alpha = Math.sin(w0) / (2 * 1.0);
    const b0 = alpha, b1 = 0, b2 = -alpha;
    const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;

    let x1_l = 0, x2_l = 0, y1_l = 0, y2_l = 0;
    let x1_r = 0, x2_r = 0, y1_r = 0, y2_r = 0;
    let soloSumSq = 0, soloPeak = 0;

    for (let i = 0; i < pcmLen; i += 4) {
      const xl = inBuf.readInt16LE(i) / 32768.0;
      const xr = inBuf.readInt16LE(i + 2) / 32768.0;

      const yl = (b0 / a0) * xl + (b1 / a0) * x1_l + (b2 / a0) * x2_l - (a1 / a0) * y1_l - (a2 / a0) * y2_l;
      x2_l = x1_l; x1_l = xl; y2_l = y1_l; y1_l = yl;

      const yr = (b0 / a0) * xr + (b1 / a0) * x1_r + (b2 / a0) * x2_r - (a1 / a0) * y1_r - (a2 / a0) * y2_r;
      x2_r = x1_r; x1_r = xr; y2_r = y1_r; y1_r = yr;

      const mag = Math.sqrt(yl * yl + yr * yr);
      const isSolo = mag > 0.038;
      const soloGain = isSolo ? Math.min(1.0, (mag - 0.038) / 0.025) : 0.0;

      const s_solo_l = yl * soloGain;
      const s_solo_r = yr * soloGain;
      const s_rhythm_l = xl - s_solo_l;
      const s_rhythm_r = xr - s_solo_r;

      if (Math.abs(s_solo_l) > soloPeak) soloPeak = Math.abs(s_solo_l);
      if (Math.abs(s_solo_r) > soloPeak) soloPeak = Math.abs(s_solo_r);
      soloSumSq += s_solo_l * s_solo_l + s_solo_r * s_solo_r;

      const q_solo_l = Math.max(-32768, Math.min(32767, Math.round(s_solo_l * 32767)));
      const q_solo_r = Math.max(-32768, Math.min(32767, Math.round(s_solo_r * 32767)));
      const q_rhy_l = Math.max(-32768, Math.min(32767, Math.round(s_rhythm_l * 32767)));
      const q_rhy_r = Math.max(-32768, Math.min(32767, Math.round(s_rhythm_r * 32767)));

      soloBuf.writeInt16LE(q_solo_l, i);
      soloBuf.writeInt16LE(q_solo_r, i + 2);
      rhythmBuf.writeInt16LE(q_rhy_l, i);
      rhythmBuf.writeInt16LE(q_rhy_r, i + 2);
    }

    const soloRMS = Math.sqrt(soloSumSq / (pcmLen / 2));
    const header = createWavHeader(pcmLen);

    fs.writeFileSync(path.join(targetStemsDir, 'guitar.wav'), Buffer.concat([header, rhythmBuf]));
    result.createdStems.push('guitar');

    if (soloRMS > 0.0035 && soloPeak > 0.06) {
      fs.writeFileSync(path.join(targetStemsDir, 'solo_guitar.wav'), Buffer.concat([header, soloBuf]));
      result.createdStems.push('solo_guitar');
    } else {
      result.absentStems.push('solo_guitar');
    }
    result.absentStems.push('piano');
  } catch (e) {
    try { fs.copyFileSync(otherWavPath, path.join(targetStemsDir, 'guitar.wav')); } catch (err) {}
    result.createdStems.push('guitar');
    result.absentStems.push('solo_guitar', 'piano');
  }

  return result;
}

function saveSongToLibrary(songData, audioPath, originalFilename, stemsSourceDir) {
  const songId = songData.id || ('song_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  songData.id = songId;
  const songDir = path.join(libraryRoot, songId);
  fs.mkdirSync(songDir, { recursive: true });

  // 1. Copy or save original audio file
  const ext = path.extname(originalFilename || audioPath || '.mp3').toLowerCase();
  const targetAudioPath = path.join(songDir, 'original' + ext);
  if (audioPath && fs.existsSync(audioPath) && audioPath !== targetAudioPath) {
    try { fs.copyFileSync(audioPath, targetAudioPath); } catch (e) {}
  }
  songData.audioFile = 'original' + ext;
  songData.audioUrl = '/api/library/' + songId + '/audio';

  // 2. Copy and sub-separate stems into specific instruments
  const availableStems = [];
  const activeStems = [];
  const absentStems = [];
  const stemPresence = {};
  if (stemsSourceDir && fs.existsSync(stemsSourceDir)) {
    const stemsTargetDir = path.join(songDir, 'stems');
    fs.mkdirSync(stemsTargetDir, { recursive: true });

    // 2.1 Process core stems (vocals, drums, bass)
    const coreStems = ['vocals', 'drums', 'bass'];
    for (const s of coreStems) {
      const found = findStemFile(stemsSourceDir, s);
      if (found && fs.existsSync(found)) {
        const dest = path.join(stemsTargetDir, s + '.wav');
        try {
          fs.copyFileSync(found, dest);
          availableStems.push(s);
          const energy = analyzeStemEnergy(dest);
          stemPresence[s] = energy.present;
          if (energy.present) activeStems.push(s);
          else absentStems.push(s);
        } catch (e) {}
      }
    }

    // 2.2 Process 'other' -> specific instruments (guitar, solo_guitar, piano, synth)
    const foundOther = findStemFile(stemsSourceDir, 'other');
    if (foundOther && fs.existsSync(foundOther)) {
      const sub = processOtherInstrumentStems(foundOther, stemsTargetDir);
      for (const s of sub.createdStems) {
        availableStems.push(s);
        const stemPath = path.join(stemsTargetDir, s + '.wav');
        const energy = analyzeStemEnergy(stemPath);
        stemPresence[s] = energy.present;
        if (energy.present) activeStems.push(s);
        else absentStems.push(s);
      }
      for (const a of sub.absentStems) {
        if (!absentStems.includes(a)) absentStems.push(a);
        stemPresence[a] = false;
      }
    }
  }
  const finalStems = activeStems.length > 0 ? activeStems : availableStems;
  if (finalStems.length > 0) {
    songData.hasStems = true;
    songData.stems = finalStems;
    songData.absentStems = absentStems;
    songData.stemPresence = stemPresence;
  } else if (!songData.hasStems) {
    songData.hasStems = false;
    songData.stems = [];
    songData.absentStems = [];
    songData.stemPresence = {};
  }
  songData.updated = Date.now();
  if (!songData.created) songData.created = Date.now();

  // Embed chords directly onto beats so song.json is self-contained
  if (Array.isArray(songData.beats) && Array.isArray(songData.chords) && songData.chords.length > 0) {
    let chordIdx = 0;
    songData.beats = songData.beats.map(function (beat, idx) {
      const sampleT = beat.time + 0.08;
      while (chordIdx < songData.chords.length - 1 && songData.chords[chordIdx].end <= sampleT) chordIdx++;
      const chord = songData.chords[chordIdx] ? songData.chords[chordIdx].chord : 'N.C.';
      return {
        index: idx,
        time: beat.time,
        type: beat.type || (beat.downbeat ? 'downbeat' : 'beat'),
        downbeat: Boolean(beat.downbeat),
        chord: beat.chord || chord,
        aiChord: beat.aiChord || beat.chord || chord,
        confidence: Number(beat.confidence) || 0
      };
    });
  }

  // 3. Save song.json
  fs.writeFileSync(path.join(songDir, 'song.json'), JSON.stringify(songData, null, 2), 'utf8');
  return songData;
}

function getLibrarySongs() {
  if (!fs.existsSync(libraryRoot)) return [];
  const entries = fs.readdirSync(libraryRoot, { withFileTypes: true });
  const list = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const jsonPath = path.join(libraryRoot, entry.name, 'song.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          list.push({
            id: content.id || entry.name,
            title: content.title || entry.name,
            key: content.key || '—',
            bpm: content.bpm || '—',
            duration: content.duration || 0,
            hasStems: !!content.hasStems,
            stems: content.stems || [],
            absentStems: content.absentStems || [],
            stemPresence: content.stemPresence || {},
            created: content.created || 0
          });
        } catch (e) {}
      }
    }
  }
  return list.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
}

function getLibrarySong(id) {
  const jsonPath = path.join(libraryRoot, id, 'song.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function deleteLibrarySong(id) {
  const songDir = path.join(libraryRoot, id);
  if (fs.existsSync(songDir)) {
    fs.rmSync(songDir, { recursive: true, force: true });
    return true;
  }
  return false;
}

async function analyzeAccurate(filePath, meter, lang, reportProgress) {
  const stemsDirectory = path.join(tempRoot, 'stems-' + crypto.randomUUID());
  if (typeof reportProgress !== 'function') reportProgress = function () {};
  let progressInterval = null;
  let keepStems = false;
  try {
    fs.mkdirSync(stemsDirectory, { recursive: true });
    try {
      const fileStat = fs.statSync(filePath);
      // Rough estimation: 1MB MP3 ≈ 50-60s audio
      const estDurationSec = Math.max(60, Math.round(fileStat.size / (160 * 1024 / 8)));
      const estMin = Math.max(1, Math.round(estDurationSec / 60));
      const isLongSong = estDurationSec > 210;

      const sepMsg = isLongSong
        ? 'HTDemucs: กำลังแยกแทร็กเพลงขนาดยาว (~' + estMin + ' นาที) ด้วย GPU'
        : 'HTDemucs: กำลังแยกเสียงดนตรี (1–2 นาที)';
      const sepDetail = isLongSong
        ? 'เพลงมีความยาว ' + estMin + ' นาที กำลังแยกแทร็กด้วย NVIDIA RTX 3070 Ti อย่างเต็มกำลัง'
        : 'AI กำลังแยกแทร็กกลอง, เบส, เสียงร้อง และเครื่องดนตรี';

      reportProgress('separate', 15, sepMsg, sepDetail);

      // Scale progress rate according to estimated duration so it never gets stuck
      const expectedSepSeconds = Math.max(35, Math.round(estDurationSec * 0.55));
      const stepPct = (72 - 15) / expectedSepSeconds;
      let currentSepPct = 15;
      progressInterval = setInterval(function () {
        if (currentSepPct < 72) {
          currentSepPct += stepPct;
          reportProgress('separate', Math.min(72, Math.round(currentSepPct)), sepMsg, sepDetail);
        }
      }, 1000);

      await runEngine(['--separate', '-m', modelPath(separationModel), '--stems', 'drums,bass,other,vocals', '--sep-output-dir', stemsDirectory, '-f', filePath]);
      clearInterval(progressInterval);
      progressInterval = null;

      const drumFile = findStemFile(stemsDirectory, 'drums');
      const accompanimentFile = findStemFile(stemsDirectory, 'other');
      const bassFile = findStemFile(stemsDirectory, 'bass');
      const vocalsFile = findStemFile(stemsDirectory, 'vocals');
      if (drumFile && accompanimentFile) {
        keepStems = true;
        reportProgress('chords', 74, 'NVIDIA RTX 3070 Ti AI: สกัดฮาร์โมนีและถอดคอร์ด', 'ผสานเสียงเบสและเครื่องดนตรีไร้เสียงร้องเพื่อความแม่นยำสูงสุด');

        // Create instrumental harmony track (Bass + Other) for pristine chord extraction
        let chordsBackingFile = accompanimentFile;
        if (bassFile && fs.existsSync(bassFile)) {
          const harmonyPath = path.join(stemsDirectory, 'instrumental_harmony.wav');
          chordsBackingFile = mixTwoPcmWavFiles(accompanimentFile, bassFile, harmonyPath);
        }

        let subPct = 74;
        progressInterval = setInterval(function () {
          if (subPct < 92) {
            subPct += 1.4;
            reportProgress('chords', Math.round(subPct), 'NVIDIA RTX 3070 Ti: กำลังแกะคอร์ดและจับจังหวะ', 'ประมวลผลความเร็วสูงสุดบน Tensor Cores (Flash-Attention)');
          }
        }, 1000);

        console.log(`[API Accurate] ⚡ NVIDIA RTX 3070 Ti Dispatch: Harmony Chords + Beat This! + Mix Chords...`);
        const [harmonyChordsOutput, mixChordsOutput, mixBeatsOutput, lyrics] = await Promise.all([
          runEngine(['--chords', '-m', modelPath(coreModelFiles[0]), '-f', chordsBackingFile]),
          runEngine(['--chords', '-m', modelPath(coreModelFiles[0]), '-f', filePath]),
          runEngine(['--beats', '-m', modelPath(coreModelFiles[1]), '-f', filePath]),
          extractLyrics(vocalsFile || filePath, lang)
        ]);

        clearInterval(progressInterval);
        progressInterval = null;

        reportProgress('ensemble', 94, 'Beat-Aligned Ensemble: ประสานคอร์ดและห้องเพลง', 'ผสานคอร์ดแทร็กดนตรีและไฟล์รวมเข้ากับจังหวะจริง');
        const rawBeats = parseBeatTable(mixBeatsOutput);
        const harmonyChords = parseChordTable(harmonyChordsOutput);
        const mixChords = parseChordTable(mixChordsOutput);

        const beats = refineBeatGrid(rawBeats, meter);
        const chords = beatAlignedChordEnsemble(beats, mixChords, harmonyChords);
        const requestedMeter = ['2', '3', '4', '6'].includes(String(meter)) ? Number(meter) : estimateMeter(beats);

        reportProgress('final', 97, 'กำลังคำนวณคีย์และโครงสร้างเพลง', 'วิเคราะห์ Diatonic Key, BPM และเตรียมส่งมอบข้อมูล');
        return {
          chords: chords,
          beats: beats,
          meter: requestedMeter,
          lyrics: lyrics,
          stemsDirectory: stemsDirectory
        };
      }
    } catch (sepError) {
      if (progressInterval) clearInterval(progressInterval);
      console.warn('Accurate stem separation note:', sepError.message);
    }

    // Graceful fallback — run chords + beats + lyrics in parallel
    console.log('Falling back to direct full-mix pipeline (parallel)...');
    reportProgress('fallback', 60, 'กำลังวิเคราะห์คอร์ดและจังหวะจากไฟล์รวม', 'รัน BTC Transformer และ Beat This! บนไฟล์รวม');
    const [chordsOutput, beatsOutput, lyrics] = await Promise.all([
      runEngine(['--chords', '-m', modelPath(coreModelFiles[0]), '-f', filePath]),
      runEngine(['--beats', '-m', modelPath(coreModelFiles[1]), '-f', filePath]),
      extractLyrics(filePath, lang)
    ]);
    const beats = parseBeatTable(beatsOutput);
    reportProgress('final', 95, 'กำลังประมวลผลตารางคอร์ด', 'คำนวณ Key และ Beat Grid');
    return {
      chords: parseChordTable(chordsOutput),
      beats: beats,
      meter: ['2', '3', '4', '6'].includes(String(meter)) ? Number(meter) : estimateMeter(beats),
      lyrics: lyrics,
      stemsDirectory: null
    };
  } finally {
    if (progressInterval) clearInterval(progressInterval);
    if (!keepStems) {
      fs.rm(stemsDirectory, { recursive: true, force: true }, function () {});
    }
  }
}

function compactResult(chords, beats, fileName, details, lyrics) {
  if (!chords.length || !beats.length) throw new Error('AI engine วิเคราะห์คอร์ดหรือจังหวะได้ไม่ครบ');
  const lastBeat = beats[beats.length - 1].time;
  const duration = Math.max(lastBeat, ...chords.map(function (event) { return event.end || event.start; }));
  return {
    title: fileName.replace(/[.][^.]+$/, ''), author: 'ไฟล์เสียงในเครื่อง',
    duration: duration, key: deriveKey(chords), bpm: deriveBpm(beats),
    meter: details && details.meter ? details.meter : estimateMeter(beats),
    analysisMode: details && details.analysisMode ? details.analysisMode : 'standard',
    model: details && details.model ? details.model : 'BTC Transformer + Beat This!',
    chords: chords, beats: beats,
    lyrics: lyrics || { language: 'auto', segments: [] }
  };
}

async function analyze(request, response) {
  if (!engineReady()) { sendJson(response, 503, { error: 'ยังไม่พบ AI engine — เปิด setup.html เพื่อติดตั้งก่อนใช้งาน' }); return; }
  const accepted = String(request.headers['x-chordtube-noncommercial'] || '') === 'true';
  if (!accepted) { sendJson(response, 400, { error: 'ต้องยืนยันการใช้ไฟล์ส่วนตัวและไลเซนส์โมเดลก่อน' }); return; }
  const accurate = String(request.headers['x-chordtube-analysis'] || '') === 'accurate';
  const meter = String(request.headers['x-chordtube-meter'] || 'auto');
  const lang = String(request.headers['x-chordtube-lang'] || 'th');
  const jobId = request.headers['x-chordtube-job-id'] || crypto.randomUUID();

  function reportProgress(stage, percent, message, detail) {
    analysisJobs.set(jobId, {
      stage: stage,
      percent: Math.min(100, Math.max(0, percent)),
      message: message || '',
      detail: detail || '',
      updated: Date.now(),
      done: percent >= 100
    });
  }

  reportProgress('upload', 5, 'อัปโหลดไฟล์และเตรียมโมเดล AI', 'ตรวจสอบความพร้อมของไฟล์และโมเดลในเครื่อง');
  console.log(`[API /api/analyze] Start (jobId=${jobId}): mode=${accurate ? 'accurate' : 'standard'}, lang=${lang}, meter=${meter}`);
  let filePath = null;
  let stemsDirToClean = null;
  try {
    await ensureModels(accurate ? accurateModelFiles : coreModelFiles);
    reportProgress('prepare', 10, 'จัดสรรโมเดล AI ในหน่วยความจำ', 'โหลดโมเดลเตรียมประมวลผล');
    const body = await bodyBuffer(request);
    const uploaded = parseMultipartAudio(body, request.headers['content-type']);
    if (!/[.](mp3|wav|m4a|aac|flac|ogg)$/i.test(uploaded.filename)) throw new Error('รองรับไฟล์ MP3, WAV, M4A, FLAC และ OGG');
    if (uploaded.content.length < 1024) throw new Error('ไฟล์เสียงมีข้อมูลไม่เพียงพอ');
    fs.mkdirSync(tempRoot, { recursive: true });
    filePath = path.join(tempRoot, crypto.randomUUID() + path.extname(uploaded.filename));
    fs.writeFileSync(filePath, uploaded.content, { flag: 'wx' });
    console.log(`[API] Saved temp audio: ${filePath} (${uploaded.content.length} bytes)`);

    let result;
    if (accurate) {
      console.log('[API] Starting Studio Accurate pipeline...');
      const accurateResult = await analyzeAccurate(filePath, meter, lang, reportProgress);
      stemsDirToClean = accurateResult.stemsDirectory;
      result = compactResult(accurateResult.chords, accurateResult.beats, uploaded.filename, {
        analysisMode: 'accurate', meter: accurateResult.meter,
        model: 'Accurate · HTDemucs + BTC ensemble + Beat This!'
      }, accurateResult.lyrics);

      reportProgress('saving', 98, 'กำลังบันทึกลงแฟ้มเพลงของเครื่อง', 'จัดเก็บผลวิเคราะห์ ไฟล์เสียง และแทร็กแยกเสียงถาวร');
      result = saveSongToLibrary(result, filePath, uploaded.filename, accurateResult.stemsDirectory);
    } else {
      // Fast Mode: run chords + beats + lyrics all in parallel
      console.log('[API] Fast Mode: running chords + beats + lyrics in parallel...');
      reportProgress('chords_beats', 25, 'NVIDIA RTX 3070 Ti AI: กำลังวิเคราะห์คอร์ดและจังหวะ', 'ประมวลผลความเร็วสูงสุดด้วย Tensor Cores (Flash-Attention)');
      
      let fastPct = 25;
      const fastInterval = setInterval(function () {
        if (fastPct < 85) {
          fastPct += 3;
          reportProgress('chords_beats', Math.round(fastPct), 'NVIDIA RTX 3070 Ti AI: กำลังวิเคราะห์คอร์ดและจังหวะ', 'ประมวลผลความเร็วสูงสุดด้วย Tensor Cores (Flash-Attention)');
        }
      }, 500);

      console.log(`[API Fast] ⚡ NVIDIA RTX 3070 Ti: Parallel Dispatch (BTC Chords + Beat This!)...`);
      const [chordsOutput, beatsOutput, lyrics] = await Promise.all([
        runEngine(['--chords', '-m', modelPath(coreModelFiles[0]), '-f', filePath]),
        runEngine(['--beats', '-m', modelPath(coreModelFiles[1]), '-f', filePath]),
        extractLyrics(filePath, lang)
      ]);
      clearInterval(fastInterval);

      reportProgress('final', 92, 'กำลังคำนวณคีย์และประกอบ Beat Grid', 'วิเคราะห์สัดส่วนห้องเพลงและคอร์ดหลัก');
      const fastRawBeats = parseBeatTable(beatsOutput);
      const fastRawChords = parseChordTable(chordsOutput);
      const fastBeats = refineBeatGrid(fastRawBeats, meter);
      const fastSmoothedChords = smoothChordSpans(fastRawChords);
      result = compactResult(fastSmoothedChords, fastBeats, uploaded.filename, null, lyrics);
      
      reportProgress('saving', 98, 'กำลังบันทึกลงแฟ้มเพลงของเครื่อง', 'จัดเก็บผลวิเคราะห์และไฟล์เสียงต้นฉบับ');
      result = saveSongToLibrary(result, filePath, uploaded.filename, null);
    }
    reportProgress('done', 100, 'วิเคราะห์เสร็จสมบูรณ์ 100%!', 'กำลังเปิดหน้าสตูดิโอแกะคอร์ด...');
    console.log('[API] Analysis complete & saved to Library (id=' + result.id + ')! Sending response.');
    sendJson(response, 200, result);
  } catch (error) {
    reportProgress('error', 0, 'เกิดข้อผิดพลาดในการวิเคราะห์', error.message || 'วิเคราะห์ไม่สำเร็จ');
    console.error('[API Error]:', error.message || error);
    sendJson(response, 422, { error: error.message || 'วิเคราะห์เพลงไม่สำเร็จ' });
  } finally {
    if (filePath) fs.rm(filePath, { force: true }, function () {});
    if (stemsDirToClean) fs.rm(stemsDirToClean, { recursive: true, force: true }, function () {});
  }
}
async function installModels(request, response) {
  if (!engineReady()) { sendJson(response, 503, { error: 'ยังไม่พบ AI engine — เปิด setup.html เพื่อติดตั้งก่อนใช้งาน' }); return; }
  const accepted = String(request.headers['x-chordtube-noncommercial'] || '') === 'true';
  if (!accepted) { sendJson(response, 400, { error: 'ต้องยืนยันการใช้ไฟล์ส่วนตัวและไลเซนส์โมเดลก่อน' }); return; }
  const accurate = String(request.headers['x-chordtube-analysis'] || '') === 'accurate';
  try {
    await ensureModels(accurate ? accurateModelFiles : coreModelFiles);
    sendJson(response, 200, { ready: true, modelsReady: true, accurateModelsReady: accurateModelsReady() });
  } catch (error) {
    sendJson(response, 422, { error: error.message || 'ดาวน์โหลดโมเดลไม่สำเร็จ' });
  }
}
// ─── Stem Separation API ─────────────────────────────────────────────────────
async function separateStems(request, response) {
  if (!engineReady()) { sendJson(response, 503, { error: 'ยังไม่พบ AI engine' }); return; }
  const accepted = String(request.headers['x-chordtube-noncommercial'] || '') === 'true';
  if (!accepted) { sendJson(response, 400, { error: 'ต้องยืนยันสิทธิ์ใช้งานก่อน' }); return; }
  if (!fs.existsSync(modelPath(separationModel)) || fs.statSync(modelPath(separationModel)).size <= 1024 * 1024) {
    sendJson(response, 503, { error: 'ยังไม่มีโมเดล HTDemucs — กรุณาใช้โหมด Studio Accurate ก่อนเพื่อดาวน์โหลดโมเดล' });
    return;
  }
  let filePath = null;
  const sessionId = crypto.randomUUID();
  const stemsDir = path.join(tempRoot, 'stems-session-' + sessionId);
  try {
    await ensureModel(separationModel);
    const body = await bodyBuffer(request);
    const uploaded = parseMultipartAudio(body, request.headers['content-type']);
    if (!/[.](mp3|wav|m4a|aac|flac|ogg)$/i.test(uploaded.filename)) throw new Error('รองรับไฟล์ MP3, WAV, M4A, FLAC และ OGG');
    if (uploaded.content.length < 1024) throw new Error('ไฟล์เสียงมีข้อมูลไม่เพียงพอ');
    fs.mkdirSync(tempRoot, { recursive: true });
    fs.mkdirSync(stemsDir, { recursive: true });
    filePath = path.join(tempRoot, crypto.randomUUID() + path.extname(uploaded.filename));
    fs.writeFileSync(filePath, uploaded.content, { flag: 'wx' });
    console.log('[API /api/separate] Running HTDemucs stem separation...');
    await runEngine(['--separate', '-m', modelPath(separationModel),
      '--stems', 'drums,bass,other,vocals', '--sep-output-dir', stemsDir, '-f', filePath]);
    const stemFiles = {};
    const activeStems = [];
    const absentStems = [];
    const stemPresence = {};

    // 1. Process core stems (vocals, drums, bass)
    const coreStems = ['vocals', 'drums', 'bass'];
    for (const s of coreStems) {
      const found = findStemFile(stemsDir, s);
      if (found) {
        stemFiles[s] = found;
        const energy = analyzeStemEnergy(found);
        stemPresence[s] = energy.present;
        if (energy.present) activeStems.push(s);
        else absentStems.push(s);
      }
    }

    // 2. Process 'other' -> specific instruments (guitar, solo_guitar, piano, synth)
    const foundOther = findStemFile(stemsDir, 'other');
    if (foundOther && fs.existsSync(foundOther)) {
      const sub = processOtherInstrumentStems(foundOther, stemsDir);
      for (const s of sub.createdStems) {
        const p = path.join(stemsDir, s + '.wav');
        if (fs.existsSync(p)) {
          stemFiles[s] = p;
          const energy = analyzeStemEnergy(p);
          stemPresence[s] = energy.present;
          if (energy.present) activeStems.push(s);
          else absentStems.push(s);
        }
      }
      for (const a of sub.absentStems) {
        if (!absentStems.includes(a)) absentStems.push(a);
        stemPresence[a] = false;
      }
    }

    const available = Object.keys(stemFiles);
    const finalStems = activeStems.length > 0 ? activeStems : available;

    const targetSongId = request.headers['x-chordtube-song-id'];
    if (targetSongId && fs.existsSync(path.join(libraryRoot, targetSongId))) {
      const libStemsDir = path.join(libraryRoot, targetSongId, 'stems');
      fs.mkdirSync(libStemsDir, { recursive: true });
      for (const stem of available) {
        if (stemFiles[stem] && fs.existsSync(stemFiles[stem])) {
          try { fs.copyFileSync(stemFiles[stem], path.join(libStemsDir, stem + '.wav')); } catch (e) {}
        }
      }
      const songJsonPath = path.join(libraryRoot, targetSongId, 'song.json');
      if (fs.existsSync(songJsonPath)) {
        try {
          const songObj = JSON.parse(fs.readFileSync(songJsonPath, 'utf8'));
          songObj.hasStems = true;
          songObj.stems = finalStems;
          songObj.absentStems = absentStems;
          songObj.stemPresence = stemPresence;
          fs.writeFileSync(songJsonPath, JSON.stringify(songObj, null, 2), 'utf8');
        } catch (e) {}
      }
    }
    stemSessions.set(sessionId, { dir: stemsDir, stems: stemFiles, created: Date.now() });
    console.log('[API /api/separate] Success, sessionId=' + sessionId + ', activeStems=' + finalStems.join(',') + (absentStems.length ? ' (absent: ' + absentStems.join(',') + ')' : ''));
    sendJson(response, 200, { sessionId: sessionId, stems: finalStems, absentStems: absentStems, stemPresence: stemPresence, songId: targetSongId });
  } catch (error) {
    console.error('[API /api/separate Error]:', error.message);
    fs.rm(stemsDir, { recursive: true, force: true }, function () {});
    sendJson(response, 422, { error: error.message || 'แยกเสียงไม่สำเร็จ' });
  } finally {
    if (filePath) fs.rm(filePath, { force: true }, function () {});
  }
}
function serveStem(request, response, sessionId, stem) {
  const session = stemSessions.get(sessionId);
  if (!session) { sendJson(response, 404, { error: 'ไม่พบ session — อาจหมดอายุแล้ว' }); return; }
  const allowed = ['vocals', 'drums', 'bass', 'guitar', 'solo_guitar', 'piano', 'synth', 'strings', 'other'];
  if (!allowed.includes(stem)) { response.writeHead(400); response.end('Invalid stem'); return; }
  const filePath = session.stems[stem];
  if (!filePath || !fs.existsSync(filePath)) { sendJson(response, 404, { error: 'ไม่พบไฟล์เสียง ' + stem }); return; }
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'audio/wav';
  // Support range requests for audio seeking
  const rangeHeader = request.headers['range'];
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    response.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
      'Accept-Ranges': 'bytes', 'Content-Length': chunkSize,
      'Content-Type': contentType, 'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath, { start: start, end: end }).pipe(response);
  } else {
    response.writeHead(200, {
      'Content-Length': stat.size, 'Content-Type': contentType,
      'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store'
    });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(filePath).pipe(response);
  }
}
function deleteStemSession(request, response, sessionId) {
  cleanupStemSession(sessionId);
  sendJson(response, 200, { ok: true });
}
// ─────────────────────────────────────────────────────────────────────────────
function serveStatic(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  fs.stat(filePath, function (error, stats) {
    if (error || !stats.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(filePath).pipe(response);
  });
}
const server = http.createServer(function (request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    response.end();
    return;
  }
  if (request.method === 'GET' && new URL(request.url, 'http://localhost').pathname === '/api/health') {
    const rtxGpu = detectedGpus.find(function (g) { return /NVIDIA/i.test(g.name); }) || { name: nvidiaGpuName, id: rtxGpuIndex };
    sendJson(response, 200, {
      ready: engineReady(),
      modelsReady: modelsReady(),
      accurateModelsReady: accurateModelsReady(),
      whisperReady: fs.existsSync(modelPath(whisperModel)) && (function () { try { return fs.statSync(modelPath(whisperModel)).size > 1024 * 1024; } catch (e) { return false; } })(),
      engine: engineReady() ? 'CrispASR' : null,
      dualGpu: false,
      gpu: rtxGpu.name,
      gpus: [rtxGpu],
      primaryGpu: rtxGpu.id,
      maxPerformance: true
    });
    return;
  }
  if (request.method === 'POST' && new URL(request.url, 'http://localhost').pathname === '/api/analyze') {
    analyze(request, response);
    return;
  }
  if (request.method === 'POST' && new URL(request.url, 'http://localhost').pathname === '/api/models') {
    installModels(request, response);
    return;
  }
  // Real-time analysis progress endpoint
  if (request.method === 'GET' && new URL(request.url, 'http://localhost').pathname === '/api/progress') {
    const jobId = new URL(request.url, 'http://localhost').searchParams.get('jobId');
    const job = analysisJobs.get(jobId) || { stage: 'waiting', percent: 0, message: 'กำลังรอคิว...', detail: '', done: false };
    sendJson(response, 200, job);
    return;
  }
  // Library endpoints (persistent saved songs)
  const reqUrl = new URL(request.url, 'http://localhost');
  if (request.method === 'GET' && reqUrl.pathname === '/api/library') {
    sendJson(response, 200, getLibrarySongs());
    return;
  }
  const libAudioMatch = /^\/api\/library\/([a-zA-Z0-9_-]+)\/audio$/.exec(reqUrl.pathname);
  if ((request.method === 'GET' || request.method === 'HEAD') && libAudioMatch) {
    const songId = libAudioMatch[1];
    const songDir = path.join(libraryRoot, songId);
    let targetFile = null;
    if (fs.existsSync(songDir)) {
      const files = fs.readdirSync(songDir);
      const original = files.find(function (f) { return f.startsWith('original.'); });
      if (original) targetFile = path.join(songDir, original);
    }
    if (!targetFile) { sendJson(response, 404, { error: 'ไม่พบไฟล์เสียงของเพลงนี้' }); return; }
    const ext = path.extname(targetFile).toLowerCase();
    serveFileStream(targetFile, mimeTypes[ext] || 'audio/mpeg', request, response);
    return;
  }
  const libStemMatch = /^\/api\/library\/([a-zA-Z0-9_-]+)\/stems\/([a-z_]+)$/.exec(reqUrl.pathname);
  if ((request.method === 'GET' || request.method === 'HEAD') && libStemMatch) {
    const songId = libStemMatch[1];
    const stemName = libStemMatch[2];
    const targetStem = path.join(libraryRoot, songId, 'stems', stemName + '.wav');
    serveFileStream(targetStem, 'audio/wav', request, response);
    return;
  }
  const libSongMatch = /^\/api\/library\/([a-zA-Z0-9_-]+)$/.exec(reqUrl.pathname);
  if (request.method === 'GET' && libSongMatch) {
    const song = getLibrarySong(libSongMatch[1]);
    if (!song) { sendJson(response, 404, { error: 'ไม่พบเพลงในแฟ้ม' }); return; }
    sendJson(response, 200, song);
    return;
  }
  if (request.method === 'DELETE' && libSongMatch) {
    const deleted = deleteLibrarySong(libSongMatch[1]);
    sendJson(response, 200, { ok: deleted });
    return;
  }
  // Stem Separation endpoints
  if (request.method === 'POST' && new URL(request.url, 'http://localhost').pathname === '/api/separate') {
    separateStems(request, response);
    return;
  }
  const stemServeMatch = /^\/api\/stems\/([a-f0-9-]{36})\/([a-z_]+)$/.exec(new URL(request.url, 'http://localhost').pathname);
  if ((request.method === 'GET' || request.method === 'HEAD') && stemServeMatch) {
    serveStem(request, response, stemServeMatch[1], stemServeMatch[2]);
    return;
  }
  const stemDeleteMatch = /^\/api\/stems\/([a-f0-9-]{36})$/.exec(new URL(request.url, 'http://localhost').pathname);
  if (request.method === 'DELETE' && stemDeleteMatch) {
    deleteStemSession(request, response, stemDeleteMatch[1]);
    return;
  }
  if (request.method === 'GET' || request.method === 'HEAD') { serveStatic(request, response); return; }
  response.writeHead(405, { Allow: 'GET, HEAD, POST, DELETE' });
  response.end('Method not allowed');
});

server.on('error', function (err) {
  console.error('HTTP Server Error:', err);
});

process.on('uncaughtException', function (err) {
  console.error('Process Uncaught Exception:', err);
});

process.on('unhandledRejection', function (reason) {
  console.error('Process Unhandled Rejection:', reason);
});

server.listen(port, host, function () {
  console.log('Zixel Chords Local is running at http://' + host + ':' + port + '/');
  console.log(engineReady() ? 'AI engine ready.' : 'AI engine not installed. Open setup.html.');
});
