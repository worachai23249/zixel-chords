//! src-tauri/src/dsp/fft.rs
//! ─────────────────────────────────────────────────────────────────────────────
//! SIMD-Accelerated STFT & Spectral Analysis Engine
//!
//! Powered by `realfft` and `rustfft` with automatic AVX2/SSE/NEON vectorization.
//! Used for high-speed spectrogram generation, harmonic feature extraction,
//! and real-time audio visualization.
//! ─────────────────────────────────────────────────────────────────────────────

use std::sync::Arc;
use realfft::{RealFftPlanner, RealToComplex};
use rustfft::num_complex::Complex;

pub struct StftProcessor {
    pub n_fft: usize,
    pub hop_length: usize,
    r2c: Arc<dyn RealToComplex<f32>>,
    window: Vec<f32>,
}

impl StftProcessor {
    /// Create a new STFT processor with standard Hann windowing.
    pub fn new(n_fft: usize, hop_length: usize) -> Self {
        let mut planner = RealFftPlanner::<f32>::new();
        let r2c = planner.plan_fft_forward(n_fft);

        // Precompute Hann window
        let window: Vec<f32> = (0..n_fft)
            .map(|i| {
                0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / n_fft as f32).cos())
            })
            .collect();

        Self {
            n_fft,
            hop_length,
            r2c,
            window,
        }
    }

    /// Compute magnitude spectrogram from single-channel PCM samples.
    /// Returns 2D vector where [frame_index][frequency_bin] is the linear magnitude.
    pub fn compute_magnitude_spectrogram(&self, audio: &[f32]) -> Vec<Vec<f32>> {
        if audio.len() < self.n_fft {
            return Vec::new();
        }

        let num_frames = (audio.len() - self.n_fft) / self.hop_length + 1;
        let mut spectrogram = Vec::with_capacity(num_frames);

        let mut in_buffer = vec![0.0f32; self.n_fft];
        let mut out_buffer: Vec<Complex<f32>> = vec![Complex::new(0.0, 0.0); self.n_fft / 2 + 1];

        for frame_idx in 0..num_frames {
            let start = frame_idx * self.hop_length;
            let chunk = &audio[start..start + self.n_fft];

            // Apply window
            for i in 0..self.n_fft {
                in_buffer[i] = chunk[i] * self.window[i];
            }

            // Execute Forward Real FFT
            if self.r2c.process(&mut in_buffer, &mut out_buffer).is_ok() {
                let magnitudes: Vec<f32> = out_buffer
                    .iter()
                    .map(|c| (c.norm_sqr()).sqrt())
                    .collect();
                spectrogram.push(magnitudes);
            }
        }

        spectrogram
    }

    /// Compute Log-Mel energy spectrogram (simplified mel filterbank).
    pub fn compute_log_mel_spectrogram(&self, audio: &[f32], n_mels: usize) -> Vec<Vec<f32>> {
        let mag_spec = self.compute_magnitude_spectrogram(audio);
        if mag_spec.is_empty() {
            return Vec::new();
        }

        let n_bins = self.n_fft / 2 + 1;
        let bins_per_mel = (n_bins / n_mels).max(1);

        mag_spec
            .into_iter()
            .map(|frame| {
                let mut mel_energies = Vec::with_capacity(n_mels);
                for m in 0..n_mels {
                    let start_bin = m * bins_per_mel;
                    let end_bin = ((m + 1) * bins_per_mel).min(frame.len());
                    let sum: f32 = frame[start_bin..end_bin].iter().sum();
                    mel_energies.push((sum + 1e-6).ln());
                }
                mel_energies
            })
            .collect()
    }
}
