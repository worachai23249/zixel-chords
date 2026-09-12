//! src-tauri/src/dsp/audio_io.rs
//! ─────────────────────────────────────────────────────────────────────────────
//! Low-Latency Native Audio I/O Manager
//!
//! Powered by `cpal` for high-performance audio playback and hardware device
//! selection (WASAPI Exclusive, ASIO, DirectSound on Windows).
//! ─────────────────────────────────────────────────────────────────────────────

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Stream, SupportedStreamConfig};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub is_default: bool,
    pub max_channels: u16,
    pub default_sample_rate: u32,
}

pub struct AudioEngine {
    host: Host,
    device: Option<Device>,
    stream: Option<Stream>,
    active_device_name: Arc<Mutex<String>>,
}

impl AudioEngine {
    pub fn new() -> Result<Self, String> {
        let host = cpal::default_host();
        let default_device = host.default_output_device();
        let active_name = default_device
            .as_ref()
            .and_then(|d| d.name().ok())
            .unwrap_or_else(|| "Default Device".to_string());

        Ok(Self {
            host,
            device: default_device,
            stream: None,
            active_device_name: Arc::new(Mutex::new(active_name)),
        })
    }

    /// List all available audio output devices.
    pub fn list_output_devices(&self) -> Vec<AudioDeviceInfo> {
        let default_name = self
            .host
            .default_output_device()
            .and_then(|d| d.name().ok());

        let mut devices = Vec::new();
        if let Ok(iter) = self.host.output_devices() {
            for dev in iter {
                if let Ok(name) = dev.name() {
                    let is_default = default_name.as_ref().map(|d| d == &name).unwrap_or(false);
                    let config = dev.default_output_config().ok();
                    let (channels, sample_rate) = match config {
                        Some(cfg) => (cfg.channels(), cfg.sample_rate().0),
                        None => (2, 44100),
                    };

                    devices.push(AudioDeviceInfo {
                        name,
                        is_default,
                        max_channels: channels,
                        default_sample_rate: sample_rate,
                    });
                }
            }
        }
        devices
    }

    /// Get current active device name.
    pub fn get_active_device_name(&self) -> String {
        self.active_device_name.lock().unwrap().clone()
    }
}
