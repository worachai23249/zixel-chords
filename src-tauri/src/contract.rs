//! src-tauri/src/contract.rs
//! Canonical data contract types matching TS `contracts/analysis-contract.ts`

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisFeatures {
    pub stems: bool,
    pub lyrics: bool,
    #[serde(rename = "vocalPitch")]
    pub vocal_pitch: bool,
    #[serde(rename = "chordVoicing")]
    pub chord_voicing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    #[serde(rename = "audioPath")]
    pub audio_path: Option<String>,
    pub mode: String, // "fast" | "studio"
    pub language: String, // "auto" | "th" | ...
    pub meter: serde_json::Value, // "auto" | 2 | 3 | 4 | 6
    pub features: Option<AnalysisFeatures>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisProgress {
    #[serde(rename = "jobId")]
    pub job_id: String,
    pub stage: String,
    pub percent: f64,
    pub message: String,
    pub detail: Option<String>,
    #[serde(rename = "etaSeconds")]
    pub eta_seconds: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Beat {
    pub index: Option<usize>,
    pub time: f64,
    #[serde(rename = "type")]
    pub beat_type: String,
    pub downbeat: bool,
    pub chord: Option<String>,
    #[serde(rename = "aiChord")]
    pub ai_chord: Option<String>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChordEvent {
    pub start: f64,
    pub end: f64,
    pub chord: String,
    pub root: Option<String>,
    pub quality: String,
    pub bass: Option<String>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordSegment {
    pub start: f64,
    pub end: f64,
    pub word: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
    pub words: Option<Vec<WordSegment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvenance {
    pub name: String,
    pub file: String,
    pub sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeProvenance {
    pub runtime: String,
    #[serde(rename = "runtimeVersion")]
    pub runtime_version: Option<String>,
    pub backend: String,
    pub precision: String,
    #[serde(rename = "gpuName")]
    pub gpu_name: Option<String>,
    pub models: Vec<ModelProvenance>,
    #[serde(rename = "analysisMode")]
    pub analysis_mode: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "fallbackReason")]
    pub fallback_reason: Option<String>,
    #[serde(rename = "_legacy")]
    pub legacy: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: Option<String>,
    pub title: String,
    pub author: String,
    pub duration: f64,
    pub key: Option<String>,
    pub bpm: Option<serde_json::Value>,
    pub meter: Option<serde_json::Value>,
    pub chords: Vec<ChordEvent>,
    pub beats: Vec<Beat>,
    pub lyrics: Option<serde_json::Value>,
    #[serde(rename = "hasStems")]
    pub has_stems: Option<bool>,
    pub stems: Option<Vec<String>>,
    #[serde(rename = "absentStems")]
    pub absent_stems: Option<Vec<String>>,
    #[serde(rename = "stemPresence")]
    pub stem_presence: Option<HashMap<String, bool>>,
    pub provenance: RuntimeProvenance,
}
