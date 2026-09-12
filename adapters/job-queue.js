/*
  adapters/job-queue.js
  ─────────────────────────────────────────────────────────────────────────────
  Analysis job lifecycle manager for Zixel Chords.

  Responsibilities:
  - Track every analysis job from creation → running → done/cancelled/error
  - Hold an AbortController per job so any stage can be cancelled at any time
  - Expose a typed AnalysisProgress compatible with the data contract
  - Prune expired jobs automatically (TTL-based)

  Cancellation strategy (Phase 0 default):
    Calling cancelJob(id) sets the AbortSignal and kills any live subprocess.
    The adapter's _run() listens for the signal and rejects immediately.
    The analysis handler's catch block is responsible for temp-file cleanup.

  A cancelled job is NEVER written to the library (enforced by caller convention;
  this module only marks the status — it does not call saveSongToLibrary).

  ─────────────────────────────────────────────────────────────────────────────
*/

'use strict';

// ─── Job statuses ─────────────────────────────────────────────────────────────

const STATUS = Object.freeze({
  PENDING:   'pending',
  RUNNING:   'running',
  DONE:      'done',
  CANCELLED: 'cancelled',
  ERROR:     'error',
});

// ─── JobQueue ─────────────────────────────────────────────────────────────────

class JobQueue {
  /**
   * @param {object} [opts]
   * @param {number} [opts.ttlMs=1800000]  — how long to keep finished jobs (default 30 min)
   * @param {number} [opts.pruneMs=900000] — how often to prune (default 15 min)
   */
  constructor(opts = {}) {
    this._jobs   = new Map();
    this._ttlMs  = opts.ttlMs  ?? 30 * 60 * 1000;
    this._pruneMs = opts.pruneMs ?? 15 * 60 * 1000;
    this._pruneTimer = setInterval(() => this._prune(), this._pruneMs);
    // Allow Node process to exit even if the timer is still running
    if (this._pruneTimer.unref) this._pruneTimer.unref();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Create and register a new job.
   * Returns the job object (including .signal for the adapter to receive).
   *
   * @param {string} jobId
   * @returns {Job}
   */
  create(jobId) {
    if (this._jobs.has(jobId)) {
      // Idempotent — return existing job
      return this._jobs.get(jobId);
    }

    const controller = new AbortController();
    const job = {
      id:         jobId,
      status:     STATUS.PENDING,
      signal:     controller.signal,
      progress:   this._makeProgress(jobId, 'upload', 0, 'Initialising…', ''),
      _controller: controller,
      _updatedAt:  Date.now(),
    };
    this._jobs.set(jobId, job);
    return job;
  }

  /**
   * Update progress for a running job.
   * stage must match AnalysisProgress.stage union.
   *
   * @param {string} jobId
   * @param {string} stage
   * @param {number} percent  0–100
   * @param {string} message
   * @param {string} [detail]
   * @param {number} [etaSeconds]
   */
  report(jobId, stage, percent, message, detail, etaSeconds) {
    const job = this._jobs.get(jobId);
    if (!job) return;
    job.status = percent >= 100 ? STATUS.DONE : STATUS.RUNNING;
    job.progress = this._makeProgress(jobId, stage, percent, message, detail, etaSeconds);
    job._updatedAt = Date.now();
  }

  /**
   * Mark a job as completed successfully.
   * @param {string} jobId
   */
  complete(jobId) {
    const job = this._jobs.get(jobId);
    if (!job) return;
    job.status     = STATUS.DONE;
    job._updatedAt = Date.now();
    job.progress   = { ...job.progress, percent: 100 };
  }

  /**
   * Mark a job as errored.
   * @param {string} jobId
   * @param {string} message
   */
  fail(jobId, message) {
    const job = this._jobs.get(jobId);
    if (!job) return;
    job.status     = STATUS.ERROR;
    job._updatedAt = Date.now();
    job.progress   = this._makeProgress(jobId, 'error', 0, message, '');
  }

  /**
   * Cancel a job.
   * - Fires the AbortSignal (adapter will kill subprocess)
   * - Marks status as CANCELLED
   * - The API layer must ensure no library write happens after this
   *
   * @param {string} jobId
   * @returns {boolean} true if job existed and was cancelled, false otherwise
   */
  cancel(jobId) {
    const job = this._jobs.get(jobId);
    if (!job) return false;
    if (job.status === STATUS.DONE || job.status === STATUS.ERROR) return false;
    job.status     = STATUS.CANCELLED;
    job._updatedAt = Date.now();
    job.progress   = this._makeProgress(jobId, 'cancelled', 0, 'Job cancelled by user', '');
    try { job._controller.abort(); } catch (_) {}
    return true;
  }

  /**
   * Retrieve current progress snapshot for a job.
   * Returns a waiting placeholder if jobId is unknown.
   *
   * @param {string} jobId
   * @returns {AnalysisProgress}
   */
  getProgress(jobId) {
    const job = this._jobs.get(jobId);
    if (!job) {
      return this._makeProgress(jobId, 'waiting', 0, 'Waiting in queue…', '');
    }
    return job.progress;
  }

  /**
   * Check whether a job has been cancelled.
   * Use this inside long pipeline steps (between awaits) to bail out early.
   *
   * @param {string} jobId
   * @returns {boolean}
   */
  isCancelled(jobId) {
    const job = this._jobs.get(jobId);
    return job ? job.status === STATUS.CANCELLED : false;
  }

  /**
   * Get the AbortSignal for a job so adapters can listen to it.
   * @param {string} jobId
   * @returns {AbortSignal|null}
   */
  getSignal(jobId) {
    const job = this._jobs.get(jobId);
    return job ? job.signal : null;
  }

  /**
   * Return all job IDs currently in the queue.
   * @returns {string[]}
   */
  list() {
    return Array.from(this._jobs.keys());
  }

  /** Stop the prune timer (call on graceful shutdown). */
  destroy() {
    clearInterval(this._pruneTimer);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _makeProgress(jobId, stage, percent, message, detail, etaSeconds) {
    const p = {
      jobId,
      stage,
      percent: Math.min(100, Math.max(0, Number(percent) || 0)),
      message: String(message || ''),
      detail:  String(detail  || ''),
    };
    if (etaSeconds !== undefined && etaSeconds !== null) {
      p.etaSeconds = Number(etaSeconds);
    }
    return p;
  }

  _prune() {
    const cutoff = Date.now() - this._ttlMs;
    for (const [id, job] of this._jobs.entries()) {
      if (job._updatedAt < cutoff) {
        this._jobs.delete(id);
      }
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

// server.js imports this singleton; tests can create their own instance.
const defaultQueue = new JobQueue();

module.exports = {
  STATUS,
  JobQueue,
  jobQueue: defaultQueue,
};
