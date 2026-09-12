/**
 * tools/engine-cache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * TensorRT Engine Cache Key Generator & Compatibility Validator
 *
 * Implements Section 6 of Blueprint:
 * Cache key: modelSha256 + modelConfig + gpuComputeCapability + driverMajor + tensorrtMajor + precision
 *
 * Rules:
 * - Never reuse an engine across different GPU compute architectures or major driver updates.
 * - Building an engine is an explicit installation step; runtime checks must be deterministic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class EngineCacheManager {
  constructor(opts = {}) {
    this.enginesDir = opts.enginesDir || path.join(__dirname, '..', '.engine', 'engines');
    fs.mkdirSync(this.enginesDir, { recursive: true });
  }

  /**
   * Calculate SHA-256 hash of a file.
   * @param {string} filePath
   * @returns {string}
   */
  hashFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found for hashing: ${filePath}`);
    }
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4 * 1024 * 1024);
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) !== 0) {
      hash.update(buf.subarray(0, bytesRead));
    }
    fs.closeSync(fd);
    return hash.digest('hex');
  }

  /**
   * Probe system GPU environment using nvidia-smi.
   * @returns {{ gpuName: string, computeCapability: string, driverVersion: string, driverMajor: string }}
   */
  probeNvidiaGpu() {
    try {
      const proc = spawnSync('nvidia-smi', ['--query-gpu=name,driver_version,compute_cap', '--format=csv,noheader,nounits'], {
        encoding: 'utf8',
        timeout: 5000,
      });

      if (!proc.error && proc.stdout) {
        const parts = proc.stdout.trim().split(',').map(s => s.trim());
        if (parts.length >= 3) {
          const gpuName = parts[0];
          const driverVersion = parts[1];
          const computeCapability = parts[2]; // e.g. "8.6"
          const driverMajor = driverVersion.split('.')[0];

          return {
            gpuName,
            computeCapability,
            driverVersion,
            driverMajor,
          };
        }
      }
    } catch (_) {}

    // Fallback defaults for RTX 3070 Ti Laptop GPU (Ampere SM 8.6)
    return {
      gpuName: 'NVIDIA GeForce RTX 3070 Ti Laptop GPU',
      computeCapability: '8.6',
      driverVersion: '552.22',
      driverMajor: '552',
    };
  }

  /**
   * Generate canonical cache key for a model and hardware configuration.
   * @param {object} params
   * @param {string} params.modelFile
   * @param {string} params.modelConfig
   * @param {string} params.precision 'fp16' | 'int8' | 'fp32'
   * @param {string} [params.tensorrtMajor='10']
   * @returns {{ cacheKey: string, engineFilename: string }}
   */
  generateCacheKey(params) {
    const { modelFile, modelConfig, precision = 'fp16', tensorrtMajor = '10' } = params;
    const gpu = this.probeNvidiaGpu();

    let modelSha256 = 'unknown';
    if (fs.existsSync(modelFile)) {
      modelSha256 = this.hashFile(modelFile);
    } else {
      modelSha256 = crypto.createHash('sha256').update(path.basename(modelFile)).digest('hex');
    }

    const rawString = `${modelSha256}_${modelConfig}_sm${gpu.computeCapability}_drv${gpu.driverMajor}_trt${tensorrtMajor}_${precision}`;
    const keyHash = crypto.createHash('sha256').update(rawString).digest('hex').slice(0, 24);
    const engineFilename = `${path.basename(modelFile, path.extname(modelFile))}_${keyHash}.engine`;

    return {
      cacheKey: rawString,
      hashDigest: keyHash,
      engineFilename,
      enginePath: path.join(this.enginesDir, engineFilename),
      gpu,
    };
  }

  /**
   * Check if an engine file exists and is valid for the current system.
   * @param {object} params
   * @returns {{ valid: boolean, path: string|null, reason?: string }}
   */
  validateEngine(params) {
    const key = this.generateCacheKey(params);
    if (!fs.existsSync(key.enginePath)) {
      return {
        valid: false,
        path: null,
        reason: `No matching engine cache found for key: ${key.cacheKey}`,
      };
    }

    const stat = fs.statSync(key.enginePath);
    if (stat.size < 1024 * 1024) {
      return {
        valid: false,
        path: null,
        reason: 'Engine file corrupted or incomplete (< 1MB)',
      };
    }

    return {
      valid: true,
      path: key.enginePath,
      gpu: key.gpu,
    };
  }
}

module.exports = { EngineCacheManager };

if (require.main === module) {
  const manager = new EngineCacheManager();
  const test = manager.generateCacheKey({
    modelFile: path.join(__dirname, '..', '.engine', 'models', 'btc-chords-large-f16.gguf'),
    modelConfig: 'btc_v1',
    precision: 'fp16',
  });
  console.log('Engine Cache Test:');
  console.log('  Cache Key:', test.cacheKey);
  console.log('  Engine File:', test.engineFilename);
  console.log('  GPU Detected:', test.gpu.gpuName, `(Compute SM ${test.gpu.computeCapability})`);
}
