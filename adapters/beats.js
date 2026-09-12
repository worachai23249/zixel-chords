/**
 * adapters/beats.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Beat Tracker Adapter Interface & Implementations
 *
 * Current candidate: Beat This! rhythm model
 * Responsibilities:
 * - Detect beats and downbeats from audio
 * - Estimate musical meter (4/4, 3/4, 6/8, etc.) and calculate BPM
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');

class BeatTrackerAdapter {
  constructor(opts = {}) {
    this.name = opts.name || 'Beat This!';
    this.modelPath = opts.modelPath;
    this.backend = opts.backend || 'crispasr-vulkan';
  }

  /**
   * Run beat detection on an audio track.
   * @param {string} audioPath
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array<{ time: number, type: 'downbeat' | 'beat', downbeat: boolean }>>}
   */
  async trackBeats(audioPath, signal) {
    throw new Error('Method trackBeats() must be implemented');
  }
}

class CrispASRBeatTracker extends BeatTrackerAdapter {
  constructor(opts) {
    super({ ...opts, name: 'Beat This!-CrispASR' });
    this.adapter = opts.adapter;
  }

  async trackBeats(audioPath, signal) {
    return await this.adapter.runBeats(audioPath, path.basename(this.modelPath), signal);
  }
}

module.exports = {
  BeatTrackerAdapter,
  CrispASRBeatTracker
};
