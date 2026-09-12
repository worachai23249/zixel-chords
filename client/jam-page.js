/* ZIXEL CHORDS - DEDICATED VIRTUAL JAM STUDIO CONTROLLER */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const KEY_PRESETS = {
    c_major: {
      name: 'คีย์ C / Am',
      pads: [
        { chord: 'C', label: 'Major', num: '1' },
        { chord: 'G', label: 'Major', num: '2' },
        { chord: 'Am', label: 'Minor', num: '3' },
        { chord: 'F', label: 'Major', num: '4' },
        { chord: 'Em', label: 'Minor', num: '5' },
        { chord: 'Dm', label: 'Minor', num: '6' },
        { chord: 'E', label: 'Major', num: '7' },
        { chord: 'D', label: 'Major', num: '8' }
      ]
    },
    g_major: {
      name: 'คีย์ G / Em',
      pads: [
        { chord: 'G', label: 'Major', num: '1' },
        { chord: 'D', label: 'Major', num: '2' },
        { chord: 'Em', label: 'Minor', num: '3' },
        { chord: 'C', label: 'Major', num: '4' },
        { chord: 'Bm', label: 'Minor', num: '5' },
        { chord: 'Am', label: 'Minor', num: '6' },
        { chord: 'B', label: 'Major', num: '7' },
        { chord: 'A', label: 'Major', num: '8' }
      ]
    },
    d_major: {
      name: 'คีย์ D / Bm',
      pads: [
        { chord: 'D', label: 'Major', num: '1' },
        { chord: 'A', label: 'Major', num: '2' },
        { chord: 'Bm', label: 'Minor', num: '3' },
        { chord: 'G', label: 'Major', num: '4' },
        { chord: 'F#m', label: 'Minor', num: '5' },
        { chord: 'Em', label: 'Minor', num: '6' },
        { chord: 'F#', label: 'Major', num: '7' },
        { chord: 'E', label: 'Major', num: '8' }
      ]
    }
  };

  const CHORD_NOTES_MAP = {
    '': [0, 4, 7],
    'm': [0, 3, 7],
    '7': [0, 4, 7, 10],
    'maj7': [0, 4, 7, 11]
  };

  const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  let audioCtx = null;
  let jamSoundEngine = 'acoustic'; // acoustic, electric, piano
  let currentKeyPreset = 'c_major';

  let isDrumPlaying = false;
  let drumIntervalId = null;
  let currentDrumStep = 0;
  let drumBpm = 100;
  let drumGroove = 'metronome';
  let drumVolume = 0.8;

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

  // Polyphonic Piano Synth
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

  // Chord Pad Strumming
  function playChordPad(chordStr) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const match = /^([A-G][#b]?)(.*)$/.exec(chordStr);
    if (!match) return;
    const root = match[1];
    const qual = match[2] || '';

    const rootIdx = NOTE_STRINGS.indexOf(root);
    if (rootIdx === -1) return;
    const intervals = CHORD_NOTES_MAP[qual] || [0, 4, 7];

    const baseMidi = jamSoundEngine === 'piano' ? 48 : 45;
    const midiNotes = [
      baseMidi + rootIdx,
      baseMidi + rootIdx + intervals[1],
      baseMidi + rootIdx + intervals[2],
      baseMidi + 12 + rootIdx,
      baseMidi + 12 + rootIdx + intervals[1],
      baseMidi + 12 + rootIdx + intervals[2]
    ];

    midiNotes.forEach((midi, i) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + (i * 0.03);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      if (jamSoundEngine === 'electric') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.5, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      } else if (jamSoundEngine === 'piano') {
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      } else {
        // Acoustic guitar
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.1);
    });
  }

  // Drum Synthesizer
  function playDrumSound(type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      gain.gain.setValueAtTime(0.8 * drumVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'snare') {
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5 * drumVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      oscGain.gain.setValueAtTime(0.35 * drumVolume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hihat') {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25 * drumVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'click_hi' || type === 'click_lo') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(type === 'click_hi' ? 1200 : 800, now);
      gain.gain.setValueAtTime(0.4 * drumVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  function updateBeatVisualizer(step) {
    const dots = $$('.beat-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === step);
    });
  }

  function startDrumSequencer() {
    if (isDrumPlaying) return;
    isDrumPlaying = true;
    currentDrumStep = 0;

    const btn = $('#jamToggleBeatBtn');
    if (btn) {
      btn.classList.add('playing');
      $('#jamBeatIcon').textContent = '■';
      $('#jamBeatLabel').textContent = 'หยุดจังหวะ';
    }

    const stepDurationMs = (60 / drumBpm / 2) * 1000;

    drumIntervalId = setInterval(() => {
      const step = currentDrumStep % 8;
      updateBeatVisualizer(step);

      if (drumGroove === 'metronome') {
        if (step === 0) playDrumSound('click_hi');
        else if (step % 2 === 0) playDrumSound('click_lo');
      } else if (drumGroove === 'lofi') {
        if (step === 0 || step === 5) playDrumSound('kick');
        if (step === 2 || step === 6) playDrumSound('snare');
        playDrumSound('hihat');
      } else if (drumGroove === 'pop') {
        if (step === 0 || step === 4) playDrumSound('kick');
        if (step === 2 || step === 6) playDrumSound('snare');
        playDrumSound('hihat');
      } else if (drumGroove === 'rock') {
        if (step === 0 || step === 3 || step === 4) playDrumSound('kick');
        if (step === 2 || step === 6) playDrumSound('snare');
        playDrumSound('hihat');
      }
      currentDrumStep++;
    }, stepDurationMs);
  }

  function stopDrumSequencer() {
    isDrumPlaying = false;
    if (drumIntervalId) {
      clearInterval(drumIntervalId);
      drumIntervalId = null;
    }
    const btn = $('#jamToggleBeatBtn');
    if (btn) {
      btn.classList.remove('playing');
      $('#jamBeatIcon').textContent = '▶';
      $('#jamBeatLabel').textContent = 'เริ่มจังหวะ';
    }
    $$('.beat-dot').forEach((dot) => dot.classList.remove('active'));
  }

  function renderChordPads(presetKey) {
    const preset = KEY_PRESETS[presetKey];
    if (!preset) return;
    const padsWrap = $('#jamChordPads');
    if (!padsWrap) return;

    padsWrap.innerHTML = preset.pads.map((pad) => `
      <button type="button" class="jam-pad" data-chord="${pad.chord}" data-key="${pad.num}">
        <span class="key-hint-number" style="font-size:10px;opacity:0.4;font-family:var(--mono);margin-bottom:2px;">[${pad.num}]</span>
        <strong>${pad.chord}</strong>
        <span>${pad.label}</span>
      </button>
    `).join('');

    padsWrap.querySelectorAll('.jam-pad').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 250);
        playChordPad(btn.dataset.chord);
      });
    });
  }

  function initJamPage() {
    renderChordPads(currentKeyPreset);

    // Key Preset Buttons
    $$('.jam-key-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.jam-key-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentKeyPreset = btn.dataset.keyPreset;
        renderChordPads(currentKeyPreset);
      });
    });

    // Instrument Sound Engine Tabs
    $$('.jam-sound-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.jam-sound-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        jamSoundEngine = tab.dataset.sound;
      });
    });

    // Virtual Piano Keys click
    $$('#jamPianoKeys .jam-key').forEach((key) => {
      key.addEventListener('mousedown', () => {
        const midi = parseInt(key.dataset.note, 10);
        key.classList.add('pressed');
        playPianoKey(midi);
      });
      key.addEventListener('mouseup', () => key.classList.remove('pressed'));
      key.addEventListener('mouseleave', () => key.classList.remove('pressed'));
    });

    // Computer Keyboard Listener for Piano & Number Pads
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Piano Keys by letter
      const pianoKeyEl = document.querySelector(`.jam-key[data-key="${e.key.toLowerCase()}"]`);
      if (pianoKeyEl && !pianoKeyEl.classList.contains('pressed')) {
        pianoKeyEl.classList.add('pressed');
        playPianoKey(parseInt(pianoKeyEl.dataset.note, 10));
      }

      // Chord pads by number 1-8
      if (/^[1-8]$/.test(e.key)) {
        const padEl = document.querySelector(`.jam-pad[data-key="${e.key}"]`);
        if (padEl) {
          padEl.classList.add('pressed');
          setTimeout(() => padEl.classList.remove('pressed'), 200);
          playChordPad(padEl.dataset.chord);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const pianoKeyEl = document.querySelector(`.jam-key[data-key="${e.key.toLowerCase()}"]`);
      if (pianoKeyEl) pianoKeyEl.classList.remove('pressed');
    });

    // Drum Controls
    const grooveSelect = $('#jamGrooveSelect');
    if (grooveSelect) {
      grooveSelect.addEventListener('change', (e) => {
        drumGroove = e.target.value;
      });
    }

    const bpmSlider = $('#jamBpmSlider');
    const bpmDisplay = $('#jamBpmDisplay');
    if (bpmSlider && bpmDisplay) {
      bpmSlider.addEventListener('input', (e) => {
        drumBpm = parseInt(e.target.value, 10);
        bpmDisplay.textContent = drumBpm;
        if (isDrumPlaying) {
          stopDrumSequencer();
          startDrumSequencer();
        }
      });
    }

    const toggleBeatBtn = $('#jamToggleBeatBtn');
    if (toggleBeatBtn) {
      toggleBeatBtn.addEventListener('click', () => {
        if (isDrumPlaying) stopDrumSequencer();
        else startDrumSequencer();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJamPage);
  } else {
    initJamPage();
  }
})();
