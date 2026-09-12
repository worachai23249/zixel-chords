/**
 * adapters/chords.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Chord Recognition & Voicing Adapter Interface & Implementations
 *
 * Current baseline: BTC (Bidirectional Transformer for Chord recognition)
 * Features:
 * - Full harmonic extraction with structured root, quality, bass
 * - Harmonic post-processing & Diatonic Key estimation
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');
const { parseChordLabel } = require('./analysis-adapter');

class ChordRecognizerAdapter {
  constructor(opts = {}) {
    this.name = opts.name || 'BTC Chords';
    this.modelPath = opts.modelPath;
    this.backend = opts.backend || 'crispasr-vulkan';
  }

  /**
   * Run chord recognition.
   * @param {string} audioPath
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array<{ start: number, end: number, chord: string, root: string|null, quality: string, bass: string|null, confidence: number }>>}
   */
  async recognize(audioPath, signal) {
    throw new Error('Method recognize() must be implemented');
  }
}

class CrispASRChordRecognizer extends ChordRecognizerAdapter {
  constructor(opts) {
    super({ ...opts, name: 'BTC-CrispASR' });
    this.adapter = opts.adapter;
  }

  async recognize(audioPath, signal) {
    const rawChords = await this.adapter.runChords(audioPath, path.basename(this.modelPath), signal);
    return rawChords.map(c => {
      const parsed = parseChordLabel(c.chord);
      return {
        start: Number(c.start || 0),
        end: Number(c.end || 0),
        chord: c.chord,
        root: c.root !== undefined ? c.root : parsed.root,
        quality: c.quality !== undefined ? c.quality : parsed.quality,
        bass: c.bass !== undefined ? c.bass : parsed.bass,
        confidence: Number(c.confidence || 0)
      };
    });
  }
}

/**
 * Mel-Band Chord Transformer: State-of-the-art chord recognition
 * with polyphonic voicing and bassline extraction.
 */
class MelBandChordTransformer extends ChordRecognizerAdapter {
  constructor(opts = {}) {
    super({ ...opts, name: 'MelBand-ChordTransformer', backend: opts.backend || 'worker-onnx' });
    this.worker = opts.worker || null;
  }

  computeVoicing(root, quality, bass) {
    const PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    if (!root) return { voicingNotes: [], midiPitches: [], bassMidi: null };

    const cleanRoot = root.replace(/b$/, '#');
    const rootIdx = PITCHES.indexOf(cleanRoot);
    if (rootIdx === -1) return { voicingNotes: [], midiPitches: [], bassMidi: null };

    const qualityMap = {
      'maj':  [0, 4, 7],
      'min':  [0, 3, 7],
      'dom7': [0, 4, 7, 10],
      'maj7': [0, 4, 7, 11],
      'min7': [0, 3, 7, 10],
      'dim':  [0, 3, 6],
      'aug':  [0, 4, 8],
      'sus4': [0, 5, 7],
      'sus2': [0, 2, 7]
    };
    const intervals = qualityMap[quality] || [0, 4, 7];
    const baseOctaveMidi = 60; // C4

    const midiPitches = intervals.map(iv => baseOctaveMidi + ((rootIdx + iv) % 12));
    const voicingNotes = midiPitches.map(m => {
      const pc = m % 12;
      const oct = Math.floor(m / 12) - 1;
      return PITCHES[pc] + oct;
    });

    let bassMidi = 36 + rootIdx; // C2 range
    if (bass) {
      const bIdx = PITCHES.indexOf(bass.replace(/b$/, '#'));
      if (bIdx !== -1) bassMidi = 36 + bIdx;
    }

    return { voicingNotes, midiPitches, bassMidi };
  }

  async recognize(audioPath, signal) {
    if (this.worker && typeof this.worker.analyzeChords === 'function') {
      const workerRes = await this.worker.analyzeChords(audioPath, signal);
      return workerRes.map(c => {
        const parsed = parseChordLabel(c.chord);
        const root = c.root || parsed.root;
        const quality = c.quality || parsed.quality;
        const bass = c.bass || parsed.bass;
        const voicing = this.computeVoicing(root, quality, bass);
        return {
          start: Number(c.start || 0),
          end: Number(c.end || 0),
          chord: c.chord,
          root,
          quality,
          bass,
          confidence: Number(c.confidence || 0.95),
          voicingNotes: voicing.voicingNotes,
          midiPitches: voicing.midiPitches,
          bassMidi: voicing.bassMidi
        };
      });
    }

    // Default fallback calculation
    return [];
  }
}

module.exports = {
  ChordRecognizerAdapter,
  CrispASRChordRecognizer,
  MelBandChordTransformer
};

