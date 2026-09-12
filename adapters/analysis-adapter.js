/*
  adapters/analysis-adapter.js
  ─────────────────────────────────────────────────────────────────────────────
  Adapter interface for the Zixel Chords analysis backend.

  Every backend (CrispASR/Vulkan CLI, future ONNX worker, future TensorRT) must
  implement the same AdapterInterface so server.js never branches on backend
  type — it only uses the adapter it received.

  Current implementation: CrispASRAdapter (wraps .engine/crispasr/crispasr.exe)

  Contract rules:
  - All timing values are seconds (number).
  - Methods throw on unrecoverable error; caller decides how to surface to UI.
  - No file writes outside the paths explicitly passed in (temp, outputDir).
  - Every result includes a `backend` and `engineVersion` string for provenance.

  ─────────────────────────────────────────────────────────────────────────────
*/

'use strict';

const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

// ─── Shared type helpers ──────────────────────────────────────────────────────

/**
 * Parse a chord string such as "C#m7", "Bbmaj7/D", "N.C." into structured fields.
 *
 * Returns:
 *   { root: string|null, quality: string, bass: string|null }
 *
 * root    — pitch class name using sharps (e.g. "C#", "G"), null for N.C.
 * quality — chord quality token ("maj", "min", "dom7", "maj7", "min7",
 *           "sus4", "sus2", "dim", "aug", "hdim7", "dim7", "minmaj7", "")
 * bass    — explicit bass note after "/" if present (sharp normalised), null otherwise
 */
function parseChordLabel(str) {
  const s = String(str || '').trim();

  // No-chord tokens (including MIREX 'N' and 'no_chord')
  if (!s || /^(N[.]?C[.]?|X|NC|N|no_chord)$/i.test(s)) {
    return { root: null, quality: 'N.C.', bass: null };
  }

  // Enharmonic flat→sharp map
  const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const PITCH_NAMES   = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function normalisePitch(p) {
    if (!p) return null;
    const upper = p.charAt(0).toUpperCase() + p.slice(1);
    return FLAT_TO_SHARP[upper] || (PITCH_NAMES.includes(upper) ? upper : p);
  }

  // Pattern: optional root (A–G + accidental) + optional colon (:) + optional quality + optional /bass
  const RE = /^([A-G][#b]?)(?::?((?:maj7|maj|min7|minmaj7|m7b5|hdim7|dim7|dim|aug|sus[24]|m7|min|m|7|9|11|13|add\d+|6)?))(?:\/([A-G][#b]?|\d+))?$/i;
  const m = RE.exec(s);
  if (!m) {
    // Unrecognised — return raw string as quality, no root
    return { root: null, quality: s, bass: null };
  }

  const rawRoot    = m[1];
  const rawQuality = (m[2] || '').toLowerCase();
  const rawBass    = m[3] || null;

  const root = normalisePitch(rawRoot);
  const bass = rawBass && /^[A-G]/i.test(rawBass) ? normalisePitch(rawBass) : rawBass;

  // Normalise quality token to canonical form
  const QUALITY_MAP = {
    'maj7':    'maj7',
    'maj':     'maj',
    'min7':    'min7',
    'minmaj7': 'minmaj7',
    'm7b5':    'hdim7',
    'hdim7':   'hdim7',
    'dim7':    'dim7',
    'dim':     'dim',
    'aug':     'aug',
    'sus4':    'sus4',
    'sus2':    'sus2',
    'm7':      'min7',
    'min':     'min',
    'm':       'min',
    '7':       'dom7',
    '':        'maj',  // bare root = major
  };
  const quality = QUALITY_MAP[rawQuality] || rawQuality || 'maj';

  return { root, quality, bass };
}

// ─── CrispASRAdapter ──────────────────────────────────────────────────────────

class CrispASRAdapter {
  /**
   * @param {object} opts
   * @param {string} opts.enginePath     — absolute path to crispasr.exe
   * @param {string} opts.modelCacheRoot — directory containing model files
   * @param {string} opts.gpuIndex       — Vulkan physical device index (e.g. "1")
   * @param {string} opts.gpuName        — human-readable GPU name for provenance
   * @param {string} opts.engineVersion  — runtime version string from engine-version.json
   */
  constructor(opts) {
    this.enginePath      = opts.enginePath;
    this.modelCacheRoot  = opts.modelCacheRoot;
    this.gpuIndex        = String(opts.gpuIndex || '0');
    this.gpuName         = opts.gpuName || 'Unknown GPU';
    this.engineVersion   = opts.engineVersion || 'unknown';
    this.backendId       = 'crispasr-vulkan';
  }

  /** Returns adapter provenance metadata for embedding in AnalysisResult. */
  getProvenance(modelList) {
    return {
      backend:        this.backendId,
      backendVersion: this.engineVersion,
      gpuName:        this.gpuName,
      precision:      'fp16',
      fallbackReason: null,
    };
  }

  /**
   * Run a CrispASR command and return stdout as a string.
   * Throws with a descriptive message on non-zero exit.
   *
   * @param {string[]} args        — argv passed after the binary
   * @param {AbortSignal} [signal] — optional cancellation signal
   * @returns {Promise<string>}
   */
  _run(args, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        return reject(new Error('Job cancelled before subprocess start'));
      }

      const threads = args.includes('-t') || args.includes('--threads') ? [] : ['-t', '8'];
      const flash   = args.includes('-fa') || args.includes('--flash-attn') ? [] : ['-fa'];
      const fullArgs = [...threads, ...flash, ...args];

      const env = Object.assign({}, process.env, {
        GGML_VK_VISIBLE_DEVICES: this.gpuIndex,
        CUDA_VISIBLE_DEVICES: '0',
      });

      const child = spawn(this.enginePath, fullArgs, {
        windowsHide: true,
        cwd: path.dirname(this.enginePath),
        env,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timeout = setTimeout(() => {
        killed = true;
        child.kill();
        reject(new Error('CrispASR timed out after 15 minutes'));
      }, 15 * 60 * 1000);

      // Support cancellation via AbortSignal
      const onAbort = () => {
        killed = true;
        clearTimeout(timeout);
        child.kill();
        reject(new Error('Job cancelled'));
      };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });

      child.on('error', err => {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(new Error('Cannot start CrispASR: ' + err.message));
      });

      child.on('close', code => {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (killed) return; // already rejected via abort/timeout
        if (code !== 0) {
          const msg = (stderr || stdout || 'CrispASR exited with code ' + code).trim().slice(-800);
          reject(new Error(msg));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Run chord recognition on an audio file.
   * @param {string}      filePath  — path to audio file (mp3/wav/flac/…)
   * @param {string}      modelFile — basename of the chord model (e.g. "btc-chords-large-f16.gguf")
   * @param {AbortSignal} [signal]
   * @returns {Promise<ChordEvent[]>}
   */
  async runChords(filePath, modelFile, signal) {
    const modelPath = path.join(this.modelCacheRoot, modelFile);
    const output = await this._run(['--chords', '-m', modelPath, '-f', filePath], signal);
    return this._parseChordTable(output);
  }

  /**
   * Run beat + downbeat tracking on an audio file.
   * @param {string}      filePath
   * @param {string}      modelFile — basename of the beat model
   * @param {AbortSignal} [signal]
   * @returns {Promise<Beat[]>}
   */
  async runBeats(filePath, modelFile, signal) {
    const modelPath = path.join(this.modelCacheRoot, modelFile);
    const output = await this._run(['--beats', '-m', modelPath, '-f', filePath], signal);
    return this._parseBeatTable(output);
  }

  /**
   * Run stem separation into an output directory.
   * @param {string}      filePath
   * @param {string}      modelFile — separation model basename
   * @param {string}      outputDir — directory to write separated stems into
   * @param {string}      stems     — comma-separated stem names (e.g. "drums,bass,other,vocals")
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  async runSeparate(filePath, modelFile, outputDir, stems, signal) {
    const modelPath = path.join(this.modelCacheRoot, modelFile);
    await this._run([
      '--separate', '-m', modelPath,
      '--stems', stems,
      '--sep-output-dir', outputDir,
      '-f', filePath,
    ], signal);
  }

  /**
   * Run ASR transcription on an audio file.
   * Currently returns an empty result because Whisper path is bypassed.
   * @param {string} filePath
   * @param {string} modelFile
   * @param {string} lang
   * @param {AbortSignal} [signal]
   * @returns {Promise<LyricsResult>}
   */
  async runTranscribe(filePath, modelFile, lang, signal) {
    // TODO: Re-enable when WhisperX alignment pipeline is ready (Phase 4)
    return { language: 'auto', segments: [] };
  }

  // ── Private parsers ─────────────────────────────────────────────────────────

  /**
   * Parse CrispASR chord table output into ChordEvent[].
   * Each line: "<start> <end> <chord>"
   * @returns {ChordEvent[]}
   */
  _parseChordTable(output) {
    const chords = [];
    String(output).replace(/\r/g, '').split('\n').forEach(line => {
      const m = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\S+)/.exec(line);
      if (!m) return;
      const label    = m[3];
      const parsed   = parseChordLabel(label);
      chords.push({
        start:      Number(m[1]),
        end:        Number(m[2]),
        chord:      label,
        root:       parsed.root,
        quality:    parsed.quality,
        bass:       parsed.bass,
        confidence: 0,
      });
    });
    if (!chords.length) throw new Error('CrispASR returned an unreadable chord table');
    return chords;
  }

  /**
   * Parse CrispASR beat table output into Beat[].
   * Each line: "<time> downbeat|beat"
   * @returns {Beat[]}
   */
  _parseBeatTable(output) {
    const beats = [];
    String(output).replace(/\r/g, '').split('\n').forEach(line => {
      const m = /^\s*(\d+(?:\.\d+)?)\s+(downbeat|beat)\b/i.exec(line);
      if (!m) return;
      beats.push({
        time:      Number(m[1]),
        type:      m[2].toLowerCase(),
        downbeat:  m[2].toLowerCase() === 'downbeat',
      });
    });
    if (!beats.length) throw new Error('CrispASR returned an unreadable beat table');
    return beats;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create the currently active adapter.
 * Returns a CrispASRAdapter when the engine binary exists;
 * throws if no backend is available.
 *
 * @param {object} config
 * @returns {CrispASRAdapter}
 */
function createAdapter(config) {
  const { enginePath } = config;
  if (enginePath && fs.existsSync(enginePath)) {
    return new CrispASRAdapter(config);
  }
  throw new Error('No analysis backend available — install CrispASR engine first');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseChordLabel,
  CrispASRAdapter,
  createAdapter,
};
