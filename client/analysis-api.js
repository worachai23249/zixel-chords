/**
 * client/analysis-api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Transport Client for Zixel Chords Studio Pro
 *
 * Implements Step 1 of Section 8 (Frontend Migration):
 * Wraps both local HTTP REST endpoints (/api/*) and native Tauri commands (invoke)
 * seamlessly behind a single typed interface.
 *
 * Capabilities:
 * - Detects execution environment (Browser Web vs Tauri v2 Desktop)
 * - File upload & multi-format support
 * - Real-time progress polling or event subscription
 * - Instant job cancellation
 * - Library loading, playback streaming & stem mixer control
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

class AnalysisApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.isNative = isTauri;
  }

  /**
   * Get system health and GPU status.
   */
  async getHealth() {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_system_health');
    }
    const res = await fetch(`${this.baseUrl}/api/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
    return await res.json();
  }

  /**
   * Analyze an audio file.
   * @param {File | Blob} audioFile
   * @param {object} options
   * @param {Function} [onProgress]
   * @returns {Promise<AnalysisResult>}
   */
  async analyze(audioFile, options = {}, onProgress = null) {
    const mode = options.mode || 'fast';
    const meter = options.meter || 'auto';
    const lang = options.language || 'th';
    const jobId = options.jobId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'job_' + Date.now());

    let progressTimer = null;
    if (typeof onProgress === 'function') {
      progressTimer = setInterval(async () => {
        try {
          const p = await this.getProgress(jobId);
          onProgress(p);
          if (p.percent >= 100 || p.stage === 'error' || p.stage === 'cancelled') {
            clearInterval(progressTimer);
          }
        } catch (_) {}
      }, 500);
    }

    try {
      if (this.isNative && window.__TAURI__?.core && options.audioPath) {
        return await window.__TAURI__.core.invoke('analyze_audio', {
          request: {
            audioPath: options.audioPath,
            mode,
            language: lang,
            meter,
            features: options.features || { stems: mode === 'studio', lyrics: true, vocalPitch: false, chordVoicing: true }
          }
        });
      }

      const formData = new FormData();
      formData.append('audio', audioFile, audioFile.name || 'track.mp3');

      const res = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'X-ChordTube-NonCommercial': 'true',
          'X-ChordTube-Analysis': mode === 'studio' ? 'accurate' : 'standard',
          'X-ChordTube-Meter': String(meter),
          'X-ChordTube-Lang': String(lang),
          'X-ChordTube-Job-Id': jobId
        },
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Analysis failed: HTTP ${res.status}`);
      }

      return await res.json();
    } finally {
      if (progressTimer) clearInterval(progressTimer);
    }
  }

  /**
   * Cancel an in-flight analysis job.
   * @param {string} jobId
   */
  async cancel(jobId) {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('cancel_analysis', { jobId });
    }
    const res = await fetch(`${this.baseUrl}/api/analyze/${encodeURIComponent(jobId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  }

  /**
   * Get progress for an active job.
   * @param {string} jobId
   */
  async getProgress(jobId) {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_analysis_progress', { jobId });
    }
    const res = await fetch(`${this.baseUrl}/api/progress?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    if (!res.ok) return { stage: 'waiting', percent: 0, message: '', detail: '' };
    return await res.json();
  }

  /**
   * List songs saved in local library.
   */
  async listLibrary() {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_library_songs');
    }
    const res = await fetch(`${this.baseUrl}/api/library`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot fetch library');
    return await res.json();
  }

  /**
   * Get full song data by ID.
   * @param {string} songId
   */
  async getSong(songId) {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_song', { id: songId });
    }
    const res = await fetch(`${this.baseUrl}/api/library/${encodeURIComponent(songId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Song not found in library');
    return await res.json();
  }

  /**
   * Delete a song from local library.
   * @param {string} songId
   */
  async deleteSong(songId) {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('delete_song', { id: songId });
    }
    const res = await fetch(`${this.baseUrl}/api/library/${encodeURIComponent(songId)}`, { method: 'DELETE' });
    return res.ok;
  }
}

// Universal export (works in Node.js, CommonJS, and Browser globals)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalysisApiClient };
} else if (typeof window !== 'undefined') {
  window.AnalysisApiClient = AnalysisApiClient;
}
