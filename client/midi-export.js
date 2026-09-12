/**
 * client/midi-export.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standard MIDI File (SMF Format 1) Generator for Zixel Chords
 *
 * Capabilities:
 * - Generates valid multi-track Standard MIDI File (.mid) binary in pure JS
 * - Zero external dependencies
 * - Track 1: Harmonic Chords (Polyphonic voicings on Channel 1, e.g. Piano/EP)
 * - Track 2: Bassline (Root & Inversion bass notes on Channel 2, e.g. Fingered Bass)
 * - Track 3: Beat & Tempo Grid (Meta Tempo + Time Signature + Click/Guide)
 * - Directly importable into any DAW (Ableton Live, FL Studio, Logic Pro, Cubase)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// Pitch class to MIDI note offset (C4 = 60)
const NOTE_TO_MIDI = {
  'C': 60, 'C#': 61, 'Db': 61,
  'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64,
  'F': 65, 'F#': 66, 'Gb': 66,
  'G': 67, 'G#': 68, 'Ab': 68,
  'A': 69, 'A#': 70, 'Bb': 70,
  'B': 71,
};

// Chord quality to semitone interval formula (relative to root)
const QUALITY_INTERVALS = {
  'maj':      [0, 4, 7],
  'min':      [0, 3, 7],
  'm':        [0, 3, 7],
  'dom7':     [0, 4, 7, 10],
  '7':        [0, 4, 7, 10],
  'maj7':     [0, 4, 7, 11],
  'min7':     [0, 3, 7, 10],
  'm7':       [0, 3, 7, 10],
  'dim':      [0, 3, 6],
  'dim7':     [0, 3, 6, 9],
  'hdim7':    [0, 3, 6, 10],
  'm7b5':     [0, 3, 6, 10],
  'aug':      [0, 4, 8],
  'sus4':     [0, 5, 7],
  'sus2':     [0, 2, 7],
  'add9':     [0, 4, 7, 14],
  'min9':     [0, 3, 7, 10, 14],
  'maj9':     [0, 4, 7, 11, 14],
  '9':        [0, 4, 7, 10, 14],
  '11':       [0, 4, 7, 10, 14, 17],
  '13':       [0, 4, 7, 10, 14, 21],
  '6':        [0, 4, 7, 9],
  'm6':       [0, 3, 7, 9],
};

class MidiTrackBuilder {
  constructor() {
    this.events = []; // { tick, bytes }
  }

  addEvent(tick, bytes) {
    this.events.push({ tick: Math.max(0, Math.round(tick)), bytes });
  }

  buildTrackChunk(ppq) {
    // Sort events strictly by tick
    this.events.sort((a, b) => a.tick - b.tick);

    const chunkData = [];
    let lastTick = 0;

    for (const ev of this.events) {
      const delta = ev.tick - lastTick;
      lastTick = ev.tick;

      // Write variable-length quantity (VLQ) for delta time
      chunkData.push(...encodeVlq(delta));
      chunkData.push(...ev.bytes);
    }

    // End of Track meta event: Delta=0, FF 2F 00
    chunkData.push(0x00, 0xFF, 0x2F, 0x00);

    // MTrk header + 32-bit length
    const header = [
      0x4D, 0x54, 0x72, 0x6B, // "MTrk"
      (chunkData.length >> 24) & 0xFF,
      (chunkData.length >> 16) & 0xFF,
      (chunkData.length >> 8) & 0xFF,
      chunkData.length & 0xFF,
    ];

    return new Uint8Array([...header, ...chunkData]);
  }
}

function encodeVlq(val) {
  let v = Math.max(0, Math.round(val));
  const bytes = [v & 0x7F];
  while ((v >>= 7) > 0) {
    bytes.unshift((v & 0x7F) | 0x80);
  }
  return bytes;
}

function stringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xFF);
  }
  return bytes;
}

/**
 * Generate a standard MIDI file (SMF Format 1) from song analysis data.
 * @param {object} song - AnalysisResult object (schemaVersion: 1)
 * @returns {Uint8Array} Binary MIDI file contents
 */
function generateMidiFile(song) {
  const ppq = 480; // Pulses (Ticks) Per Quarter note (standard DAW resolution)
  const bpm = Number(song.bpm) || 120;
  const usPerQuarter = Math.round(60000000 / bpm);
  const secondsPerTick = (60 / bpm) / ppq;

  function timeToTicks(sec) {
    return Math.round(sec / secondsPerTick);
  }

  // ── Track 0: Tempo & Time Signature Meta Track ───────────────────────────
  const metaTrack = new MidiTrackBuilder();

  // Track Name
  const trackNameBytes = stringToBytes(song.title || 'Zixel Chords');
  metaTrack.addEvent(0, [0xFF, 0x03, trackNameBytes.length, ...trackNameBytes]);

  // Set Tempo: FF 51 03 tt tt tt
  metaTrack.addEvent(0, [
    0xFF, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xFF,
    (usPerQuarter >> 8) & 0xFF,
    usPerQuarter & 0xFF,
  ]);

  // Time Signature: FF 58 04 nn dd cc bb (Default 4/4)
  const meterVal = Number(song.meter) || 4;
  metaTrack.addEvent(0, [0xFF, 0x58, 0x04, meterVal, 2, 24, 8]);

  // ── Track 1: Harmonic Chords ──────────────────────────────────────────────
  const chordTrack = new MidiTrackBuilder();
  const chordName = stringToBytes('Chords (Harmonic Progression)');
  chordTrack.addEvent(0, [0xFF, 0x03, chordName.length, ...chordName]);
  chordTrack.addEvent(0, [0xC0, 0]); // Program Change: Acoustic Grand Piano (0)

  // ── Track 2: Bassline ─────────────────────────────────────────────────────
  const bassTrack = new MidiTrackBuilder();
  const bassName = stringToBytes('Bassline (Root/Inversion)');
  bassTrack.addEvent(0, [0xFF, 0x03, bassName.length, ...bassName]);
  bassTrack.addEvent(0, [0xC1, 33]); // Program Change: Fingered Electric Bass (33 on Ch 2)

  const chords = Array.isArray(song.chords) ? song.chords : [];
  for (const c of chords) {
    if (!c.chord || /^(N|N\.C\.|X|no_chord)$/i.test(c.chord)) continue;

    const startTick = timeToTicks(c.start);
    const endTick = Math.max(startTick + ppq / 2, timeToTicks(c.end));
    const root = c.root || (c.chord.match(/^[A-G][#b]?/i) ? c.chord.match(/^[A-G][#b]?/i)[0] : 'C');
    const rootMidi = NOTE_TO_MIDI[root] || 60;
    const quality = (c.quality || 'maj').toLowerCase();
    const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS['maj'];

    // Write chord notes on Track 1 (Channel 0)
    for (const iv of intervals) {
      const midiNote = Math.min(108, Math.max(21, rootMidi + iv));
      // Note On: 90 nn vv (Velocity 88)
      chordTrack.addEvent(startTick, [0x90, midiNote, 88]);
      // Note Off: 80 nn 00
      chordTrack.addEvent(endTick, [0x80, midiNote, 0]);
    }

    // Write bass note on Track 2 (Channel 1, transposed 2 octaves down to bass range C2-B2)
    const bassNoteStr = c.bass || root;
    const bassMidi = (NOTE_TO_MIDI[bassNoteStr] || rootMidi) - 24;
    const clampedBass = Math.min(60, Math.max(24, bassMidi));
    // Note On: 91 nn vv (Velocity 96)
    bassTrack.addEvent(startTick, [0x91, clampedBass, 96]);
    // Note Off: 81 nn 00
    bassTrack.addEvent(endTick, [0x81, clampedBass, 0]);
  }

  // ── Build Chunks ──────────────────────────────────────────────────────────
  const t0Chunk = metaTrack.buildTrackChunk(ppq);
  const t1Chunk = chordTrack.buildTrackChunk(ppq);
  const t2Chunk = bassTrack.buildTrackChunk(ppq);

  const numTracks = 3;

  // Header Chunk: MThd, length=6, format=1, numTracks=3, division=ppq
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x01,             // Format 1 (multi-track synchronous)
    0x00, numTracks,        // 3 tracks
    (ppq >> 8) & 0xFF,
    ppq & 0xFF,
  ]);

  // Merge all chunks into single binary array
  const totalLen = header.length + t0Chunk.length + t1Chunk.length + t2Chunk.length;
  const midiFile = new Uint8Array(totalLen);

  let offset = 0;
  midiFile.set(header, offset); offset += header.length;
  midiFile.set(t0Chunk, offset); offset += t0Chunk.length;
  midiFile.set(t1Chunk, offset); offset += t1Chunk.length;
  midiFile.set(t2Chunk, offset); offset += t2Chunk.length;

  return midiFile;
}

/**
 * Trigger download of song as a Standard MIDI File in browser environment.
 * @param {object} song - AnalysisResult
 * @param {string} [filename]
 */
function downloadMidi(song, filename) {
  const binary = generateMidiFile(song);
  const blob = new Blob([binary], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const safeName = (filename || song.title || 'zixel-chords').replace(/[^\w\d\-_ก-๙\s]/g, '').trim();

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Universal export (Node & Browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateMidiFile, downloadMidi };
} else if (typeof window !== 'undefined') {
  window.ZixelMidi = { generateMidiFile, downloadMidi };
  window.midiExport = window.ZixelMidi;
}
