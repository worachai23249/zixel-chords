/* ══════════════════════════════════════════════════════════════════════════
   ZIXEL CHORDS — VIRTUAL JAM STUDIO CONTROLLER
   Harmonic Circle-of-Fifths Sliding Matrix · Key Centering Engine · Zixel Luxury Audio
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // Circle of Fifths roots (12 Columns)
  const MATRIX_COLUMNS = [
    { root: 'C#', minor: 'Bbm', major: 'C#', dom7: 'Bb7' },
    { root: 'G#', minor: 'Fm',  major: 'G#', dom7: 'F7' },
    { root: 'Eb', minor: 'Cm',  major: 'Eb', dom7: 'C7' },
    { root: 'Bb', minor: 'Gm',  major: 'Bb', dom7: 'G7' },
    { root: 'F',  minor: 'Dm',  major: 'F',  dom7: 'D7' },
    { root: 'C',  minor: 'Am',  major: 'C',  dom7: 'A7' },
    { root: 'G',  minor: 'Em',  major: 'G',  dom7: 'E7' },
    { root: 'D',  minor: 'Bm',  major: 'D',  dom7: 'B7' },
    { root: 'A',  minor: 'F#m', major: 'A',  dom7: 'F#7' },
    { root: 'E',  minor: 'C#m', major: 'E',  dom7: 'C#7' },
    { root: 'B',  minor: 'G#m', major: 'B',  dom7: 'G#7' },
    { root: 'F#', minor: 'Ebm', major: 'F#', dom7: 'Eb7' }
  ];

  const KEY_TO_COL_INDEX = {
    'C#': 0, 'Db': 0,
    'G#': 1, 'Ab': 1,
    'Eb': 2, 'D#': 2,
    'Bb': 3, 'A#': 3,
    'F':  4,
    'C':  5,
    'G':  6,
    'D':  7,
    'A':  8,
    'E':  9,
    'B':  10,
    'F#': 11, 'Gb': 11
  };

  // Authentic Guitar Voicings (MIDI notes)
  const CHORD_VOICINGS = {
    // Majors
    'C':   [48, 52, 55, 60, 64],       // C3, E3, G3, C4, E4
    'C#':  [49, 53, 56, 61, 65],       // C#3, F3, G#3, C#4, F4
    'D':   [50, 57, 62, 66],           // D3, A3, D4, F#4
    'Eb':  [51, 55, 58, 63, 67],       // Eb3, G3, Bb3, Eb4, G4
    'E':   [40, 47, 52, 56, 59, 64],   // E2, B2, E3, G#3, B3, E4
    'F':   [41, 48, 53, 57, 60, 65],   // F2, C3, F3, A3, C4, F4
    'F#':  [42, 49, 54, 58, 61, 66],   // F#2, C#3, F#3, A#3, C#4, F#4
    'G':   [43, 47, 50, 55, 59, 67],   // G2, B2, D3, G3, B3, G4
    'G#':  [44, 48, 51, 56, 60, 68],   // G#2, C3, D#3, G#3, C4, G#4
    'A':   [45, 52, 57, 61, 64],       // A2, E3, A3, C#4, E4
    'Bb':  [46, 53, 58, 62, 65],       // Bb2, F3, Bb3, D4, F4
    'B':   [47, 54, 59, 63, 66],       // B2, F#3, B3, D#4, F#4

    // Minors
    'Cm':  [48, 55, 60, 63, 67],       // C3, G3, C4, Eb4, G4
    'C#m': [49, 56, 61, 64, 68],       // C#3, G#3, C#4, E4, G#4
    'Dm':  [50, 57, 62, 65],           // D3, A3, D4, F4
    'Ebm': [51, 58, 63, 66, 70],       // Eb3, Bb3, Eb4, Gb4, Bb4
    'Em':  [40, 47, 52, 55, 59, 64],   // E2, B2, E3, G3, B3, E4
    'Fm':  [41, 48, 53, 56, 60, 65],   // F2, C3, F3, Ab3, C4, F4
    'F#m': [42, 49, 54, 57, 61, 66],   // F#2, C#3, F#3, A3, C#4, F#4
    'Gm':  [43, 46, 50, 55, 58, 67],   // G2, Bb2, D3, G3, Bb3, G4
    'G#m': [44, 51, 56, 59, 63, 68],   // G#2, D#3, G#3, B3, D#4, G#4
    'Am':  [45, 52, 57, 60, 64],       // A2, E3, A3, C4, E4
    'Bbm': [46, 53, 58, 61, 65],       // Bb2, F3, Bb3, Db4, F4
    'Bm':  [47, 54, 59, 62, 66],       // B2, F#3, B3, D4, F#4

    // Dominant 7ths
    'C7':  [48, 52, 58, 60, 64],       // C3, E3, Bb3, C4, E4
    'C#7': [49, 53, 59, 61, 65],       // C#3, F3, B3, C#4, F4
    'D7':  [50, 57, 60, 66],           // D3, A3, C4, F#4
    'Eb7': [51, 55, 61, 63, 67],       // Eb3, G3, Db4, Eb4, G4
    'E7':  [40, 47, 50, 56, 59, 64],   // E2, B2, D3, G#3, B3, E4
    'F7':  [41, 48, 51, 57, 60, 65],   // F2, C3, Eb3, A3, C4, F4
    'F#7': [42, 49, 52, 58, 61, 66],   // F#2, C#3, E3, A#3, C#4, F#4
    'G7':  [43, 47, 50, 53, 59, 67],   // G2, B2, D3, F3, B3, G4
    'G#7': [44, 48, 54, 56, 60, 68],   // G#2, C3, F#3, G#3, C4, G#4
    'A7':  [45, 52, 55, 61, 64],       // A2, E3, G3, C#4, E4
    'Bb7': [46, 53, 56, 62, 65],       // Bb2, F3, Ab3, D4, F4
    'B7':  [47, 51, 57, 59, 66]        // B2, D#3, A3, B3, F#4
  };

  // Authentic Ukulele Voicings (G C E A tuning, MIDI notes)
  const UKULELE_VOICINGS = {
    // Majors
    'C':   [67, 60, 64, 72],
    'C#':  [68, 61, 65, 73], 'Db':  [68, 61, 65, 73],
    'D':   [69, 62, 66, 74],
    'Eb':  [70, 63, 67, 75], 'D#':  [70, 63, 67, 75],
    'E':   [68, 64, 71, 76],
    'F':   [69, 60, 65, 69],
    'F#':  [70, 61, 66, 70], 'Gb':  [70, 61, 66, 70],
    'G':   [67, 62, 67, 71],
    'G#':  [68, 63, 68, 72], 'Ab':  [68, 63, 68, 72],
    'A':   [69, 61, 64, 69],
    'Bb':  [70, 62, 65, 70], 'A#':  [70, 62, 65, 70],
    'B':   [71, 63, 66, 71],

    // Minors
    'Cm':  [67, 60, 63, 72],
    'C#m': [68, 61, 64, 73], 'Dbm': [68, 61, 64, 73],
    'Dm':  [69, 62, 65, 69],
    'Ebm': [70, 63, 66, 70], 'D#m': [70, 63, 66, 70],
    'Em':  [67, 64, 67, 71],
    'Fm':  [68, 60, 65, 72],
    'F#m': [69, 61, 66, 73], 'Gbm': [69, 61, 66, 73],
    'Gm':  [67, 62, 67, 70],
    'G#m': [68, 63, 68, 71], 'Abm': [68, 63, 68, 71],
    'Am':  [69, 60, 64, 69],
    'Bbm': [70, 61, 65, 70], 'A#m': [70, 61, 65, 70],
    'Bm':  [71, 62, 66, 71],

    // Dominant 7ths
    'C7':  [67, 60, 64, 70],
    'C#7': [68, 61, 65, 71], 'Db7': [68, 61, 65, 71],
    'D7':  [69, 60, 66, 72],
    'Eb7': [70, 61, 67, 73], 'D#7': [70, 61, 67, 73],
    'E7':  [68, 62, 64, 71],
    'F7':  [69, 63, 65, 72],
    'F#7': [70, 64, 66, 73], 'Gb7': [70, 64, 66, 73],
    'G7':  [67, 62, 65, 71],
    'G#7': [68, 63, 66, 72], 'Ab7': [68, 63, 66, 72],
    'A7':  [67, 61, 64, 69],
    'Bb7': [68, 62, 65, 70], 'A#7': [68, 62, 65, 70],
    'B7':  [69, 63, 66, 71]
  };

  // State
  let audioCtx = null;
  let currentKeyRoot = 'C';
  let armedChord = 'C';
  let capoFret = 0;
  let bpmTempo = 70;
  let soundEngine = localStorage.getItem('zixel_jam_instrument') || 'acoustic'; // 'acoustic', 'piano', 'ukulele'
  let strumStyle = 'short';   // 'short' (ดีดสั้น), 'long' (ดีดยาว), 'arpeggio' (การเกา)
  let isSliding = false;
  let currentVirtualIdx = 17; // Key C in middle repeat (12 + 5)
  let normalizeTimeoutId = null;

  let isMetronomePlaying = false;
  let metronomeIntervalId = null;
  let currentMetronomeBeat = 0; // 0 (Beat 1 Downbeat), 1, 2, 3 in 4/4 meter

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ─── 2. Multi-Engine Voice Synthesizer (Acoustic Guitar, Piano, Ukulele) ───
  // Ported directly from chords.html / chords-page.js for studio-grade acoustic realism
  function playSingleNote(midi, timeOffset = 0, durationScale = 1.0, velocity = 1.0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime + timeOffset;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const isShort = strumStyle === 'short';
    const isArp = strumStyle === 'arpeggio';

    if (soundEngine === 'ukulele') {
      // 🪕 Authentic Hawaiian nylon-string acoustic timbre (from chords-page.js playUkuleleSound)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const decayTime = (isShort ? 0.6 : (isArp ? 1.8 : 1.6)) * durationScale;

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * (isArp ? 5.8 : 5.2), now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + (isShort ? 0.45 : 0.8));

      gain.gain.setValueAtTime(0.28 * velocity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + decayTime + 0.05);
      osc2.stop(now + decayTime + 0.05);
    } else if (soundEngine === 'piano') {
      // 🎹 Concert Grand Piano (from chords-page.js playPianoSound)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const decayTime = (isShort ? 0.8 : (isArp ? 2.6 : 2.4)) * durationScale;

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 6.0, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + (isShort ? 0.7 : 2.2));

      gain.gain.setValueAtTime(0.22 * velocity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + decayTime + 0.05);
      osc2.stop(now + decayTime + 0.05);
    } else {
      // 🎸 Steel/Bronze Acoustic Guitar (from chords-page.js playGuitarSound)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const decayTime = (isShort ? 0.75 : (isArp ? 2.4 : 2.0)) * durationScale;

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * (isArp ? 6.0 : 5.5), now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + (isArp ? 1.4 : 1.2));

      gain.gain.setValueAtTime(0.24 * velocity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + decayTime + 0.05);
      osc2.stop(now + decayTime + 0.05);
    }
  }

  // ─── 3. Chord Voicing & Strum Execution ───
  function playChord(chordName, direction = 'down') {
    armedChord = chordName;
    updateArmedChordDisplay();

    let midiNotes;
    if (soundEngine === 'ukulele') {
      midiNotes = UKULELE_VOICINGS[chordName] || UKULELE_VOICINGS['C'];
    } else {
      midiNotes = CHORD_VOICINGS[chordName] || CHORD_VOICINGS['C'];
    }

    const transposedNotes = midiNotes.map((n) => n + capoFret);
    const notesToPlay = direction === 'up' ? [...transposedNotes].reverse() : [...transposedNotes];

    if (strumStyle === 'arpeggio') {
      // 🎶 Realistic Fingerpicking Pattern (การเกาคอร์ด)
      // Plucks strings sequentially with natural acoustic fingerstyle timing & velocity
      const pickSpread = soundEngine === 'ukulele' ? 0.095 : (soundEngine === 'piano' ? 0.085 : 0.08);
      notesToPlay.forEach((midi, idx) => {
        const velocity = idx === 0 ? 1.08 : (idx === notesToPlay.length - 1 ? 0.95 : 0.9);
        playSingleNote(midi, idx * pickSpread, 1.25, velocity);
      });
    } else {
      let stringSpread;
      if (soundEngine === 'piano') {
        stringSpread = 0.015; // Natural piano rolled chord
      } else if (soundEngine === 'ukulele') {
        stringSpread = strumStyle === 'short' ? 0.014 : 0.028; // Ukulele strum timing
      } else {
        stringSpread = strumStyle === 'short' ? 0.018 : 0.034; // Guitar strum timing
      }

      notesToPlay.forEach((midi, idx) => {
        playSingleNote(midi, idx * stringSpread);
      });
    }

    vibrateStrings();
  }

  function strumOne() {
    playChord(armedChord, 'down');
  }

  function strumTwo() {
    playChord(armedChord, 'down');
    setTimeout(() => {
      playChord(armedChord, 'up');
    }, 140);
  }

  function vibrateStrings() {
    const stringLines = $$('.jam-string-line');
    stringLines.forEach((s, idx) => {
      setTimeout(() => {
        s.classList.add('vibrating');
        setTimeout(() => s.classList.remove('vibrating'), 200);
      }, idx * 25);
    });
  }

  // ─── 4. High-Precision Studio Metronome Engine ───
  function playMetronomeTick(isAccent) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Resonant fundamental tone (1600Hz for Beat 1 accent, 1000Hz for normal beats)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = isAccent ? 1600 : 1000;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const peak = isAccent ? 0.65 : 0.42;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isAccent ? 0.055 : 0.038));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);

    // 2. High-transient crisp wood click snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(isAccent ? 3200 : 2200, now);
    snapGain.gain.setValueAtTime(isAccent ? 0.38 : 0.22, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.015);
  }

  function startMetronome() {
    if (isMetronomePlaying) return;
    getAudioCtx();
    isMetronomePlaying = true;
    currentMetronomeBeat = 0;

    const metroBtn = $('#jamAutoStrumBtn');
    const metroText = $('#jamMetronomeBtnText');
    if (metroBtn) metroBtn.classList.add('active');
    if (metroText) metroText.textContent = 'ปิดเมโทรนอม';

    // Play downbeat 1 immediately
    playMetronomeTick(true);
    currentMetronomeBeat = 1;

    const beatIntervalMs = (60 / bpmTempo) * 1000;
    metronomeIntervalId = setInterval(() => {
      const isAccent = currentMetronomeBeat === 0;
      playMetronomeTick(isAccent);
      currentMetronomeBeat = (currentMetronomeBeat + 1) % 4;
    }, beatIntervalMs);
  }

  function stopMetronome() {
    isMetronomePlaying = false;
    if (metronomeIntervalId) {
      clearInterval(metronomeIntervalId);
      metronomeIntervalId = null;
    }
    const metroBtn = $('#jamAutoStrumBtn');
    const metroText = $('#jamMetronomeBtnText');
    if (metroBtn) metroBtn.classList.remove('active');
    if (metroText) {
      metroText.textContent = 'เปิดเมโทรนอม';
    } else if (metroBtn) {
      metroBtn.textContent = 'เปิดเมโทรนอม';
    }
  }

  function toggleMetronome() {
    if (isMetronomePlaying) stopMetronome();
    else startMetronome();
  }

  // ─── 4b. Next-Gen Instrument Stage & Jam Workspace Switcher ───
  function showLandingStage() {
    stopMetronome();
    const landingEl = $('#jamLandingView');
    const workspaceEl = $('#jamWorkspaceView');
    if (landingEl) landingEl.style.display = 'flex';
    if (workspaceEl) workspaceEl.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showJamWorkspace(instrument, playPreview = true) {
    if (instrument) {
      soundEngine = instrument;
      try {
        localStorage.setItem('zixel_jam_instrument', instrument);
      } catch (_) {}
    }

    const landingEl = $('#jamLandingView');
    const workspaceEl = $('#jamWorkspaceView');
    if (landingEl) landingEl.style.display = 'none';
    if (workspaceEl) workspaceEl.style.display = 'block';

    // Sync cockpit toolbar tabs
    $$('#jamWorkspaceView .instrument-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.inst === soundEngine);
    });

    // Update workspace title label
    const titleEl = $('#jamWorkspaceTitle');
    if (titleEl) {
      const names = { acoustic: 'กีต้าร์โปร่ง', piano: 'เปียโน', ukulele: 'อูคูเลเล่' };
      titleEl.textContent = `ห้องซ้อมดนตรีออนไลน์ — ${names[soundEngine] || 'กีต้าร์โปร่ง'}`;
    }

    // Ensure matrix centered correctly
    setKeyRoot(currentKeyRoot, false);

    if (playPreview) {
      getAudioCtx();
      playChord(armedChord || 'C', 'down');
    }
  }

  // ─── 5. Harmonic Matrix Dynamic Centering Engine (Dochord Architecture) ───
  function setupCircularTrack() {
    const track = $('#jamMatrixTrack');
    if (!track) return;
    const originalCols = Array.from(track.querySelectorAll('.jam-matrix-col'));
    if (originalCols.length !== 12) return;

    // Build Set 0 (0..11), Set 1 (12..23), Set 2 (24..35) for infinite circular sliding
    const set0 = originalCols.map((c) => c.cloneNode(true));
    const set2 = originalCols.map((c) => c.cloneNode(true));

    track.innerHTML = '';
    const allCols = [...set0, ...originalCols, ...set2];
    allCols.forEach((col, idx) => {
      col.dataset.virtualIdx = idx;
      track.appendChild(col);
    });

    // Attach chord cell handlers across all columns
    track.querySelectorAll('.jam-chord-cell').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const chord = cell.dataset.chord;

        cell.classList.add('playing');
        setTimeout(() => cell.classList.remove('playing'), 200);

        // Sync armed state across all identical chord cells in all sets
        $$('.jam-chord-cell').forEach((c) => c.classList.toggle('current-armed', c.dataset.chord === chord));
        playChord(chord);
      });
    });
  }

  function setTrackPosition(virtualIdx, smooth = true) {
    const track = $('#jamMatrixTrack');
    const viewport = $('#jamMatrixViewport');
    const centerFrame = $('#jamMatrixCenterFrame');
    if (!track || !viewport) return;

    const targetCol = track.querySelector(`.jam-matrix-col[data-virtual-idx="${virtualIdx}"]`);
    if (!targetCol) return;

    const colCenter = targetCol.offsetLeft + targetCol.offsetWidth / 2;
    const viewportCenter = viewport.clientWidth / 2;
    const targetTranslateX = viewportCenter - colCenter;

    track.style.transition = smooth ? 'transform 0.35s cubic-bezier(0.2, 0.9, 0.25, 1)' : 'none';
    track.style.transform = `translateX(${targetTranslateX}px)`;

    if (centerFrame && targetCol.offsetWidth) {
      const frameWidth = (targetCol.offsetWidth * 3) + (8 * 2) + 14;
      centerFrame.style.width = `${frameWidth}px`;
    }
  }

  function updateInKeyHighlight(virtualIdx) {
    const tonicColIdx = (virtualIdx % 12 + 12) % 12;
    const subdominantColIdx = (tonicColIdx - 1 + 12) % 12;
    const dominantColIdx = (tonicColIdx + 1) % 12;

    $$('.jam-matrix-col').forEach((col) => {
      const cIdx = parseInt(col.dataset.colIdx, 10);
      const isTonic = (cIdx === tonicColIdx);
      const inKey = (cIdx === tonicColIdx || cIdx === subdominantColIdx || cIdx === dominantColIdx);

      col.classList.toggle('in-key', inKey);
      col.classList.toggle('is-tonic', isTonic);

      col.querySelectorAll('.jam-chord-cell').forEach((cell) => {
        cell.classList.toggle('current-armed', cell.dataset.chord === armedChord);
      });
    });
  }

  function setKeyRoot(newKey, smooth = true) {
    const oldColIdx = KEY_TO_COL_INDEX[currentKeyRoot] ?? 5;
    const newColIdx = KEY_TO_COL_INDEX[newKey] ?? 5;

    let diff = (newColIdx - oldColIdx) % 12;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    currentKeyRoot = newKey;
    armedChord = newKey;

    // Update active key button in top bar
    $$('.jam-key-root-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.key === newKey);
    });

    updateArmedChordDisplay();

    currentVirtualIdx += diff;
    setTrackPosition(currentVirtualIdx, smooth);
    updateInKeyHighlight(currentVirtualIdx);

    clearTimeout(normalizeTimeoutId);
    normalizeTimeoutId = setTimeout(() => {
      const normalizedIdx = (currentVirtualIdx % 12 + 12);
      if (normalizedIdx !== currentVirtualIdx) {
        currentVirtualIdx = normalizedIdx;
        setTrackPosition(currentVirtualIdx, false);
      }
    }, 360);
  }

  function stepKey(direction = 1) {
    const currentColIdx = KEY_TO_COL_INDEX[currentKeyRoot] ?? 5;
    const targetColIdx = (currentColIdx + direction + 12) % 12;
    const targetKey = MATRIX_COLUMNS[targetColIdx].root;
    setKeyRoot(targetKey, true);
  }

  function updateArmedChordDisplay() {
    const badge = $('#jamCurrentChordDisplay');
    if (badge) {
      badge.textContent = armedChord;
    }
  }

  // ─── 6. BPM Slider Floating Thumb Badge ───
  function updateBpmThumbPosition(val) {
    const bpmSlider = $('#jamBpmSlider');
    const floatingBadge = $('#jamBpmFloatingBadge');
    if (!bpmSlider || !floatingBadge) return;

    const min = parseInt(bpmSlider.min, 10) || 40;
    const max = parseInt(bpmSlider.max, 10) || 200;
    const pct = Math.max(0, Math.min(1, (val - min) / (max - min)));

    const sliderWidth = bpmSlider.offsetWidth || 200;
    const thumbRadius = 17;
    const leftPx = thumbRadius + pct * (sliderWidth - thumbRadius * 2);

    floatingBadge.style.left = `${leftPx}px`;
    floatingBadge.textContent = val;
    bpmSlider.style.setProperty('--bpm-pct', `${(pct * 100).toFixed(2)}%`);
  }

  // ─── 7. Virtual Piano Synthesizer ───
  function playPianoKey(midi) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);
  }

  // ─── 8. Initialization & Event Binding ───
  function initJamWorkstation() {
    // 1. Build circular track and center initial key (Key C = virtual index 17)
    setupCircularTrack();
    currentVirtualIdx = 17;
    updateInKeyHighlight(currentVirtualIdx);

    setTimeout(() => {
      setTrackPosition(currentVirtualIdx, false);
      updateBpmThumbPosition(bpmTempo);
    }, 60);

    window.addEventListener('resize', () => {
      setTrackPosition(currentVirtualIdx, false);
      updateBpmThumbPosition(bpmTempo);
    });

    // 2. Key Selector Buttons
    $$('.jam-key-root-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setKeyRoot(btn.dataset.key, true);
      });
    });

    // 4. Capo Stepper
    const capoDecBtn = $('#jamCapoDec');
    const capoIncBtn = $('#jamCapoInc');
    const capoDisplay = $('#jamCapoDisplay');

    if (capoDecBtn && capoIncBtn && capoDisplay) {
      capoDecBtn.addEventListener('click', () => {
        if (capoFret > 0) {
          capoFret--;
          capoDisplay.textContent = capoFret;
        }
      });
      capoIncBtn.addEventListener('click', () => {
        if (capoFret < 7) {
          capoFret++;
          capoDisplay.textContent = capoFret;
        }
      });
    }

    // 5. BPM Slider
    const bpmSlider = $('#jamBpmSlider');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        bpmTempo = parseInt(e.target.value, 10);
        updateBpmThumbPosition(bpmTempo);
        if (isMetronomePlaying) {
          if (metronomeIntervalId) clearInterval(metronomeIntervalId);
          const beatIntervalMs = (60 / bpmTempo) * 1000;
          metronomeIntervalId = setInterval(() => {
            const isAccent = currentMetronomeBeat === 0;
            playMetronomeTick(isAccent);
            currentMetronomeBeat = (currentMetronomeBeat + 1) % 4;
          }, beatIntervalMs);
        }
      });
    }

    // 5b. Companion Tray Accordion Toggle
    const trayToggleBtn = $('#jamTrayToggleBtn');
    const trayContent = $('#jamCompanionTrayContent');
    if (trayToggleBtn && trayContent) {
      trayToggleBtn.addEventListener('click', () => {
        const isHidden = trayContent.classList.toggle('hidden');
        trayToggleBtn.classList.toggle('open', !isHidden);
      });
    }

    // 6. Next-Gen Instrument Stage & Cockpit Toolbar Wireup
    $$('#jamLandingView .inst-select-card').forEach((card) => {
      card.addEventListener('click', () => {
        showJamWorkspace(card.dataset.inst, true);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          showJamWorkspace(card.dataset.inst, true);
        }
      });
    });

    const backBtn = $('#jamBackToInstrumentsBtn');
    if (backBtn) {
      backBtn.addEventListener('click', showLandingStage);
    }

    const openInstBtn = $('#jamOpenInstrumentModalBtn');
    if (openInstBtn) {
      openInstBtn.addEventListener('click', showLandingStage);
    }

    $$('#jamWorkspaceView .instrument-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        showJamWorkspace(btn.dataset.inst, true);
      });
    });

    // Initial view: show Landing View so user chooses instrument first (like chords.html)
    showLandingStage();

    // 7. Strum Radio Pills
    $$('input[name="jamStrumRadio"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        strumStyle = e.target.value;
      });
    });

    // 8. Metronome Toggle
    const metronomeBtn = $('#jamAutoStrumBtn');
    if (metronomeBtn) {
      metronomeBtn.addEventListener('click', toggleMetronome);
    }

    // 9. Strum Action Deck (ONE, TWO, Master PLAY)
    const btnOne = $('#jamActionOne');
    if (btnOne) btnOne.addEventListener('click', strumOne);

    const btnTwo = $('#jamActionTwo');
    if (btnTwo) btnTwo.addEventListener('click', strumTwo);

    const masterPlayBtn = $('#jamMasterPlayBtn');
    if (masterPlayBtn) masterPlayBtn.addEventListener('click', toggleDrumSequencer);

    // 10. Interactive Virtual Guitar Strings
    const stringRack = $('#jamStringsRack');
    if (stringRack) {
      const stringMidis = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

      $$('.jam-string-line').forEach((line, idx) => {
        line.addEventListener('pointerenter', (e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') {
            line.classList.add('vibrating');
            setTimeout(() => line.classList.remove('vibrating'), 200);
            playSingleNote(stringMidis[idx] + capoFret);
          }
        });
        line.addEventListener('pointerdown', () => {
          line.classList.add('vibrating');
          setTimeout(() => line.classList.remove('vibrating'), 200);
          playSingleNote(stringMidis[idx] + capoFret);
        });
      });
    }

    // 11. Metronome Toolbar Button
    const metronomeNavBtn = $('#jamMetronomeNavBtn');
    if (metronomeNavBtn) {
      metronomeNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        drumGroove = 'metronome';
        toggleDrumSequencer();
      });
    }

    // 12. Companion Decks Toggle (Piano & Groove Select)
    const togglePianoBtn = $('#jamTogglePianoBtn');
    const pianoSection = $('#jamPianoSection');
    if (togglePianoBtn && pianoSection) {
      togglePianoBtn.addEventListener('click', () => {
        const isHidden = pianoSection.classList.toggle('hidden');
        togglePianoBtn.textContent = isHidden ? '🎹 แสดงเปียโนคีย์บอร์ด' : '🎹 ซ่อนเปียโนคีย์บอร์ด';
      });
    }

    // 13. Piano Keys pointerdown
    $$('#jamPianoKeys .jam-key').forEach((key) => {
      key.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const midi = parseInt(key.dataset.note, 10);
        key.classList.add('pressed');
        playPianoKey(midi);
      });
      key.addEventListener('pointerup', () => key.classList.remove('pressed'));
      key.addEventListener('pointerleave', () => key.classList.remove('pressed'));
    });

    // 14. Drum Groove Dropdown
    const grooveSelect = $('#jamGrooveSelect');
    if (grooveSelect) {
      grooveSelect.addEventListener('change', (e) => {
        drumGroove = e.target.value;
      });
    }

    // 15. Computer Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // If currently on Landing Stage, keys 1, 2, 3 select instrument and launch workspace
      const landingEl = $('#jamLandingView');
      if (landingEl && landingEl.style.display !== 'none') {
        if (e.key === '1') {
          e.preventDefault();
          showJamWorkspace('acoustic', true);
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          showJamWorkspace('piano', true);
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          showJamWorkspace('ukulele', true);
          return;
        }
        return; // Suppress chord shortcuts while on landing page
      }

      // Spacebar -> Strum
      if (e.code === 'Space') {
        e.preventDefault();
        strumOne();
        return;
      }

      // ArrowLeft / ArrowRight -> Shift Key smoothly
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepKey(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepKey(1);
        return;
      }

      // Keys 1-9 -> Play active 3×3 chords centered in key
      // 1: ii, 2: vi, 3: iii (top row minors)
      // 4: IV, 5: I (Tonic), 6: V (middle row majors)
      // 7: V/V, 8: V/ii, 9: V/vi (bottom row 7ths)
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const keyNum = parseInt(e.key, 10);
        const tonicVirtualIdx = currentVirtualIdx;
        const leftVirtualIdx = tonicVirtualIdx - 1;
        const rightVirtualIdx = tonicVirtualIdx + 1;

        const track = $('#jamMatrixTrack');
        const leftCol = track?.querySelector(`.jam-matrix-col[data-virtual-idx="${leftVirtualIdx}"]`);
        const centerCol = track?.querySelector(`.jam-matrix-col[data-virtual-idx="${tonicVirtualIdx}"]`);
        const rightCol = track?.querySelector(`.jam-matrix-col[data-virtual-idx="${rightVirtualIdx}"]`);
        const sortedActiveCols = [leftCol, centerCol, rightCol];

        const colIdx = (keyNum - 1) % 3;             // 1,4,7 -> 0 (left); 2,5,8 -> 1 (center); 3,6,9 -> 2 (right)
        const rowIdx = Math.floor((keyNum - 1) / 3); // 1-3 -> 0 (minor); 4-6 -> 1 (major); 7-9 -> 2 (dom7)

        const targetCol = sortedActiveCols[colIdx];
        if (targetCol) {
          const cells = targetCol.querySelectorAll('.jam-chord-cell');
          const targetCell = cells[rowIdx];
          if (targetCell) {
            targetCell.click();
          }
        }
        return;
      }

      // Key 'P' -> Toggle Metronome
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toggleMetronome();
        return;
      }

      // Piano Keys by QWERTY letter
      const pianoKeyEl = document.querySelector(`.jam-key[data-key="${e.key.toLowerCase()}"]`);
      if (pianoKeyEl && !pianoKeyEl.classList.contains('pressed')) {
        pianoKeyEl.classList.add('pressed');
        playPianoKey(parseInt(pianoKeyEl.dataset.note, 10));
      }
    });

    window.addEventListener('keyup', (e) => {
      const pianoKeyEl = document.querySelector(`.jam-key[data-key="${e.key.toLowerCase()}"]`);
      if (pianoKeyEl) pianoKeyEl.classList.remove('pressed');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJamWorkstation);
  } else {
    initJamWorkstation();
  }
})();
