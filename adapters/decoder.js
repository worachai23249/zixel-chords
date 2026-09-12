/**
 * adapters/decoder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Audio Decoder Adapter
 *
 * Responsibilities:
 * - Read metadata (duration, sample rate, channels) from audio files
 * - Decode multi-format audio (MP3, WAV, FLAC, OGG, M4A) into canonical PCM
 * - In Node mode: extracts basic PCM header / duration
 * - In Rust mode: Symphonia provides zero-copy pure-Rust decoding
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');

class DecoderAdapter {
  /**
   * Probe an audio file for metadata without full decoding.
   * @param {string} filePath
   * @returns {Promise<{ durationSeconds: number, sampleRate: number, channels: number }>}
   */
  async probe(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // If WAV file, parse header for exact sample rate and channels
    if (ext === '.wav' && stat.size >= 44) {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(44);
      fs.readSync(fd, buf, 0, 44, 0);
      fs.closeSync(fd);

      if (buf.toString('utf8', 0, 4) === 'RIFF') {
        const channels = buf.readUInt16LE(22);
        const sampleRate = buf.readUInt32LE(24);
        const byteRate = buf.readUInt32LE(28);
        const dataLen = Math.max(0, stat.size - 44);
        const duration = byteRate > 0 ? dataLen / byteRate : 0;
        return {
          durationSeconds: Math.round(duration * 100) / 100,
          sampleRate: sampleRate || 44100,
          channels: channels || 2
        };
      }
    }

    // Rough duration estimation for compressed formats (128-192 kbps typical)
    const estSeconds = Math.max(1, Math.round(stat.size / (160 * 1024 / 8)));
    return {
      durationSeconds: estSeconds,
      sampleRate: 44100,
      channels: 2
    };
  }
}

module.exports = { DecoderAdapter };
