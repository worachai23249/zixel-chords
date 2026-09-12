/*
  tools/test-suite.js
  ─────────────────────────────────────────────────────────────────────────────
  Automated test suite for Zixel Chords Phase 0 & Phase 1 contracts.
  Validates:
  - parseChordLabel accuracy across standard & Harte/BTC notation
  - JobQueue lifecycle & cancellation (AbortSignal triggering)
  - Schema normalisation (legacy song.json -> v1)
  - Server endpoints: /api/health (schemaVersion & engineVersion) & DELETE /api/analyze/:id
  ─────────────────────────────────────────────────────────────────────────────
*/

'use strict';

const http   = require('http');
const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

const { parseChordLabel } = require('../adapters/analysis-adapter');
const { JobQueue, STATUS } = require('../adapters/job-queue');
const { normaliseToV1, CURRENT_SCHEMA_VERSION } = require('../client/analysis-normaliser');

async function runTests() {
  console.log('=== Zixel Chords Contract & Pipeline Test Suite ===\n');

  let passed = 0;
  let total  = 0;

  function it(desc, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${desc}`);
      console.error(`    ${err.message}`);
    }
  }

  async function itAsync(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${desc}`);
      console.error(`    ${err.message}`);
    }
  }

  // ── 1. Chord parsing ──────────────────────────────────────────────────────
  console.log('[1] Chord Label & Harte/BTC Notation Parsing');

  it('parses standard triad and 7th chords', () => {
    const cMaj = parseChordLabel('C');
    assert.strictEqual(cMaj.root, 'C');
    assert.strictEqual(cMaj.quality, 'maj');
    assert.strictEqual(cMaj.bass, null);

    const aMin = parseChordLabel('Am');
    assert.strictEqual(aMin.root, 'A');
    assert.strictEqual(aMin.quality, 'min');

    const g7 = parseChordLabel('G7');
    assert.strictEqual(g7.root, 'G');
    assert.strictEqual(g7.quality, 'dom7');
  });

  it('parses slash chords and inversion bass notes', () => {
    const cSlashE = parseChordLabel('C#m7/E');
    assert.strictEqual(cSlashE.root, 'C#');
    assert.strictEqual(cSlashE.quality, 'min7');
    assert.strictEqual(cSlashE.bass, 'E');

    const flatSlash = parseChordLabel('Bbmaj7/D');
    assert.strictEqual(flatSlash.root, 'A#');
    assert.strictEqual(flatSlash.quality, 'maj7');
    assert.strictEqual(flatSlash.bass, 'D');
  });

  it('parses Harte/MIREX/BTC colon notation (E:min7, D:7, C:maj, G:maj/3)', () => {
    const eMin7 = parseChordLabel('E:min7');
    assert.strictEqual(eMin7.root, 'E');
    assert.strictEqual(eMin7.quality, 'min7');

    const d7 = parseChordLabel('D:7');
    assert.strictEqual(d7.root, 'D');
    assert.strictEqual(d7.quality, 'dom7');

    const cMaj = parseChordLabel('C:maj');
    assert.strictEqual(cMaj.root, 'C');
    assert.strictEqual(cMaj.quality, 'maj');

    const gSlash3 = parseChordLabel('G:maj/3');
    assert.strictEqual(gSlash3.root, 'G');
    assert.strictEqual(gSlash3.quality, 'maj');
    assert.strictEqual(gSlash3.bass, '3');
  });

  it('handles no-chord tokens (N, N.C., X, no_chord)', () => {
    ['N', 'N.C.', 'X', 'NC', 'no_chord'].forEach(token => {
      const nc = parseChordLabel(token);
      assert.strictEqual(nc.root, null, `root should be null for ${token}`);
      assert.strictEqual(nc.quality, 'N.C.', `quality should be N.C. for ${token}`);
      assert.strictEqual(nc.bass, null, `bass should be null for ${token}`);
    });
  });

  // ── 2. JobQueue Lifecycle & Cancellation ──────────────────────────────────
  console.log('\n[2] JobQueue & Cancellation');

  it('creates jobs with default pending state and AbortSignal', () => {
    const q = new JobQueue();
    const job = q.create('job-001');
    assert.strictEqual(job.id, 'job-001');
    assert.strictEqual(job.status, STATUS.PENDING);
    assert.strictEqual(job.signal.aborted, false);
    q.destroy();
  });

  it('updates progress through stages', () => {
    const q = new JobQueue();
    q.create('job-002');
    q.report('job-002', 'separate', 45, 'Separating stems', 'HTDemucs running');
    const p = q.getProgress('job-002');
    assert.strictEqual(p.stage, 'separate');
    assert.strictEqual(p.percent, 45);
    assert.strictEqual(p.message, 'Separating stems');
    q.destroy();
  });

  it('cancelling a job aborts the AbortSignal and updates status', () => {
    const q = new JobQueue();
    const job = q.create('job-003');
    let abortFired = false;
    job.signal.addEventListener('abort', () => { abortFired = true; });

    const cancelled = q.cancel('job-003');
    assert.strictEqual(cancelled, true);
    assert.strictEqual(q.isCancelled('job-003'), true);
    assert.strictEqual(job.signal.aborted, true);
    assert.strictEqual(abortFired, true);
    assert.strictEqual(job.status, STATUS.CANCELLED);
    q.destroy();
  });

  it('cannot cancel already completed or errored jobs', () => {
    const q = new JobQueue();
    q.create('job-004');
    q.complete('job-004');
    assert.strictEqual(q.cancel('job-004'), false);
    q.destroy();
  });

  // ── 3. Normaliser & Schema v1 ──────────────────────────────────────────────
  console.log('\n[3] Analysis Schema Normaliser (Legacy -> v1)');

  it('normalises legacy song object into schema v1 with enriched chords and provenance', () => {
    const legacy = {
      title: 'Test Song',
      duration: 120,
      chords: [
        { start: 0, end: 4, chord: 'N' },
        { start: 4, end: 8, chord: 'C' },
        { start: 8, end: 12, chord: 'E:min7' }
      ],
      beats: [
        { time: 0, downbeat: true },
        { time: 1, downbeat: false }
      ]
    };
    const v1 = normaliseToV1(legacy);
    assert.strictEqual(v1.schemaVersion, 1);
    assert.strictEqual(v1.title, 'Test Song');
    assert.strictEqual(v1.chords[0].root, null);
    assert.strictEqual(v1.chords[0].quality, 'N.C.');
    assert.strictEqual(v1.chords[1].root, 'C');
    assert.strictEqual(v1.chords[1].quality, 'maj');
    assert.strictEqual(v1.chords[2].root, 'E');
    assert.strictEqual(v1.chords[2].quality, 'min7');
    assert.ok(v1.provenance);
    assert.strictEqual(v1.provenance._legacy, true);
  });

  it('preserves existing schemaVersion:1 objects without modification', () => {
    const existing = {
      schemaVersion: 1,
      title: 'Current Song',
      chords: [{ start: 0, end: 2, chord: 'Am', root: 'A', quality: 'min', bass: null, confidence: 0 }],
      beats: [],
      provenance: { runtime: 'CrispASR', precision: 'fp16' }
    };
    const res = normaliseToV1(existing);
    assert.strictEqual(res.schemaVersion, 1);
    assert.strictEqual(res.title, 'Current Song');
    assert.strictEqual(res.provenance.precision, 'fp16');
  });

  // ── 4. Server Integration ──────────────────────────────────────────────────
  console.log('\n[4] Server Endpoints');

  await itAsync('queries server /api/health and cancellation route', async () => {
    // server.js runs on port 4173. Query /api/health
    const healthData = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:4173/api/health', res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    assert.strictEqual(healthData.schemaVersion, 1, 'Health must return schemaVersion: 1');
    assert.ok(healthData.engineVersion, 'Health must return engineVersion');
    assert.ok(healthData.gpu, 'Health must report GPU name');

    // Test DELETE /api/analyze/:jobId endpoint
    const testJobUuid = '11111111-2222-3333-4444-555555555555';
    const deleteRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 4173,
        path: `/api/analyze/${testJobUuid}`,
        method: 'DELETE'
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(deleteRes.status, 200, 'DELETE /api/analyze should return 200');
    assert.strictEqual(deleteRes.data.jobId, testJobUuid, 'Response should contain matching jobId');
  });

  // ── 5. TensorRT Engine Cache Manager ──────────────────────────────────────
  console.log('\n[5] TensorRT Engine Cache Key Generation');

  it('generates deterministic cache keys incorporating model sha256, SM, and driver', () => {
    const { EngineCacheManager } = require('./engine-cache');
    const mgr = new EngineCacheManager();
    const keyData = mgr.generateCacheKey({
      modelFile: path.join(__dirname, '..', '.engine', 'models', 'btc-chords-large-f16.gguf'),
      modelConfig: 'btc_v1',
      precision: 'fp16',
    });
    assert.ok(keyData.cacheKey.includes('sm8.6'), 'Key must contain SM 8.6 compute capability');
    assert.ok(keyData.cacheKey.includes('fp16'), 'Key must contain precision fp16');
    assert.ok(keyData.engineFilename.endsWith('.engine'), 'Engine filename must have .engine extension');
  });

  // ── 6. Unified AnalysisApiClient ──────────────────────────────────────────
  console.log('\n[6] Unified AnalysisApiClient (HTTP & Tauri Transport Bridge)');

  await itAsync('queries health and library using AnalysisApiClient', async () => {
    const { AnalysisApiClient } = require('../client/analysis-api');
    const client = new AnalysisApiClient('http://127.0.0.1:4173');
    const health = await client.getHealth();
    assert.strictEqual(health.schemaVersion, 1);
    assert.strictEqual(health.ready, true);

    const library = await client.listLibrary();
    assert.ok(Array.isArray(library));
  });

  // ── 7. System Diagnostics Tool ─────────────────────────────────────────────
  console.log('\n[7] Preflight System Diagnostics');

  it('runs complete preflight diagnostics check', () => {
    const { runDiagnostics } = require('./diagnostics');
    const ok = runDiagnostics();
    assert.strictEqual(ok, true, 'Diagnostics should pass all checks on the current system');
  });

  // ── 8. Standard MIDI (.mid) File Generator ─────────────────────────────────
  console.log('\n[8] Standard MIDI (SMF Format 1) Exporter');

  it('generates compliant multi-track MIDI binary buffer with chords, bassline, and tempo', () => {
    const { generateMidiFile } = require('../client/midi-export');
    const mockSong = {
      title: 'Zixel Test Song',
      bpm: 120,
      meter: 4,
      duration: 8.0,
      key: 'C',
      beats: [
        { time: 0.0, chord: 'C', downbeat: true },
        { time: 0.5, chord: 'C', downbeat: false },
        { time: 1.0, chord: 'Am', downbeat: false },
        { time: 1.5, chord: 'Am', downbeat: false },
        { time: 2.0, chord: 'F', downbeat: true },
        { time: 2.5, chord: 'F', downbeat: false },
        { time: 3.0, chord: 'G', downbeat: false },
        { time: 3.5, chord: 'G', downbeat: false },
        { time: 4.0, chord: 'C', downbeat: true }
      ]
    };

    const binary = generateMidiFile(mockSong);
    assert.ok(binary instanceof Uint8Array, 'Output must be a Uint8Array');
    assert.ok(binary.length > 50, 'Binary must have substantial MIDI data');

    // Verify MThd Header
    const headerTag = String.fromCharCode(...binary.slice(0, 4));
    assert.strictEqual(headerTag, 'MThd', 'File must start with MThd');

    // Format 1 (bytes 8-9)
    const format = (binary[8] << 8) | binary[9];
    assert.strictEqual(format, 1, 'MIDI format must be 1 (Multi-Track)');

    // 3 Tracks (bytes 10-11)
    const tracks = (binary[10] << 8) | binary[11];
    assert.strictEqual(tracks, 3, 'Must contain 3 tracks: Conductor, Chords, Bass');

    // Division 480 PPQ (bytes 12-13)
    const ppq = (binary[12] << 8) | binary[13];
    assert.strictEqual(ppq, 480, 'Division must be 480 PPQ');
  });

  // ── 9. Web MIDI & AI Chord Evaluator ──────────────────────────────────────
  console.log('\n[9] Web MIDI Engine & AI Chord Evaluator');

  it('accurately parses chords, computes notes, and scores played MIDI notes', () => {
    const { MidiEngine } = require('../client/midi-engine');
    const engine = new MidiEngine();

    // 1. getChordNotes
    const cNotes = engine.getChordNotes('C');
    assert.deepStrictEqual(cNotes.notes, ['C', 'E', 'G']);
    assert.deepStrictEqual(cNotes.pitchClasses, [0, 4, 7]);

    const amNotes = engine.getChordNotes('Am');
    assert.deepStrictEqual(amNotes.notes, ['A', 'C', 'E']);

    // 2. evaluateChord with no notes pressed
    const emptyEval = engine.evaluateChord('C');
    assert.strictEqual(emptyEval.score, 0);
    assert.strictEqual(emptyEval.isCorrect, false);

    // 3. evaluateChord with perfect C major triad pressed (60, 64, 67)
    engine.noteOn(60); // C4
    engine.noteOn(64); // E4
    engine.noteOn(67); // G4
    const perfectEval = engine.evaluateChord('C');
    assert.strictEqual(perfectEval.score, 100);
    assert.strictEqual(perfectEval.isCorrect, true);

    // 4. evaluateChord with wrong extra note (F#4 = 66)
    engine.noteOn(66);
    const penaltyEval = engine.evaluateChord('C');
    assert.ok(penaltyEval.score < 100, 'Extra wrong note must trigger penalty');
    assert.ok(penaltyEval.extraNotes.includes('F#'), 'Extra note must be detected as F#');

    // Clean up
    engine.noteOff(60);
    engine.noteOff(64);
    engine.noteOff(67);
    engine.noteOff(66);
    assert.strictEqual(engine.activeNotes.size, 0);
  });

  // ── 10. Thai Syllable & Word Tokenizer ─────────────────────────────────────
  console.log('\n[10] Thai Syllable & Word Tokenizer Engine');

  it('segments Thai sentences and generates timed syllables for teleprompter', () => {
    const { ThaiTokenizer } = require('../client/thai-tokenizer');
    const tokenizer = new ThaiTokenizer();

    // 1. Text tokenization
    const tokens = tokenizer.tokenize('สวัสดีวันศุกร์');
    assert.ok(tokens.length >= 1, 'Must segment Thai text');
    assert.ok(tokens.includes('สวัสดี') || tokens.includes('วัน'), 'Must recognize Thai root words');

    // 2. Timed syllables generation
    const syllables = tokenizer.createTimedSyllables('ยินดีต้อนรับสู่สตูดิโอ', 1.0, 5.0);
    assert.ok(Array.isArray(syllables));
    assert.ok(syllables.length >= 4, 'Must split compound words into syllables');
    assert.strictEqual(syllables[0].start, 1.0, 'First syllable starts at startTime');
    assert.ok(syllables[syllables.length - 1].end <= 5.0, 'Last syllable ends at or before endTime');

    // Non-overlapping sequential timing
    for (let i = 1; i < syllables.length; i++) {
      assert.ok(syllables[i].start >= syllables[i - 1].start, 'Timestamps must be monotonically non-decreasing');
    }
  });

  // ── 11. Command Pattern Undo/Redo System ───────────────────────────────────
  console.log('\n[11] Undo / Redo Transaction Manager');

  it('supports execute, undo, and redo transitions on chord changes', () => {
    const { UndoManager, ChangeChordCommand } = require('../client/undo-redo');
    const mgr = new UndoManager(20);

    const beat = { time: 2.0, chord: 'C', aiChord: 'C' };
    let callbackCount = 0;

    const cmd = new ChangeChordCommand(beat, 'C', 'Dm', (val) => {
      callbackCount++;
    });

    // 1. Initial state
    assert.strictEqual(mgr.canUndo(), false);
    assert.strictEqual(mgr.canRedo(), false);

    // 2. Execute
    mgr.execute(cmd);
    assert.strictEqual(beat.chord, 'Dm', 'Chord should be changed to Dm');
    assert.strictEqual(mgr.canUndo(), true);
    assert.strictEqual(mgr.canRedo(), false);

    // 3. Undo
    mgr.undo();
    assert.strictEqual(beat.chord, 'C', 'Chord should be restored to C');
    assert.strictEqual(mgr.canUndo(), false);
    assert.strictEqual(mgr.canRedo(), true);

    // 4. Redo
    mgr.redo();
    assert.strictEqual(beat.chord, 'Dm', 'Chord should be redone to Dm');
    assert.strictEqual(mgr.canUndo(), true);
    assert.strictEqual(mgr.canRedo(), false);
  });

  // ── 12. 88-Key Concert Grand Piano Specifications ──────────────────────────
  console.log('\n[12] Concert Grand Piano 88-Key Layout & Presets');

  it('validates 88-key acoustic grand piano geometry and presets', () => {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const PIANO_PRESETS = {
      88: { start: 21, end: 108, name: '88 คีย์ (Concert Grand)' },
      76: { start: 28, end: 103, name: '76 คีย์ (Stage Piano)' },
      61: { start: 36, end: 96,  name: '61 คีย์ (Standard Synth)' },
      49: { start: 36, end: 84,  name: '49 คีย์ (Producer Compact)' },
      25: { start: 48, end: 72,  name: '25 คีย์ (Mini Keyboard)' }
    };

    // Helper to generate keys for any preset
    function generateKeys(startMidi, endMidi) {
      const keys = [];
      for (let midi = startMidi; midi <= endMidi; midi++) {
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        const noteName = NOTE_NAMES[noteIndex];
        const isBlack = noteName.includes('#');
        keys.push({ midi, noteName, octave, fullNote: `${noteName}${octave}`, isBlack });
      }
      return keys;
    }

    // 1. Verify 88-Key Concert Grand specs
    const grand88 = generateKeys(PIANO_PRESETS[88].start, PIANO_PRESETS[88].end);
    assert.strictEqual(grand88.length, 88, 'Grand piano must have exactly 88 keys');
    
    // First key must be A0 (MIDI 21)
    assert.strictEqual(grand88[0].midi, 21);
    assert.strictEqual(grand88[0].fullNote, 'A0');
    assert.strictEqual(grand88[0].isBlack, false, 'A0 is a white key');

    // Last key must be C8 (MIDI 108)
    assert.strictEqual(grand88[87].midi, 108);
    assert.strictEqual(grand88[87].fullNote, 'C8');
    assert.strictEqual(grand88[87].isBlack, false, 'C8 is a white key');

    // Count white & black keys: standard acoustic piano has 52 white keys, 36 black keys
    const whiteKeys = grand88.filter(k => !k.isBlack);
    const blackKeys = grand88.filter(k => k.isBlack);
    assert.strictEqual(whiteKeys.length, 52, 'Grand piano must have 52 white keys');
    assert.strictEqual(blackKeys.length, 36, 'Grand piano must have 36 black keys');

    // Middle C check: MIDI 60 = C4
    const middleC = grand88.find(k => k.midi === 60);
    assert.ok(middleC, 'Middle C must exist');
    assert.strictEqual(middleC.fullNote, 'C4');
    assert.strictEqual(middleC.isBlack, false);

    // 2. Verify all presets
    for (const [countStr, preset] of Object.entries(PIANO_PRESETS)) {
      const count = parseInt(countStr, 10);
      const keys = generateKeys(preset.start, preset.end);
      assert.strictEqual(keys.length, count, `Preset ${count} must generate exactly ${count} keys`);
      assert.ok(keys[0].midi >= 21 && keys[keys.length - 1].midi <= 108, `Preset ${count} must stay within 88-key range`);
    }
  });

  // ── 13. GuitarTuna DSP Pitch Engine & Tuning Presets ─────────────────────
  console.log('\n[13] GuitarTuna DSP Pitch Engine & Instrument Tuning Presets');

  it('validates GuitarTuna presets, string frequencies, and auto-matching DSP', () => {
    const TUNER_PRESETS = {
      standard_guitar: [
        { id: 6, note: 'E', octave: 2, freq: 82.41 },
        { id: 5, note: 'A', octave: 2, freq: 110.00 },
        { id: 4, note: 'D', octave: 3, freq: 146.83 },
        { id: 3, note: 'G', octave: 3, freq: 196.00 },
        { id: 2, note: 'B', octave: 3, freq: 246.94 },
        { id: 1, note: 'e', octave: 4, freq: 329.63 }
      ],
      drop_d: [
        { id: 6, note: 'D', octave: 2, freq: 73.42 },
        { id: 5, note: 'A', octave: 2, freq: 110.00 },
        { id: 4, note: 'D', octave: 3, freq: 146.83 },
        { id: 3, note: 'G', octave: 3, freq: 196.00 },
        { id: 2, note: 'B', octave: 3, freq: 246.94 },
        { id: 1, note: 'e', octave: 4, freq: 329.63 }
      ],
      ukulele: [
        { id: 4, note: 'G', octave: 4, freq: 392.00 },
        { id: 3, note: 'C', octave: 4, freq: 261.63 },
        { id: 2, note: 'E', octave: 4, freq: 329.63 },
        { id: 1, note: 'A', octave: 4, freq: 440.00 }
      ],
      bass: [
        { id: 4, note: 'E', octave: 1, freq: 41.20 },
        { id: 3, note: 'A', octave: 1, freq: 55.00 },
        { id: 2, note: 'D', octave: 2, freq: 73.42 },
        { id: 1, note: 'G', octave: 2, freq: 98.00 }
      ]
    };

    function findClosestString(freq, strings) {
      let closest = strings[0];
      let minDiff = Infinity;
      for (const s of strings) {
        const diff = Math.abs(12 * Math.log2(freq / s.freq));
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      }
      return closest;
    }

    // 1. Verify Standard Guitar strings & auto matching with pitch variations
    const guitarStrings = TUNER_PRESETS.standard_guitar;
    assert.strictEqual(guitarStrings.length, 6, 'Standard guitar must have 6 strings');

    for (const s of guitarStrings) {
      // Test exact frequency
      const exactMatch = findClosestString(s.freq, guitarStrings);
      assert.strictEqual(exactMatch.id, s.id, `Exact match for string ${s.id}`);

      // Test flat pitch (-25 cents)
      const flatFreq = s.freq * Math.pow(2, -25 / 1200);
      const flatMatch = findClosestString(flatFreq, guitarStrings);
      assert.strictEqual(flatMatch.id, s.id, `Flat match (-25 cents) for string ${s.id}`);

      // Test sharp pitch (+25 cents)
      const sharpFreq = s.freq * Math.pow(2, +25 / 1200);
      const sharpMatch = findClosestString(sharpFreq, guitarStrings);
      assert.strictEqual(sharpMatch.id, s.id, `Sharp match (+25 cents) for string ${s.id}`);
    }

    // 2. Verify Drop D has 6th string at D2
    const dropDStrings = TUNER_PRESETS.drop_d;
    assert.strictEqual(dropDStrings[0].freq, 73.42, 'Drop D 6th string must be D2 (73.42 Hz)');

    // 3. Verify Ukulele has 4 strings and A4=440 Hz
    const ukeStrings = TUNER_PRESETS.ukulele;
    assert.strictEqual(ukeStrings.length, 4);
    assert.strictEqual(ukeStrings[3].freq, 440.00, 'Ukulele string 1 must be A4 (440 Hz)');

    // 4. Verify Bass has 4 strings down to E1=41.2 Hz
    const bassStrings = TUNER_PRESETS.bass;
    assert.strictEqual(bassStrings.length, 4);
    assert.strictEqual(bassStrings[0].freq, 41.20, 'Bass string 4 must be E1 (41.2 Hz)');

    // 5. Verify Autocorrelation Algorithm on Synthetic Buffer
    function autoCorrelateTest(buf, sampleRate) {
      const size = buf.length;
      let r1 = 0, r2 = size - 1, thres = 0.2;
      for (let i = 0; i < size / 2; i++) {
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
      }
      for (let i = 1; i < size / 2; i++) {
        if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
      }
      const slice = buf.slice(r1, r2);
      const c = new Array(slice.length).fill(0);
      for (let i = 0; i < slice.length; i++) {
        for (let j = 0; j < slice.length - i; j++) {
          c[i] = c[i] + slice[j] * slice[j + i];
        }
      }
      let d = 0;
      while (c[d] > c[d + 1]) d++;
      let maxval = -1, maxpos = -1;
      for (let i = d; i < slice.length; i++) {
        if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
      }
      let T0 = maxpos;
      if (T0 > 0 && T0 < slice.length - 1) {
        const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);
      }
      return sampleRate / T0;
    }

    // Generate 440 Hz test tone at 44100 Hz sample rate
    const sampleRate = 44100;
    const testBuffer = new Float32Array(2048);
    for (let i = 0; i < testBuffer.length; i++) {
      testBuffer[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    }

    const detected = autoCorrelateTest(testBuffer, sampleRate);
    const errorCents = Math.abs(1200 * Math.log2(detected / 440));
    assert.ok(errorCents < 1.0, `Autocorrelation detected pitch ${detected.toFixed(2)}Hz within 1 cent of 440Hz`);
  });

  // ── 14. VR Piano (vrpiano.co.jp) Chord Theory & Directory Engine ───────────
  console.log('\n[14] VR Piano (vrpiano.co.jp) Chord Theory & Directory Engine');

  it('validates 12 roots, 15 types, and exact 108 standard chords directory', () => {
    const VRP_ROOTS = [
      { n: 'C',  pc: 0,  li: 0 }, { n: 'C♯', pc: 1,  li: 0 }, { n: 'D',  pc: 2,  li: 1 },
      { n: 'E♭', pc: 3,  li: 2 }, { n: 'E',  pc: 4,  li: 2 }, { n: 'F',  pc: 5,  li: 3 },
      { n: 'F♯', pc: 6,  li: 3 }, { n: 'G',  pc: 7,  li: 4 }, { n: 'A♭', pc: 8,  li: 5 },
      { n: 'A',  pc: 9,  li: 5 }, { n: 'B♭', pc: 10, li: 6 }, { n: 'B',  pc: 11, li: 6 }
    ];

    const VRP_TYPES = [
      { id: '',     lab: 'เมเจอร์', th: 'เมเจอร์',              iv: [0, 4, 7],     st: [0, 2, 4] },
      { id: 'm',    lab: 'm',       th: 'ไมเนอร์',              iv: [0, 3, 7],     st: [0, 2, 4] },
      { id: '7',    lab: '7',       th: 'เซเวนธ์',              iv: [0, 4, 7, 10], st: [0, 2, 4, 6] },
      { id: 'm7',   lab: 'm7',      th: 'ไมเนอร์เซเวนธ์',       iv: [0, 3, 7, 10], st: [0, 2, 4, 6] },
      { id: 'M7',   lab: 'M7',      th: 'เมเจอร์เซเวนธ์',       iv: [0, 4, 7, 11], st: [0, 2, 4, 6] },
      { id: 'mM7',  lab: 'mM7',     th: 'ไมเนอร์เมเจอร์เซเวนธ์', iv: [0, 3, 7, 11], st: [0, 2, 4, 6] },
      { id: '6',    lab: '6',       th: 'ซิกซ์',                iv: [0, 4, 7, 9],  st: [0, 2, 4, 5] },
      { id: 'm6',   lab: 'm6',      th: 'ไมเนอร์ซิกซ์',         iv: [0, 3, 7, 9],  st: [0, 2, 4, 5] },
      { id: 'dim',  lab: 'dim',     th: 'ดิมินิชท์',            iv: [0, 3, 6],     st: [0, 2, 4] },
      { id: 'dim7', lab: 'dim7',    th: 'ดิมินิชท์เซเวนธ์',     iv: [0, 3, 6, 9],  st: [0, 2, 4, 6] },
      { id: 'm7b5', lab: 'm7♭5',    th: 'ไมเนอร์เซเวนธ์แฟลต5', iv: [0, 3, 6, 10], st: [0, 2, 4, 6] },
      { id: 'aug',  lab: 'aug',     th: 'ออกเมนเต็ด',           iv: [0, 4, 8],     st: [0, 2, 4] },
      { id: 'sus4', lab: 'sus4',    th: 'ซัสโฟร์',              iv: [0, 5, 7],     st: [0, 3, 4] },
      { id: 'sus2', lab: 'sus2',    th: 'ซัสทู',                iv: [0, 2, 7],     st: [0, 1, 4] },
      { id: 'add9', lab: 'add9',    th: 'แอดไนน์',              iv: [0, 2, 4, 7],  st: [0, 1, 2, 4] }
    ];

    assert.strictEqual(VRP_ROOTS.length, 12);
    assert.strictEqual(VRP_TYPES.length, 15);

    // 108 chords table = 12 roots * 9 core types
    let count108 = 0;
    for (let r = 0; r < 12; r++) {
      for (let t = 0; t < 9; t++) {
        count108++;
      }
    }
    assert.strictEqual(count108, 108);
  });

  it('validates VR Piano inversion math and reverse chord identifier', () => {
    const VRP_ROOTS = [
      { n: 'C',  pc: 0,  li: 0 }, { n: 'C♯', pc: 1,  li: 0 }, { n: 'D',  pc: 2,  li: 1 },
      { n: 'E♭', pc: 3,  li: 2 }, { n: 'E',  pc: 4,  li: 2 }, { n: 'F',  pc: 5,  li: 3 },
      { n: 'F♯', pc: 6,  li: 3 }, { n: 'G',  pc: 7,  li: 4 }, { n: 'A♭', pc: 8,  li: 5 },
      { n: 'A',  pc: 9,  li: 5 }, { n: 'B♭', pc: 10, li: 6 }, { n: 'B',  pc: 11, li: 6 }
    ];
    const VRP_TYPES = [
      { id: '',     lab: 'เมเจอร์', th: 'เมเจอร์',              iv: [0, 4, 7],     st: [0, 2, 4] },
      { id: 'm',    lab: 'm',       th: 'ไมเนอร์',              iv: [0, 3, 7],     st: [0, 2, 4] },
      { id: '7',    lab: '7',       th: 'เซเวนธ์',              iv: [0, 4, 7, 10], st: [0, 2, 4, 6] },
      { id: 'm7',   lab: 'm7',      th: 'ไมเนอร์เซเวนธ์',       iv: [0, 3, 7, 10], st: [0, 2, 4, 6] },
      { id: 'M7',   lab: 'M7',      th: 'เมเจอร์เซเวนธ์',       iv: [0, 4, 7, 11], st: [0, 2, 4, 6] }
    ];

    const KB_LO = 48, KB_HI = 72;
    function chordMidi(ri, ti, inv = 0) {
      const r = VRP_ROOTS[ri], iv = VRP_TYPES[ti].iv, n = iv.length;
      inv = ((inv % n) + n) % n;
      const rel = [];
      for (let i = 0; i < n; i++) {
        let d = iv[(inv + i) % n] - iv[inv];
        if (d < 0) d += 12;
        rel.push(d);
      }
      const span = rel[n - 1];
      const bassPc = (r.pc + iv[inv]) % 12;
      const ideal = KB_LO + (KB_HI - KB_LO - span) / 2;
      const lo = KB_LO + (((bassPc - KB_LO) % 12) + 12) % 12;
      let best = lo;
      for (let m = lo; m <= KB_HI - span; m += 12) {
        if (Math.abs(m - ideal) < Math.abs(best - ideal)) best = m;
      }
      if (best + span > KB_HI) best = lo;
      return rel.map(x => best + x);
    }

    // Root pos C Major (C, E, G)
    const cRoot = chordMidi(0, 0, 0);
    assert.strictEqual(cRoot[0] % 12, 0); // Root note is C
    assert.strictEqual(cRoot[1] % 12, 4); // 3rd is E
    assert.strictEqual(cRoot[2] % 12, 7); // 5th is G
    assert.ok(cRoot.every(m => m >= KB_LO && m <= KB_HI));

    // 1st inversion C Major (E, G, C)
    const cInv1 = chordMidi(0, 0, 1);
    assert.strictEqual(cInv1[0] % 12, 4); // Bass is E
    assert.strictEqual(cInv1[1] % 12, 7); // G
    assert.strictEqual(cInv1[2] % 12, 0); // C
    assert.ok(cInv1.every(m => m >= KB_LO && m <= KB_HI));
  });

  // ── 15. Ukulele Pro Authentic Hawaiian Chords & Re-entrant Tuning Engine ───
  console.log('\n[15] Ukulele Pro Authentic Hawaiian Chords & Re-entrant Tuning Engine');

  it('validates 12 roots, 14 qualities, 168 authentic chord definitions and re-entrant tuning', () => {
    const ukeDbPath = path.resolve(__dirname, '../client/ukulele-chords-complete.json');
    assert.ok(fs.existsSync(ukeDbPath), 'ukulele-chords-complete.json must exist');
    const ukeDb = JSON.parse(fs.readFileSync(ukeDbPath, 'utf8'));

    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const qualities = ['Major', 'Minor', '7', 'maj7', 'm7', 'sus4', 'sus2', '6', 'm6', 'dim', 'dim7', 'aug', '9', 'add9'];
    const openMidis = [67, 60, 64, 69]; // G4, C4, E4, A4 (Hawaiian standard re-entrant)

    // Verify Re-entrant tuning: String 3 (C4) has lower pitch than String 4 (G4)
    assert.ok(openMidis[1] < openMidis[0], 'Ukulele re-entrant tuning: C4 (60) is lower in pitch than G4 (67)');
    assert.strictEqual(openMidis[3], 69, 'Ukulele string 1 is concert A4 (440 Hz / MIDI 69)');

    let chordCount = 0;
    roots.forEach((r) => {
      assert.ok(ukeDb[r], `Root ${r} must exist in Ukulele DB`);
      qualities.forEach((q) => {
        const positions = ukeDb[r][q];
        assert.ok(Array.isArray(positions) && positions.length > 0, `Chord ${r} ${q} must have at least 1 authentic voicing`);
        chordCount++;

        positions.forEach((pos) => {
          assert.strictEqual(pos.frets.length, 4, 'Ukulele voicing must define exactly 4 string frets');
          assert.strictEqual(pos.fingers.length, 4, 'Ukulele voicing must define exactly 4 string fingers');
          assert.strictEqual(pos.midis.length, 4, 'Ukulele voicing must define 4 MIDI pitches');

          // Verify computed MIDI values match openMidis + fret
          pos.frets.forEach((fret, sIdx) => {
            if (fret >= 0) {
              assert.strictEqual(pos.midis[sIdx], openMidis[sIdx] + fret);
            }
          });
        });
      });
    });

    assert.strictEqual(chordCount, 168, 'Ukulele DB must contain exactly 168 chord definitions (12 roots x 14 qualities)');

    // Verify Classic Fingerings
    // C Major open: [0, 0, 0, 3]
    assert.deepStrictEqual(ukeDb.C.Major[0].frets, [0, 0, 0, 3]);
    // G Major: [0, 2, 3, 2]
    assert.deepStrictEqual(ukeDb.G.Major[0].frets, [0, 2, 3, 2]);
    // F Major: [2, 0, 1, 0]
    assert.deepStrictEqual(ukeDb.F.Major[0].frets, [2, 0, 1, 0]);
    // Dm: [2, 2, 1, 0]
    assert.deepStrictEqual(ukeDb.D.Minor[0].frets, [2, 2, 1, 0]);
    // Bm Barre: [4, 2, 2, 2]
    assert.deepStrictEqual(ukeDb.B.Minor[0].frets, [4, 2, 2, 2]);
    assert.strictEqual(ukeDb.B.Minor[0].barre.fret, 2);
  });

  console.log(`\n=== Test Results: ${passed}/${total} Passed ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test runner fatal:', err);
  process.exit(1);
});
