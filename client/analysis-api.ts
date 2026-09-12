/**
 * client/analysis-api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript definitions & typed transport client for Zixel Chords Studio Pro
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AnalysisRequest, AnalysisProgress, AnalysisResult } from '../contracts/analysis-contract';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

export class AnalysisApiClient {
  private baseUrl: string;
  public isNative: boolean;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.isNative = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
  }

  async getHealth(): Promise<{ ready: boolean; engine: string; gpu: string; schemaVersion: number; engineVersion: string }> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_system_health');
    }
    const res = await fetch(`${this.baseUrl}/api/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
    return await res.json();
  }

  async analyze(
    audioFile: File | Blob,
    options: Partial<AnalysisRequest> & { jobId?: string } = {},
    onProgress?: (p: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    const mode = options.mode || 'fast';
    const meter = options.meter || 'auto';
    const lang = options.language || 'th';
    const jobId = options.jobId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}`);

    let progressTimer: any = null;
    if (onProgress) {
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
        return await window.__TAURI__.core.invoke<AnalysisResult>('analyze_audio', {
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
      formData.append('audio', audioFile, (audioFile as File).name || 'track.mp3');

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

  async cancel(jobId: string): Promise<boolean> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke<boolean>('cancel_analysis', { jobId });
    }
    const res = await fetch(`${this.baseUrl}/api/analyze/${encodeURIComponent(jobId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  }

  async getProgress(jobId: string): Promise<AnalysisProgress> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke<AnalysisProgress>('get_analysis_progress', { jobId });
    }
    const res = await fetch(`${this.baseUrl}/api/progress?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    if (!res.ok) return { jobId, stage: 'waiting', percent: 0, message: '', detail: '' };
    return await res.json();
  }

  async listLibrary(): Promise<any[]> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_library_songs');
    }
    const res = await fetch(`${this.baseUrl}/api/library`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot fetch library');
    return await res.json();
  }

  async getSong(songId: string): Promise<AnalysisResult> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke('get_song', { id: songId });
    }
    const res = await fetch(`${this.baseUrl}/api/library/${encodeURIComponent(songId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Song not found in library');
    return await res.json();
  }

  async deleteSong(songId: string): Promise<boolean> {
    if (this.isNative && window.__TAURI__?.core) {
      return await window.__TAURI__.core.invoke<boolean>('delete_song', { id: songId });
    }
    const res = await fetch(`${this.baseUrl}/api/library/${encodeURIComponent(songId)}`, { method: 'DELETE' });
    return res.ok;
  }
}
