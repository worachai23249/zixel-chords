/**
 * ui/src/lib/stores/workspace.svelte.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Modern Svelte 5 Reactive Store using Runes ($state, $derived)
 *
 * Centralizes:
 * - Active song analysis state (schemaVersion: 1)
 * - Audio playback clock, time, duration, and playing status
 * - Transpose and capo transposition
 * - Stem mixer levels, mute, and solo
 * - Real-time progress and cancellation token
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AnalysisResult, AnalysisProgress, ChordEvent, Beat } from '../../../../contracts/analysis-contract';

export class WorkspaceStore {
  // Reactive state using Svelte 5 $state
  song = $state<AnalysisResult | null>(null);
  currentTime = $state<number>(0);
  duration = $state<number>(0);
  isPlaying = $state<boolean>(false);
  transpose = $state<number>(0);
  activeBeatIndex = $state<number | null>(null);

  // Stems mixer state
  stemsEnabled = $state<boolean>(false);
  stemVolumes = $state<Record<string, number>>({
    vocals: 1.0,
    drums: 1.0,
    bass: 1.0,
    guitar: 1.0,
    other: 1.0,
  });
  stemMuted = $state<Record<string, boolean>>({
    vocals: false,
    drums: false,
    bass: false,
    guitar: false,
    other: false,
  });
  stemSolo = $state<string | null>(null);

  // Analysis job tracking
  currentJobId = $state<string | null>(null);
  progress = $state<AnalysisProgress | null>(null);
  isAnalyzing = $state<boolean>(false);

  // Derived state using Svelte 5 $derived
  activeChord = $derived.by(() => {
    if (!this.song || !this.song.chords || this.song.chords.length === 0) return null;
    const t = this.currentTime;
    return this.song.chords.find((c: ChordEvent) => c.start <= t && c.end > t) || null;
  });

  bpm = $derived(this.song?.bpm || this.song?.timing?.bpm || '—');
  key = $derived(this.song?.key || this.song?.harmony?.key || 'รอตรวจ');

  formattedCurrentTime = $derived.by(() => {
    const s = Math.floor(this.currentTime);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  });

  formattedDuration = $derived.by(() => {
    const s = Math.floor(this.duration);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  });

  // Actions
  setSong(newSong: AnalysisResult) {
    this.song = newSong;
    this.duration = newSong.duration || 0;
    this.currentTime = 0;
    this.transpose = 0;
    this.stemsEnabled = Boolean(newSong.hasStems);
  }

  setTranspose(delta: number) {
    this.transpose = Math.max(-11, Math.min(11, delta));
  }

  setStemVolume(stem: string, vol: number) {
    this.stemVolumes[stem] = Math.max(0, Math.min(1, vol));
  }

  toggleMute(stem: string) {
    this.stemMuted[stem] = !this.stemMuted[stem];
  }

  toggleSolo(stem: string) {
    this.stemSolo = this.stemSolo === stem ? null : stem;
  }

  setProgress(p: AnalysisProgress | null) {
    this.progress = p;
    this.isAnalyzing = p !== null && p.percent < 100 && p.stage !== 'error' && p.stage !== 'cancelled';
  }
}

export const workspace = new WorkspaceStore();
