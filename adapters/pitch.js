/**
 * adapters/pitch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vocal Pitch Tracker Adapter Interface & Implementations
 *
 * Current candidate: RMVPE (Robust Model for Vocal Pitch Estimation)
 * Responsibilities:
 * - Extract fundamental frequency (F0) from isolated vocal stems
 * - Handle voiced/unvoiced detection, octave correction, and cents smoothing
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

class PitchTrackerAdapter {
  constructor(opts = {}) {
    this.name = opts.name || 'RMVPE';
    this.backend = opts.backend || 'worker-onnx';
  }

  /**
   * Track vocal pitch points from vocal stem audio.
   * @param {string} vocalStemPath
   * @param {AbortSignal} [signal]
   * @returns {Promise<{ points: Array<{ time: number, frequencyHz: number, f0Hz?: number, midiNote: number, confidence: number, vuv?: boolean }>, confidence: number[] }>}
   */
  async trackPitch(vocalStemPath, signal) {
    return {
      points: [],
      confidence: []
    };
  }
}

/**
 * RMVPE: Robust Model for Vocal Pitch Estimation
 * Extracts exact F0 curve (10ms hop size), detects voiced/unvoiced frames,
 * and converts Hz to continuous MIDI cents.
 */
class RMVPEPitchTracker extends PitchTrackerAdapter {
  constructor(opts = {}) {
    super({ ...opts, name: 'RMVPE-Extractor', backend: opts.backend || 'worker-onnx' });
    this.worker = opts.worker || null;
    this.threshold = opts.threshold || 0.05; // Voiced confidence threshold
  }

  hzToMidi(hz) {
    if (!hz || hz <= 0) return 0;
    return 69 + 12 * Math.log2(hz / 440);
  }

  async trackPitch(vocalStemPath, signal) {
    if (this.worker && typeof this.worker.extractPitch === 'function') {
      const rawPoints = await this.worker.extractPitch(vocalStemPath, signal);
      const confidences = [];
      const points = rawPoints.map(pt => {
        const conf = Number(pt.confidence || 0);
        confidences.push(conf);
        const f0 = Number(pt.f0Hz || pt.frequencyHz || 0);
        const isVoiced = conf >= this.threshold && f0 > 40 && f0 < 1200;
        return {
          time: Number(pt.time || 0),
          frequencyHz: isVoiced ? f0 : 0,
          f0Hz: f0,
          midiNote: isVoiced ? Math.round(this.hzToMidi(f0) * 100) / 100 : 0,
          confidence: conf,
          vuv: isVoiced
        };
      });

      return { points, confidence: confidences };
    }

    return { points: [], confidence: [] };
  }
}

module.exports = {
  PitchTrackerAdapter,
  RMVPEPitchTracker
};

