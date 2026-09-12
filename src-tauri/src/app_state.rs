//! src-tauri/src/app_state.rs
//! Shared application state for Tauri runtime

use std::path::PathBuf;
use std::sync::Arc;
use crate::job_queue::NativeJobQueue;

pub struct AppState {
    pub engine_path: PathBuf,
    pub model_cache_root: PathBuf,
    pub library_root: PathBuf,
    pub job_queue: NativeJobQueue,
    pub gpu_name: String,
    pub rtx_gpu_index: String,
}

impl AppState {
    pub fn new(app_dir: PathBuf) -> Self {
        let engine_dir = app_dir.join(".engine");
        Self {
            engine_path: engine_dir.join("crispasr").join("crispasr.exe"),
            model_cache_root: engine_dir.join("models"),
            library_root: engine_dir.join("library"),
            job_queue: NativeJobQueue::new(),
            gpu_name: "NVIDIA GeForce RTX 3070 Ti Laptop GPU".to_string(),
            rtx_gpu_index: "1".to_string(),
        }
    }
}
