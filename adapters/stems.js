/**
 * adapters/stems.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stem Separation Adapter Interface & Implementations
 *
 * Backends:
 * - CrispASR / HTDemucs (Current Baseline)
 * - Mel-Band / BS-RoFormer (Bring-up candidate)
 * - TensorRT Engine (Target for supported systems)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');

class StemSeparatorAdapter {
  constructor(opts = {}) {
    this.name = opts.name || 'HTDemucs';
    this.enginePath = opts.enginePath;
    this.modelPath = opts.modelPath;
    this.backend = opts.backend || 'crispasr-vulkan';
  }

  /**
   * Run stem separation on an audio track.
   * @param {string} audioPath
   * @param {string} outputDir
   * @param {string[]} stemsToExtract
   * @param {AbortSignal} [signal]
   * @param {Function} [onProgress]
   * @returns {Promise<{ stems: Record<string, string>, absentStems: string[] }>}
   */
  async separate(audioPath, outputDir, stemsToExtract = ['drums', 'bass', 'other', 'vocals'], signal, onProgress) {
    throw new Error('Method separate() must be implemented by subclass');
  }
}

class CrispASRStemSeparator extends StemSeparatorAdapter {
  constructor(opts) {
    super({ ...opts, name: 'HTDemucs-CrispASR' });
    this.adapter = opts.adapter; // instance of CrispASRAdapter
  }

  async separate(audioPath, outputDir, stemsToExtract, signal, onProgress) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stemsArg = stemsToExtract.join(',');
    await this.adapter.runSeparate(audioPath, path.basename(this.modelPath), outputDir, stemsArg, signal);

    // Locate generated files
    const stems = {};
    for (const stem of stemsToExtract) {
      const found = this._findStemFile(outputDir, stem);
      if (found) {
        stems[stem] = found;
      }
    }

    return {
      stems,
      absentStems: stemsToExtract.filter(s => !stems[s])
    };
  }

  _findStemFile(dir, stem) {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = this._findStemFile(full, stem);
        if (nested) return nested;
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(`_${stem}.wav`)) {
        return full;
      }
    }
    return null;
  }
}

module.exports = {
  StemSeparatorAdapter,
  CrispASRStemSeparator
};
