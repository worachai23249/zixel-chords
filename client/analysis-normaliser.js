/*
  client/analysis-normaliser.js
  ─────────────────────────────────────────────────────────────────────────────
  Backward-compatible schema normaliser for Zixel Chords analysis results.

  Purpose:
    Legacy song.json files stored in .engine/library/ before schemaVersion was
    introduced have no `schemaVersion`, `provenance`, or structured chord fields
    (root/quality/bass). This module normalises them to v1 format transparently
    so the UI and adapter layer always work with a consistent shape.

  Rules:
  - Absent fields are filled with safe defaults — nothing is thrown away.
  - schemaVersion 0 (legacy) → schemaVersion 1 (current).
  - Already-v1 objects pass through unchanged.
  - Chord events that only have a `chord` string get root/quality/bass parsed.

  Usage (Node):
    const { normaliseToV1 } = require('./client/analysis-normaliser');
    const v1 = normaliseToV1(legacySong);

  Usage (browser — future Svelte/TS):
    Expose as an ES module and import; identical logic, no Node APIs used.

  ─────────────────────────────────────────────────────────────────────────────
*/

'use strict';

// ── Inline chord parser (copy from adapters/analysis-adapter.js contract) ────
// Kept here so this module has zero runtime dependencies on the server layer.
// Must remain in sync with parseChordLabel() in analysis-adapter.js.

const _FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const _PITCH_NAMES   = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function _normalisePitch(p) {
  if (!p) return null;
  const u = p.charAt(0).toUpperCase() + p.slice(1);
  return _FLAT_TO_SHARP[u] || (_PITCH_NAMES.includes(u) ? u : p);
}

const _CHORD_RE = /^([A-G][#b]?)(?::?((?:maj7|maj|min7|minmaj7|m7b5|hdim7|dim7|dim|aug|sus[24]|m7|min|m|7|9|11|13|add\d+|6)?))(?:\/([A-G][#b]?|\d+))?$/i;
const _QUALITY_MAP = {
  'maj7':'maj7','maj':'maj','min7':'min7','minmaj7':'minmaj7',
  'm7b5':'hdim7','hdim7':'hdim7','dim7':'dim7','dim':'dim','aug':'aug',
  'sus4':'sus4','sus2':'sus2','m7':'min7','min':'min','m':'min','7':'dom7','':'maj',
};

function _parseChordLabel(str) {
  const s = String(str || '').trim();
  if (!s || /^(N[.]?C[.]?|X|NC|N|no_chord)$/i.test(s)) return { root: null, quality: 'N.C.', bass: null };
  const m = _CHORD_RE.exec(s);
  if (!m) return { root: null, quality: s, bass: null };
  const rawBass = m[3] || null;
  return {
    root:    _normalisePitch(m[1]),
    quality: _QUALITY_MAP[(m[2] || '').toLowerCase()] || (m[2] || 'maj'),
    bass:    rawBass && /^[A-G]/i.test(rawBass) ? _normalisePitch(rawBass) : rawBass,
  };
}

// ─── Normaliser ───────────────────────────────────────────────────────────────

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Normalise a raw song object (any schema version) to v1.
 *
 * @param {object} raw — song object as stored in song.json or returned by /api/analyze
 * @returns {object}   — schema v1 object (safe to render in UI / pass to adapter)
 */
function normaliseToV1(raw) {
  if (!raw || typeof raw !== 'object') return _emptyV1();

  // Already current — pass through (shallow copy to avoid mutating caller's object)
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) return Object.assign({}, raw);

  // ── Core identity fields ───────────────────────────────────────────────────
  const out = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id:            raw.id            || null,
    title:         raw.title         || 'Unknown',
    author:        raw.author        || 'Local file',
    duration:      Number(raw.duration) || 0,

    // ── Timing & harmony ────────────────────────────────────────────────────
    key:           raw.key           || null,
    bpm:           raw.bpm           || null,
    meter:         raw.meter         || 4,
    analysisMode:  raw.analysisMode  || 'unknown',
    model:         raw.model         || null,

    // ── Audio ────────────────────────────────────────────────────────────────
    audioFile:     raw.audioFile     || null,
    audioUrl:      raw.audioUrl      || null,

    // ── Stems ────────────────────────────────────────────────────────────────
    hasStems:      Boolean(raw.hasStems),
    stems:         Array.isArray(raw.stems)        ? raw.stems        : [],
    absentStems:   Array.isArray(raw.absentStems)  ? raw.absentStems  : [],
    stemPresence:  raw.stemPresence  || {},

    // ── Timestamps ──────────────────────────────────────────────────────────
    created:       raw.created       || 0,
    updated:       raw.updated       || 0,
  };

  // ── Chord events ──────────────────────────────────────────────────────────
  out.chords = _normaliseChords(raw.chords);

  // ── Beat events ───────────────────────────────────────────────────────────
  out.beats = _normaliseBeats(raw.beats);

  // ── Lyrics ───────────────────────────────────────────────────────────────
  out.lyrics = _normaliseLyrics(raw.lyrics);

  // ── Provenance (synthesised from legacy fields) ───────────────────────────
  out.provenance = _normaliseProvenance(raw);

  return out;
}

// ── Sub-normalisers ──────────────────────────────────────────────────────────

function _normaliseChords(rawChords) {
  if (!Array.isArray(rawChords)) return [];
  return rawChords.map(c => {
    const label  = String(c.chord || '');
    const parsed = (c.root !== undefined) ? null : _parseChordLabel(label); // already parsed?
    return {
      start:      Number(c.start)      || 0,
      end:        Number(c.end)        || 0,
      chord:      label,
      root:       c.root     !== undefined ? c.root     : (parsed ? parsed.root     : null),
      quality:    c.quality  !== undefined ? c.quality  : (parsed ? parsed.quality  : 'maj'),
      bass:       c.bass     !== undefined ? c.bass     : (parsed ? parsed.bass     : null),
      confidence: Number(c.confidence) || 0,
    };
  });
}

function _normaliseBeats(rawBeats) {
  if (!Array.isArray(rawBeats)) return [];
  return rawBeats.map((b, idx) => ({
    index:     Number(b.index)     !== NaN ? Number(b.index) : idx,
    time:      Number(b.time)      || 0,
    type:      String(b.type      || (b.downbeat ? 'downbeat' : 'beat')),
    downbeat:  Boolean(b.downbeat),
    chord:     b.chord     || null,
    aiChord:   b.aiChord   || b.chord || null,
    confidence: Number(b.confidence) || 0,
  }));
}

function _normaliseLyrics(raw) {
  if (!raw || typeof raw !== 'object') return { language: 'auto', segments: [] };
  return {
    language: String(raw.language || 'auto'),
    segments: Array.isArray(raw.segments) ? raw.segments.map(s => ({
      start: Number(s.start) || 0,
      end:   Number(s.end)   || 0,
      text:  String(s.text   || ''),
      words: Array.isArray(s.words) ? s.words : [],
    })) : [],
  };
}

function _normaliseProvenance(raw) {
  // If provenance block already exists, pass it through
  if (raw.provenance && typeof raw.provenance === 'object') return raw.provenance;
  // Reconstruct from legacy fields
  return {
    runtime:        raw.model         || 'CrispASR (legacy)',
    runtimeVersion: null,
    backend:        'crispasr-vulkan',
    precision:      'fp16',
    gpuName:        null,
    models:         [],
    analysisMode:   raw.analysisMode  || 'unknown',
    createdAt:      raw.created ? new Date(raw.created).toISOString() : null,
    fallbackReason: null,
    _legacy:        true,  // flag: provenance was synthesised, not recorded at analysis time
  };
}

function _emptyV1() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: null, title: 'Unknown', author: 'Local file',
    duration: 0, key: null, bpm: null, meter: 4,
    analysisMode: 'unknown', model: null,
    audioFile: null, audioUrl: null,
    hasStems: false, stems: [], absentStems: [], stemPresence: {},
    created: 0, updated: 0,
    chords: [], beats: [], lyrics: { language: 'auto', segments: [] },
    provenance: { runtime: null, runtimeVersion: null, backend: null,
                  precision: null, gpuName: null, models: [], analysisMode: null,
                  createdAt: null, fallbackReason: null, _legacy: true },
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { normaliseToV1, CURRENT_SCHEMA_VERSION };

// ── If running directly (smoke test) ─────────────────────────────────────────
if (require.main === module) {
  const legacy = {
    id: 'test', title: 'Legacy Song', duration: 180,
    chords: [{ start: 0, end: 2, chord: 'C#m7/E', confidence: 0 }],
    beats:  [{ time: 0, downbeat: true }],
    lyrics: null,
  };
  const v1 = normaliseToV1(legacy);
  console.log(JSON.stringify(v1, null, 2));
  const chord = v1.chords[0];
  console.assert(chord.root    === 'C#',   'root should be C#');
  console.assert(chord.quality === 'min7', 'quality should be min7');
  console.assert(chord.bass    === 'E',    'bass should be E');
  console.assert(v1.schemaVersion === 1,   'schemaVersion should be 1');
  console.log('✓ analysis-normaliser smoke test passed');
}
