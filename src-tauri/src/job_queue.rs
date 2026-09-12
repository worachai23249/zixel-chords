//! src-tauri/src/job_queue.rs
//! Native Rust Job Queue with tokio CancellationToken for immediate subprocess termination

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;
use crate::contract::AnalysisProgress;

#[derive(Clone)]
pub struct Job {
    pub id: String,
    pub token: CancellationToken,
    pub progress: AnalysisProgress,
}

#[derive(Clone)]
pub struct NativeJobQueue {
    jobs: Arc<RwLock<HashMap<String, Job>>>,
}

impl NativeJobQueue {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_job(&self, id: String) -> CancellationToken {
        let token = CancellationToken::new();
        let job = Job {
            id: id.clone(),
            token: token.clone(),
            progress: AnalysisProgress {
                job_id: id.clone(),
                stage: "upload".to_string(),
                percent: 0.0,
                message: "Initializing analysis...".to_string(),
                detail: None,
                eta_seconds: None,
            },
        };
        let mut map = self.jobs.write().await;
        map.insert(id, job);
        token
    }

    pub async fn update_progress(&self, id: &str, stage: &str, percent: f64, message: &str, detail: Option<String>) {
        let mut map = self.jobs.write().await;
        if let Some(job) = map.get_mut(id) {
            job.progress.stage = stage.to_string();
            job.progress.percent = percent.clamp(0.0, 100.0);
            job.progress.message = message.to_string();
            job.progress.detail = detail;
        }
    }

    pub async fn get_progress(&self, id: &str) -> Option<AnalysisProgress> {
        let map = self.jobs.read().await;
        map.get(id).map(|j| j.progress.clone())
    }

    pub async fn cancel_job(&self, id: &str) -> bool {
        let mut map = self.jobs.write().await;
        if let Some(job) = map.get_mut(id) {
            job.token.cancel();
            job.progress.stage = "cancelled".to_string();
            job.progress.message = "Job cancelled by user".to_string();
            true
        } else {
            false
        }
    }
}
