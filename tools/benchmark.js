#!/usr/bin/env node
/*
  tools/benchmark.js
  ─────────────────────────────────────────────────────────────────────────────
  Zixel Chords Phase 0 benchmark runner.

  Runs the analysis pipeline against a directory of audio files and produces a
  machine-readable JSON report with per-stage timing, memory usage, schema
  validation, and failure reasons.

  Usage:
    node tools/benchmark.js [options]

  Options:
    --dir    <path>    Directory of audio files to analyse  (default: tools/golden-set/audio)
    --mode   fast|studio  Analysis mode                     (default: fast)
    --output <path>    Write JSON report to this file       (default: print to stdout)
    --validate-schema  Exit non-zero if any result lacks schemaVersion:1
    --server <url>     Base URL of a running server.js      (default: http://127.0.0.1:4173)

  Output format:
    {
      "run": { "timestamp", "mode", "dir", "serverUrl", "nodeVersion" },
      "results": [
        {
          "file": "track.mp3",
          "status": "ok" | "error" | "schema-error",
          "wallMs": 1234,
          "stages": { "separate": 12345, "chords": 456, ... },
          "peakRssBytes": 12345678,
          "schemaVersion": 1,
          "hasProvenance": true,
          "chordCount": 42,
          "beatCount": 120,
          "error": null
        }
      ],
      "summary": { "total", "ok", "errors", "avgWallMs", "p50WallMs", "p95WallMs", "maxPeakRssMb" }
    }

  ─────────────────────────────────────────────────────────────────────────────
*/

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dir:            path.join(__dirname, 'golden-set', 'audio'),
    mode:           'fast',
    output:         null,
    validateSchema: false,
    server:         'http://127.0.0.1:4173',
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dir':            args.dir            = argv[++i]; break;
      case '--mode':           args.mode           = argv[++i]; break;
      case '--output':         args.output         = argv[++i]; break;
      case '--server':         args.server         = argv[++i]; break;
      case '--validate-schema': args.validateSchema = true;     break;
      default:
        if (!argv[i].startsWith('-')) args.dir = argv[i];
    }
  }
  return args;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function postAudio(serverUrl, audioPath, mode) {
  return new Promise((resolve, reject) => {
    const fileBuffer  = fs.readFileSync(audioPath);
    const filename    = path.basename(audioPath);
    const boundary    = '----ZixelBenchmark' + Date.now();
    const disposition = `Content-Disposition: form-data; name="audio"; filename="${filename}"`;
    const contentType = 'application/octet-stream';

    const bodyParts = [
      Buffer.from(`--${boundary}\r\n${disposition}\r\nContent-Type: ${contentType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const body = Buffer.concat(bodyParts);

    const url = new URL('/api/analyze', serverUrl);
    const options = {
      hostname: url.hostname,
      port:     parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':                    `multipart/form-data; boundary=${boundary}`,
        'Content-Length':                  body.length,
        'X-ChordTube-NonCommercial':       'true',
        'X-ChordTube-Analysis':            mode === 'studio' ? 'accurate' : 'standard',
        'X-ChordTube-Meter':               'auto',
        'X-ChordTube-Lang':               'th',
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: { error: 'Non-JSON response: ' + data.slice(0, 200) } });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Schema validator ──────────────────────────────────────────────────────────

function validateSchema(result) {
  const issues = [];
  if (result.schemaVersion !== 1)   issues.push('missing schemaVersion:1');
  if (!result.provenance)           issues.push('missing provenance block');
  if (!Array.isArray(result.chords)) issues.push('chords is not an array');
  if (!Array.isArray(result.beats))  issues.push('beats is not an array');
  if (result.chords && result.chords.length > 0) {
    const c = result.chords[0];
    if (!('root'    in c)) issues.push('chord missing root field');
    if (!('quality' in c)) issues.push('chord missing quality field');
    if (!('bass'    in c)) issues.push('chord missing bass field');
  }
  if (result.provenance) {
    if (!result.provenance.runtime)       issues.push('provenance missing runtime');
    if (!result.provenance.backend)       issues.push('provenance missing backend');
    if (!result.provenance.createdAt)     issues.push('provenance missing createdAt');
  }
  return issues;
}

// ── Percentile helper ─────────────────────────────────────────────────────────

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // Collect audio files
  if (!fs.existsSync(args.dir)) {
    console.error(`[benchmark] Directory not found: ${args.dir}`);
    console.error('[benchmark] Create it and add audio files, or use --dir <path>');
    process.exit(1);
  }
  const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg)$/i;
  const files = fs.readdirSync(args.dir)
    .filter(f => AUDIO_EXT.test(f))
    .map(f => path.join(args.dir, f));

  if (!files.length) {
    console.error(`[benchmark] No audio files found in: ${args.dir}`);
    process.exit(1);
  }

  console.log(`[benchmark] Running ${files.length} file(s) in ${args.mode} mode against ${args.server}`);

  const results = [];
  let hasSchemaError = false;

  for (const filePath of files) {
    const filename = path.basename(filePath);
    process.stdout.write(`  → ${filename} ... `);

    const startRss = process.memoryUsage().rss;
    const startMs  = Date.now();
    let peakRss    = startRss;

    // Poll RSS during request
    const rssPoller = setInterval(() => {
      const rss = process.memoryUsage().rss;
      if (rss > peakRss) peakRss = rss;
    }, 100);

    let entry;
    try {
      const resp    = await postAudio(args.server, filePath, args.mode);
      const wallMs  = Date.now() - startMs;
      clearInterval(rssPoller);

      if (resp.status !== 200) {
        entry = {
          file: filename, status: 'error', wallMs,
          peakRssBytes: peakRss, error: resp.body.error || `HTTP ${resp.status}`,
          schemaVersion: null, hasProvenance: false, chordCount: 0, beatCount: 0,
        };
        process.stdout.write(`ERROR (${resp.status})\n`);
      } else {
        const body        = resp.body;
        const schemaIssues = validateSchema(body);
        const schemaOk    = schemaIssues.length === 0;
        if (!schemaOk) hasSchemaError = true;

        entry = {
          file:          filename,
          status:        schemaOk ? 'ok' : 'schema-error',
          wallMs:        wallMs,
          peakRssBytes:  peakRss,
          schemaVersion: body.schemaVersion || null,
          hasProvenance: Boolean(body.provenance),
          chordCount:    Array.isArray(body.chords) ? body.chords.length : 0,
          beatCount:     Array.isArray(body.beats)  ? body.beats.length  : 0,
          bpm:           body.bpm    || null,
          key:           body.key    || null,
          duration:      body.duration || null,
          analysisMode:  body.analysisMode || null,
          provenance:    body.provenance   || null,
          schemaIssues:  schemaIssues.length ? schemaIssues : undefined,
          error:         null,
        };
        process.stdout.write(`${schemaOk ? 'OK' : 'SCHEMA-ERR'} (${wallMs}ms, ` +
          `${(peakRss / 1024 / 1024).toFixed(0)}MB RSS, ` +
          `${entry.chordCount} chords, ${entry.beatCount} beats)\n`);
      }
    } catch (err) {
      clearInterval(rssPoller);
      const wallMs = Date.now() - startMs;
      entry = {
        file: filename, status: 'error', wallMs,
        peakRssBytes: peakRss, error: err.message,
        schemaVersion: null, hasProvenance: false, chordCount: 0, beatCount: 0,
      };
      process.stdout.write(`EXCEPTION: ${err.message}\n`);
    }

    results.push(entry);
  }

  // Summary statistics
  const okResults  = results.filter(r => r.status === 'ok' || r.status === 'schema-error');
  const wallTimes  = okResults.map(r => r.wallMs).sort((a, b) => a - b);
  const peakRssMb  = results.map(r => r.peakRssBytes / 1024 / 1024);
  const maxPeakRss = Math.max(...peakRssMb);

  const report = {
    run: {
      timestamp:   new Date().toISOString(),
      mode:        args.mode,
      dir:         args.dir,
      serverUrl:   args.server,
      nodeVersion: process.version,
      fileCount:   files.length,
    },
    results,
    summary: {
      total:        results.length,
      ok:           results.filter(r => r.status === 'ok').length,
      schemaErrors: results.filter(r => r.status === 'schema-error').length,
      errors:       results.filter(r => r.status === 'error').length,
      avgWallMs:    wallTimes.length ? Math.round(wallTimes.reduce((a, b) => a + b, 0) / wallTimes.length) : 0,
      p50WallMs:    percentile(wallTimes, 50),
      p95WallMs:    percentile(wallTimes, 95),
      maxPeakRssMb: Math.round(maxPeakRss * 10) / 10,
    },
  };

  // Output
  const reportJson = JSON.stringify(report, null, 2);
  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, reportJson, 'utf8');
    console.log(`\n[benchmark] Report written to: ${args.output}`);
  } else {
    console.log('\n' + reportJson);
  }

  console.log(`\n[benchmark] Summary: ${report.summary.ok}/${report.summary.total} OK, ` +
    `p50=${report.summary.p50WallMs}ms, p95=${report.summary.p95WallMs}ms, ` +
    `peakRSS=${report.summary.maxPeakRssMb}MB`);

  // Exit non-zero if schema validation failed and --validate-schema was set
  if (args.validateSchema && hasSchemaError) {
    console.error('[benchmark] ✗ Schema validation failed — see schemaIssues in report');
    process.exit(2);
  }
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[benchmark] Fatal:', err.message);
  process.exit(1);
});
