/**
 * client/midi-engine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Web MIDI API Engine & Real-Time AI Chord Evaluator
 *
 * Capabilities:
 * - Connects to USB MIDI Keyboards / Digital Pianos via Web MIDI API
 * - Real-time active note tracking with Pitch Class identification (0-11)
 * - AI Chord Evaluation: Compares pressed notes with the current song chord,
 *   calculating real-time match accuracy (0-100%), detecting root, missing notes,
 *   and incorrect notes
 * - Event Dispatcher for reactive UI updates (e.g. Virtual Piano SVG highlighting)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiNumberToPitch(num) {
  const noteIdx = num % 12;
  const octave = Math.floor(num / 12) - 1;
  return {
    name: PITCH_NAMES[noteIdx],
    octave: octave,
    pitchClass: noteIdx,
    midi: num
  };
}

class MidiEngine {
  constructor() {
    this.midiAccess = null;
    this.activeInputs = new Map();
    this.activeNotes = new Set(); // Set of active MIDI numbers (e.g. 60, 64, 67)
    this.listeners = new Set();
    this.isSupported = typeof navigator !== 'undefined' && Boolean(navigator.requestMIDIAccess);
    this.status = 'idle'; // 'idle' | 'connected' | 'unsupported' | 'error'
  }

  /**
   * Request MIDI access from the browser.
   */
  async init() {
    if (!this.isSupported) {
      this.status = 'unsupported';
      this._emit({ type: 'status', status: this.status, message: 'Web MIDI API ไม่รองรับในเบราว์เซอร์นี้' });
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.status = 'connected';

      // Attach listeners to all inputs
      for (const input of this.midiAccess.inputs.values()) {
        this._attachInput(input);
      }

      this.midiAccess.onstatechange = (e) => {
        if (e.port.type === 'input') {
          if (e.port.state === 'connected') {
            this._attachInput(e.port);
          } else {
            this.activeInputs.delete(e.port.id);
          }
          this._emit({ type: 'deviceChange', inputs: this.getInputs() });
        }
      };

      this._emit({ type: 'status', status: 'connected', inputs: this.getInputs() });
      return true;
    } catch (err) {
      this.status = 'error';
      this._emit({ type: 'status', status: 'error', error: err.message });
      return false;
    }
  }

  _attachInput(input) {
    if (this.activeInputs.has(input.id)) return;
    this.activeInputs.set(input.id, input.name || 'MIDI Keyboard');
    input.onmidimessage = (e) => this._handleMessage(e);
  }

  noteOn(note, velocity = 100) {
    this.activeNotes.add(note);
    this._emit({
      type: 'noteOn',
      note: midiNumberToPitch(note),
      velocity: velocity,
      activeNotes: Array.from(this.activeNotes)
    });
  }

  noteOff(note) {
    this.activeNotes.delete(note);
    this._emit({
      type: 'noteOff',
      note: midiNumberToPitch(note),
      activeNotes: Array.from(this.activeNotes)
    });
  }

  _handleMessage(e) {
    const [status, note, velocity] = e.data;
    const command = status >> 4;

    // Note On (Command 9, velocity > 0)
    if (command === 9 && velocity > 0) {
      this.noteOn(note, velocity);
    }
    // Note Off (Command 8 or Command 9 with velocity 0)
    else if (command === 8 || (command === 9 && velocity === 0)) {
      this.noteOff(note);
    }
  }

  /**
   * Parse chord string (e.g. 'C#m', 'G7', 'Fmaj7', 'Dsus4') into { root, quality, chord }
   */
  parseChord(chordInput) {
    if (!chordInput) return null;
    if (typeof chordInput === 'object' && chordInput.chord) return chordInput;
    const raw = String(chordInput).trim();
    if (/^(N|N\.C\.|X|—)$/i.test(raw)) return null;

    const match = raw.match(/^([A-G][#b]?)(.*)/i);
    if (!match) return null;

    let root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    if (flatMap[root]) root = flatMap[root];

    const ext = match[2].toLowerCase();
    let quality = 'maj';
    if (ext.startsWith('m7') || ext.startsWith('min7')) quality = 'min7';
    else if (ext.startsWith('maj7')) quality = 'maj7';
    else if (ext.startsWith('m') || ext.startsWith('min')) quality = 'min';
    else if (ext.startsWith('7')) quality = 'dom7';
    else if (ext.startsWith('dim')) quality = 'dim';
    else if (ext.startsWith('aug')) quality = 'aug';
    else if (ext.startsWith('sus4')) quality = 'sus4';
    else if (ext.startsWith('sus2')) quality = 'sus2';

    return { chord: raw, root, quality };
  }

  /**
   * Get expected theoretical note names and pitch classes for a chord.
   */
  getChordNotes(chordInput) {
    const parsed = this.parseChord(chordInput);
    if (!parsed) return { notes: [], pitchClasses: [] };

    const rootIdx = PITCH_NAMES.indexOf(parsed.root);
    if (rootIdx === -1) return { notes: [], pitchClasses: [] };

    const qualityMap = {
      'maj':   [0, 4, 7],
      'min':   [0, 3, 7],
      'dom7':  [0, 4, 7, 10],
      'maj7':  [0, 4, 7, 11],
      'min7':  [0, 3, 7, 10],
      'dim':   [0, 3, 6],
      'aug':   [0, 4, 8],
      'sus4':  [0, 5, 7],
      'sus2':  [0, 2, 7]
    };
    const intervals = qualityMap[parsed.quality] || [0, 4, 7];
    const pitchClasses = intervals.map(iv => (rootIdx + iv) % 12);
    const notes = pitchClasses.map(pc => PITCH_NAMES[pc]);
    return { notes, pitchClasses, root: parsed.root, quality: parsed.quality };
  }

  /**
   * Evaluate currently pressed MIDI notes against a target chord.
   * @param {string|object} chordInput
   * @returns {object} { score: number, isCorrect: boolean, pressedNotes: string[], targetNotes: string[], feedback: string }
   */
  evaluateChord(chordInput) {
    const chord = this.parseChord(chordInput);
    if (!chord) {
      return { score: 100, isCorrect: true, pressedNotes: [], targetNotes: [], feedback: 'พักมือ (No Chord)' };
    }

    const { notes: targetNoteNames, pitchClasses: targetPitchClassesList } = this.getChordNotes(chord);
    const targetPitchClasses = new Set(targetPitchClassesList);

    if (this.activeNotes.size === 0) {
      return { score: 0, isCorrect: false, pressedNotes: [], targetNotes: targetNoteNames, feedback: 'ยังไม่มีการกดโน้ต' };
    }

    const pressedPitchClasses = new Set(Array.from(this.activeNotes).map(n => n % 12));
    const pressedNoteNames = Array.from(pressedPitchClasses).map(pc => PITCH_NAMES[pc]);

    // Calculate matches
    let matchedCount = 0;
    for (const pc of targetPitchClasses) {
      if (pressedPitchClasses.has(pc)) matchedCount++;
    }

    const extraNotes = [];
    for (const pc of pressedPitchClasses) {
      if (!targetPitchClasses.has(pc)) extraNotes.push(PITCH_NAMES[pc]);
    }

    const matchRatio = matchedCount / targetPitchClasses.size;
    let score = Math.round(matchRatio * 100);

    // Penalty for wrong/extra notes
    if (extraNotes.length > 0) {
      score = Math.max(0, score - (extraNotes.length * 15));
    }

    const isCorrect = score >= 80;
    let feedback = 'ถูกต้องยอดเยี่ยม!';
    if (score < 40) feedback = 'คอร์ดไม่ตรง';
    else if (score < 80) feedback = `ขาดโน้ต: ${targetNoteNames.filter(n => !pressedNoteNames.includes(n)).join(', ')}`;
    else if (extraNotes.length > 0) feedback = `ระวังโน้ตนอกคอร์ด: ${extraNotes.join(', ')}`;

    return {
      score,
      isCorrect,
      pressedNotes: pressedNoteNames,
      targetNotes: targetNoteNames,
      extraNotes,
      feedback
    };
  }

  getInputs() {
    return Array.from(this.activeInputs.entries()).map(([id, name]) => ({ id, name }));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(event) {
    for (const fn of this.listeners) {
      try { fn(event); } catch (_) {}
    }
  }
}

const midiEngine = new MidiEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MidiEngine, midiEngine, PITCH_NAMES };
} else if (typeof window !== 'undefined') {
  window.ZixelMidiEngine = { MidiEngine, midiEngine, PITCH_NAMES };
  window.midiEngine = midiEngine;
}
