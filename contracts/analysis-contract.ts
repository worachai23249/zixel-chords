/**
 * contracts/analysis-contract.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Data Contract for Zixel Chords — Ultimate Local AI Music Workstation
 *
 * This contract is the shared source of truth across:
 * - Node.js HTTP compatibility server (server.js)
 * - Native Tauri v2 Rust backend (src-tauri)
 * - Svelte 5 frontend client
 *
 * Rules:
 * - Schema versioning is mandatory (`schemaVersion: 1`).
 * - All timestamps and durations are in fractional seconds (`number`).
 * - Chord events must provide structural decomposition (`root`, `quality`, `bass`).
 * - Models and runtime provenance must be recorded for every analysis.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AnalysisFeatures {
  stems: boolean;
  lyrics: boolean;
  vocalPitch: boolean;
  chordVoicing: boolean;
  rmvpePitch?: boolean;
  whisperXAlignment?: boolean;
  melBandRoFormer?: boolean;
  chordTransformerVoicing?: boolean;
}

export interface AnalysisRequest {
  audioPath?: string;
  fileBuffer?: ArrayBuffer | Uint8Array;
  fileName?: string;
  mode: 'fast' | 'studio';
  language: 'auto' | 'th' | 'en' | 'ja' | 'ko' | 'zh';
  meter: 'auto' | 2 | 3 | 4 | 6;
  features: AnalysisFeatures;
}

export type AnalysisStage =
  | 'upload'
  | 'prepare'
  | 'decode'
  | 'separate'
  | 'beats'
  | 'chords'
  | 'lyrics'
  | 'pitch'
  | 'ensemble'
  | 'saving'
  | 'done'
  | 'cancelled'
  | 'error';

export interface AnalysisProgress {
  jobId: string;
  stage: AnalysisStage;
  percent: number; // 0 to 100
  message: string;
  detail?: string;
  etaSeconds?: number;
}

export interface Beat {
  index?: number;
  time: number; // Seconds
  type: 'downbeat' | 'beat';
  downbeat: boolean;
  chord?: string;
  aiChord?: string;
  confidence?: number;
  voicingNotes?: string[];
  midiPitches?: number[];
}

export interface ChordEvent {
  start: number; // Seconds
  end: number;   // Seconds
  chord: string; // Full chord label, e.g. "C#m7/E", "N.C."
  root: string | null; // "C#", "G", or null for N.C.
  quality: string; // "maj", "min", "dom7", "maj7", "min7", "sus4", "dim", "N.C."
  bass: string | null; // "E", "D", or null
  confidence: number; // 0.0 - 1.0
  voicingNotes?: string[]; // Polyphonic voicing note names, e.g. ["C4", "E4", "G4"]
  midiPitches?: number[];  // Polyphonic MIDI numbers, e.g. [60, 64, 67]
  bassMidi?: number | null; // e.g. 36 (C2)
}

export interface SyllableSegment {
  text: string;
  start: number;
  end: number;
  isWord?: boolean;
}

export interface WordSegment {
  start: number;
  end: number;
  word: string;
  confidence?: number;
  syllables?: SyllableSegment[];
}

export interface LyricSegment {
  start: number;
  end: number;
  text: string;
  words?: WordSegment[];
  syllables?: SyllableSegment[];
}

export interface PitchPoint {
  time: number; // Seconds
  frequencyHz: number; // 0 for unvoiced
  f0Hz?: number; // Fundamental frequency Hz from RMVPE / Crepe
  midiNote: number;
  confidence: number;
  vuv?: boolean; // Voiced / Unvoiced flag
}

export interface StemManifest {
  name: 'vocals' | 'drums' | 'bass' | 'guitar' | 'solo_guitar' | 'piano' | 'other' | string;
  filePath: string;
  url?: string;
  present: boolean;
  rmsDb?: number;
}

export interface ModelProvenance {
  name: string;
  file: string;
  sha256: string | null;
  version?: string;
}

export interface RuntimeProvenance {
  runtime: string; // "CrispASR", "TensorRT", "NativeRustDSP"
  runtimeVersion: string;
  backend: 'tensorrt' | 'vulkan' | 'onnx' | 'cpu' | string;
  precision: 'fp16' | 'int8' | 'fp32';
  gpuName: string | null;
  models: ModelProvenance[];
  analysisMode: 'fast' | 'studio' | string;
  createdAt: string; // ISO 8601
  fallbackReason: string | null;
  _legacy?: boolean;
}

export interface AnalysisResult {
  schemaVersion: 1;
  id?: string;
  source?: {
    fileName: string;
    durationSeconds: number;
    sampleRate: number;
    channels: number;
  };
  title: string;
  author: string;
  duration: number;
  timing: {
    bpm?: number;
    meter?: string | number;
    beats: Beat[];
    downbeats?: number[];
  };
  harmony: {
    key?: string;
    chords: ChordEvent[];
    confidence?: number;
  };
  lyrics: {
    language: string;
    segments: LyricSegment[];
  };
  vocalPitch?: {
    points: PitchPoint[];
    confidence: number[];
  };
  stems?: StemManifest[];
  hasStems?: boolean;
  absentStems?: string[];
  stemPresence?: Record<string, boolean>;
  provenance: RuntimeProvenance;
  // Backward compatibility fields for legacy UI consumers
  key?: string;
  bpm?: number | string;
  meter?: number | string;
  beats?: Beat[];
  chords?: ChordEvent[];
  audioUrl?: string;
}
