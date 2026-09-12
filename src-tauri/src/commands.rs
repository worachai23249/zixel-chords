//! src-tauri/src/commands.rs
//! Tauri IPC command handlers registered with the webview

use std::fs;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;
use crate::app_state::AppState;
use crate::contract::{AnalysisProgress, AnalysisRequest, AnalysisResult};

#[tauri::command]
pub async fn get_system_health(state: State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let ready = state.engine_path.exists();
    Ok(serde_json::json!({
        "ready": ready,
        "engine": if ready { "CrispASR" } else { "none" },
        "engineVersion": "v0.8.32",
        "gpu": state.gpu_name,
        "primaryGpu": state.rtx_gpu_index,
        "maxPerformance": true,
        "schemaVersion": 1
    }))
}

#[tauri::command]
pub async fn get_analysis_progress(
    job_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<AnalysisProgress, String> {
    if let Some(p) = state.job_queue.get_progress(&job_id).await {
        Ok(p)
    } else {
        Ok(AnalysisProgress {
            job_id,
            stage: "waiting".to_string(),
            percent: 0.0,
            message: "Queued".to_string(),
            detail: None,
            eta_seconds: None,
        })
    }
}

#[tauri::command]
pub async fn cancel_analysis(
    job_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<bool, String> {
    Ok(state.job_queue.cancel_job(&job_id).await)
}

#[tauri::command]
pub async fn get_library_songs(state: State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    if !state.library_root.exists() {
        return Ok(serde_json::json!([]));
    }

    let mut songs = Vec::new();
    if let Ok(entries) = fs::read_dir(&state.library_root) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let song_json_path = entry.path().join("song.json");
                if song_json_path.exists() {
                    if let Ok(content) = fs::read_to_string(song_json_path) {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                            songs.push(parsed);
                        }
                    }
                }
            }
        }
    }
    Ok(serde_json::json!(songs))
}

#[tauri::command]
pub async fn get_song(id: String, state: State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let song_path = state.library_root.join(&id).join("song.json");
    if !song_path.exists() {
        return Err("Song not found".to_string());
    }
    let content = fs::read_to_string(song_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_song(id: String, state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    let dir = state.library_root.join(&id);
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn analyze_audio(
    request: AnalysisRequest,
    state: State<'_, Arc<AppState>>,
) -> Result<AnalysisResult, String> {
    let job_id = Uuid::new_v4().to_string();
    let _token = state.job_queue.create_job(job_id.clone()).await;

    // Report progress stages
    state.job_queue.update_progress(&job_id, "decode", 15.0, "Decoding canonical PCM", None).await;

    let audio_path = request.audio_path.ok_or_else(|| "audioPath is required".to_string())?;
    let _decoded = crate::dsp::decoder::decode_audio_file(&audio_path)?;

    state.job_queue.update_progress(&job_id, "chords", 60.0, "Analyzing harmonic chords & beats", None).await;

    // Return dummy populated structure or delegate to adapter
    Err("Analysis pipeline dispatch ready".to_string())
}
