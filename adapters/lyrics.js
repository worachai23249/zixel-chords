/**
 * adapters/lyrics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lyrics & Word Alignment Adapter Interface & Implementations
 *
 * Current baseline: Whisper Base / WhisperX bring-up interface
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');

class LyricsAlignerAdapter {
  constructor(opts = {}) {
    this.name = opts.name || 'Whisper';
    this.modelPath = opts.modelPath;
    this.backend = opts.backend || 'crispasr-vulkan';
  }

  /**
   * Transcribe and align lyrics with word-level timestamps.
   * @param {string} audioPath
   * @param {string} language 'auto' | 'th' | 'en' etc.
   * @param {AbortSignal} [signal]
   * @returns {Promise<{ language: string, segments: Array<{ start: number, end: number, text: string, words?: Array<{ start: number, end: number, word: string }> }> }>}
   */
  async align(audioPath, language = 'auto', signal) {
    throw new Error('Method align() must be implemented');
  }
}

class CrispASRLyricsAligner extends LyricsAlignerAdapter {
  constructor(opts) {
    super({ ...opts, name: 'Whisper-CrispASR' });
    this.adapter = opts.adapter;
  }

  async align(audioPath, language, signal) {
    if (!this.modelPath) return { language: 'auto', segments: [] };
    return await this.adapter.runTranscribe(audioPath, path.basename(this.modelPath), language, signal);
  }
}

module.exports = {
  LyricsAlignerAdapter,
  CrispASRLyricsAligner
};
