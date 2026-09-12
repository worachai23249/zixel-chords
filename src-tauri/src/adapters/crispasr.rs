//! src-tauri/src/adapters/crispasr.rs
//! Native Rust process executor for CrispASR CLI with GPU isolation and tokio cancellation

use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

pub struct CrispASRRunner {
    pub engine_path: PathBuf,
    pub gpu_index: String,
}

impl CrispASRRunner {
    pub fn new<P: AsRef<Path>>(engine_path: P, gpu_index: String) -> Self {
        Self {
            engine_path: engine_path.as_ref().to_path_buf(),
            gpu_index,
        }
    }

    pub async fn run(
        &self,
        args: &[&str],
        token: &CancellationToken,
    ) -> Result<String, String> {
        let mut cmd = Command::new(&self.engine_path);
        cmd.args(["-t", "8", "-fa"]);
        cmd.args(args);
        cmd.env("GGML_VK_VISIBLE_DEVICES", &self.gpu_index);
        cmd.env("CUDA_VISIBLE_DEVICES", "0");
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn engine: {}", e))?;

        tokio::select! {
            _ = token.cancelled() => {
                let _ = child.kill().await;
                Err("Analysis process cancelled by user".to_string())
            }
            res = child.wait_with_output() => {
                let output = res.map_err(|e| format!("Process execution failed: {}", e))?;
                if output.status.success() {
                    Ok(String::from_utf8_lossy(&output.stdout).to_string())
                } else {
                    let err = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Engine error: {}", err.trim()))
                }
            }
        }
    }
}
