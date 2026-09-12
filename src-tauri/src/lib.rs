//! src-tauri/src/lib.rs
//! Main entry point for the Tauri application library

pub mod app_state;
pub mod contract;
pub mod job_queue;
pub mod dsp;
pub mod adapters;
pub mod commands;

use std::sync::Arc;
use app_state::AppState;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let state = Arc::new(AppState::new(current_dir));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_system_health,
            get_analysis_progress,
            cancel_analysis,
            get_library_songs,
            get_song,
            delete_song,
            analyze_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
