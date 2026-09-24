/* ZIXEL CHORDS STUDIO PRO - APPLICATION LOGIC */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_EQUIVALENTS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORD_OPTIONS = ['N.C.'].concat(ROOTS, ROOTS.map(function (root) { return root + 'm'; }), ROOTS.map(function (root) { return root + '7'; }), ROOTS.map(function (root) { return root + 'maj7'; }), ROOTS.map(function (root) { return root + 'm7'; }), ROOTS.map(function (root) { return root + 'sus4'; }), ROOTS.map(function (root) { return root + 'dim'; }));

const GUITAR_SHAPES = {
  C: 'x32010', 'C#': 'x46664', Db: 'x46664', D: 'xx0232', 'D#': 'x68886', Eb: 'x68886', E: '022100',
  F: '133211', 'F#': '244322', G: '320003', Ab: '466544', A: 'x02220', Bb: 'x13331', B: 'x24442',
  Cm: 'x35543', 'C#m': 'x46654', Dm: 'xx0231', 'D#m': 'x68876', Em: '022000', Fm: '133111',
  'F#m': '244222', Gm: '355333', 'G#m': '466444', Am: 'x02210', 'A#m': 'x13321', Bm: 'x24432',
  C7: 'x32310', 'C#7': 'x4342x', D7: 'xx0212', 'D#7': 'x6564x', E7: '020100', F7: '131211',
  'F#7': '242322', G7: '320001', 'G#7': '464544', A7: 'x02020', 'A#7': 'x13131', B7: 'x21202',
  Cmaj7: 'x32000', 'C#maj7': 'x46564', Dmaj7: 'xx0222', 'D#maj7': 'x68786', Emaj7: '021100', Fmaj7: 'x33210',
  'F#maj7': '2x332x', Gmaj7: '320002', 'G#maj7': '4x554x', Amaj7: 'x02120', 'A#maj7': 'x13231', Bmaj7: 'x24342',
  Cm7: 'x35343', 'C#m7': 'x46454', Dm7: 'xx0211', 'D#m7': 'x68676', Em7: '020000', Fm7: '131111',
  'F#m7': '242222', Gm7: '353333', 'G#m7': '464444', Am7: 'x02010', 'A#m7': 'x13121', Bm7: 'x20202',
  Csus4: 'x33010', 'C#sus4': 'x46674', Dsus4: 'xx0233', 'D#sus4': 'x68896', Esus4: '022200', Fsus4: '133311',
  'F#sus4': '244422', Gsus4: '320013', 'G#sus4': '466644', Asus4: 'x02230', 'A#sus4': 'x13341', Bsus4: 'x24452',
  Cdim: 'xx1212', 'C#dim': 'xx2323', Ddim: 'xx0101', 'D#dim': 'xx1212', Edim: 'xx2323', Fdim: 'xx0101',
  'F#dim': 'xx1212', Gdim: 'xx2323', 'G#dim': 'xx0101', Adim: 'xx1212', 'A#dim': 'xx2323', Bdim: 'x2343x'
};
const UKULELE_SHAPES = {
  C: '0003', 'C#': '1114', Db: '1114', D: '2220', 'D#': '3331', Eb: '3331', E: '4442',
  F: '2010', 'F#': '3121', G: '0232', Ab: '1343', A: '2100', Bb: '3211', B: '4322',
  Cm: '0333', 'C#m': '1104', Dm: '2210', 'D#m': '3321', Em: '0432', Fm: '1013',
  'F#m': '2120', Gm: '0231', 'G#m': '1342', Am: '2000', 'A#m': '3111', Bm: '4222',
  C7: '0001', 'C#7': '1112', D7: '2020', 'D#7': '3334', E7: '1202', F7: '2310',
  'F#7': '3424', G7: '0212', 'G#7': '1223', A7: '0100', 'A#7': '1211', B7: '2322',
  Cmaj7: '0002', 'C#maj7': '1113', Dmaj7: '2224', 'D#maj7': '3335', Emaj7: '1442', Fmaj7: '5500',
  'F#maj7': '3524', Gmaj7: '0222', 'G#maj7': '1333', Amaj7: '1100', 'A#maj7': '3210', Bmaj7: '3322',
  Cm7: '3333', 'C#m7': '1102', Dm7: '2213', 'D#m7': '3324', Em7: '0202', Fm7: '1313',
  'F#m7': '2120', Gm7: '0211', 'G#m7': '1322', Am7: '0000', 'A#m7': '1111', Bm7: '2222',
  Csus4: '0013', 'C#sus4': '1124', Dsus4: '0230', 'D#sus4': '1341', Esus4: '2402', Fsus4: '3011',
  'F#sus4': '4122', Gsus4: '0233', 'G#sus4': '1344', Asus4: '2200', 'A#sus4': '3311', Bsus4: '4422'
};

const $ = function (selector) { return document.querySelector(selector); };
const state = {
  source: 'mp3',
  song: null,
  player: $('#audioPlayer'),
  audioUrl: null,
  transpose: 0,
  selectedBeat: null,
  reviewMode: false,
  playingTimer: null,
  loop: { a: null, b: null, enabled: false },
  engineReady: false,
  modelsReady: false,
  instrument: 'guitar',
  viewMode: 'lyrics',
  stageMode: false,
  metronome: { enabled: false, audioCtx: null, nextBeat: null },
  // Pitch shift state (Up Tempo style) — changes actual audio pitch via Web Audio API
  pitchShift: 0,
  speed: 1.0,
  pitchCtx: null,       // AudioContext
  pitchSource: null,    // MediaElementSourceNode
  pitchShifter: null,   // Jungle granular pitch shifter
  pitchGain: null,      // GainNode
  // Stem Mixer state (Moises style)
  stemSession: null,    // active separation sessionId
  stemAudios: {},       // { vocals: AudioElement, drums: AudioElement, ... }
  stemMuted: {},        // { vocals: false, drums: false, ... }
  stemSoloed: null,     // which stem is soloed (or null)
  stemVolumes: {},      // { vocals: 1.0, drums: 1.0, ... }
  simplifiedChords: false,
  syncOffset: 0,        // Sync calibration offset in seconds (e.g. -0.05, +0.05)
  currentUser: null,
  authToken: (function () { try { return localStorage.getItem('zc_auth_token') || null; } catch (_) { return null; } })()
};

// Persistent Server Library & Audio Management
async function listSongs() {
  const list = $('#libraryList');
  if (!list) return;
  try {
    const res = await fetch('/api/library', { cache: 'no-store' });
    if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลแฟ้มเพลงได้');
    const songs = await res.json();
    list.replaceChildren();
    if (!songs || songs.length === 0) {
      list.innerHTML = '<p class="library-empty">ยังไม่มีเพลงที่บันทึกไว้ เพลงที่คุณวิเคราะห์จะถูกบันทึกอัตโนมัติที่นี่</p>';
      return;
    }
    songs.forEach(function(song) {
      const div = document.createElement('div');
      div.className = 'library-item';
      const stemBadge = song.hasStems ? '<span class="lib-stem-badge">แยก 4 แทร็กแล้ว</span>' : '';
      div.innerHTML = '<div><strong>' + song.title + '</strong> ' + stemBadge + '<br><span>' + (song.key || 'Key —') + ' · ' + (song.bpm ? song.bpm + ' BPM' : '') + '</span></div>';
      
      const actions = document.createElement('div');
      const playBtn = document.createElement('button');
      playBtn.className = 'library-btn-play';
      playBtn.textContent = '▶ เปิดในสตูดิโอ';
      playBtn.onclick = function() { loadSong(song.id); };
      
      const delBtn = document.createElement('button');
      delBtn.className = 'library-btn-del';
      delBtn.title = 'ลบออกจากแฟ้มเพลง';
      delBtn.textContent = '✕';
      delBtn.onclick = function() { deleteSong(song.id); };
      
      actions.append(playBtn, delBtn);
      div.append(actions);
      list.append(div);
    });
  } catch (e) {
    list.innerHTML = '<p class="library-empty">ไม่สามารถเชื่อมต่อแฟ้มเพลงได้: ' + (e.message || '') + '</p>';
  }
}

async function loadSong(songId) {
  try {
    const res = await fetch('/api/library/' + encodeURIComponent(songId), { cache: 'no-store' });
    if (!res.ok) throw new Error('ไม่พบข้อมูลเพลงในแฟ้ม');
    const song = await res.json();
    state.song = normaliseAnalysis(song, { name: song.title });

    // Mount persistent audio file directly
    mountAudioUrl('/api/library/' + encodeURIComponent(songId) + '/audio', song.title);

    state.transpose = 0;
    state.selectedBeat = null;
    state.syncOffset = 0;
    updateSyncOffsetUI();
    setReviewMode(false);
    $('#workspace').classList.remove('hidden');
    renderSong();

    // If song has separated stems, initialize mixer immediately
    if (song.hasStems && song.stems && song.stems.length > 0) {
      initStemsFromLibrary(songId, song.stems, song.absentStems);
    } else {
      clearStemSession();
    }

    showToast('เปิดเพลง ' + song.title + ' เรียบร้อยแล้ว (พร้อมเล่นและมิกซ์ทันที)');
    $('#libraryPanel').classList.add('hidden');
    $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showToast('เปิดเพลงไม่สำเร็จ: ' + e.message);
  }
}

async function deleteSong(songId) {
  try {
    await fetch('/api/library/' + encodeURIComponent(songId), { method: 'DELETE' });
    listSongs();
    showToast('ลบเพลงออกจากแฟ้มแล้ว');
  } catch (e) {
    showToast('ลบเพลงไม่สำเร็จ');
  }
}

function saveSong(songObj) {
  // Library is now automatically persisted on server!
  listSongs();
}

function initStemsFromLibrary(songId, stemsList, absentStems) {
  if (!stemsList || stemsList.length === 0) return;
  // Cleanup old stems
  Object.values(state.stemAudios).forEach(function (a) { try { a.pause(); a.src = ''; } catch (e) {} });
  state.stemAudios = {};
  state.stemMuted = {};
  state.stemSoloed = null;
  state.stemVolumes = {};
  state.stemSession = 'lib_' + songId;

  // Create audio elements for each stem directly pointing to persistent library files
  stemsList.forEach(function (stem) {
    const audio = new Audio();
    audio.src = '/api/library/' + encodeURIComponent(songId) + '/stems/' + encodeURIComponent(stem);
    audio.preload = 'auto';
    audio.volume = 1.0;
    audio.playbackRate = state.player.playbackRate;
    state.stemAudios[stem] = audio;
    state.stemMuted[stem] = false;
    state.stemVolumes[stem] = 1.0;
    routeStemToPitchNode(audio);
  });

  // Default to Master original audio for pristine fidelity & zero latency!
  // Stems only take over when the user mutes, solos, or adjusts a stem slider.
  if (state.player) {
    state.player.muted = false;
  }

  renderStemMixer(stemsList, absentStems);

  const idleState = $('#stemIdleState');
  const loadingState = $('#stemLoadingState');
  const tracksState = $('#stemTracksState');
  if (idleState) idleState.classList.add('hidden');
  if (loadingState) loadingState.classList.add('hidden');
  if (tracksState) tracksState.classList.remove('hidden');
  setText('#stemMixerStatus', ' — ตรวจพบ ' + stemsList.length + ' ชิ้นดนตรี');

  const sepBtn = $('#stemSeparateButton');
  if (sepBtn) {
    sepBtn.innerHTML = '<span>✓</span> มิกซ์ ' + stemsList.length + ' แทร็กพร้อมแล้ว';
    sepBtn.classList.remove('loading');
  }
}

function mountAudioUrl(url, songTitle) {
  clearAudio();
  state.audioUrl = url;
  state.player.src = url;
  state.speed = 1;
  state.player.playbackRate = 1;
  ensurePitchPreserved(state.player);
  state.player.onloadedmetadata = function () {
    if (state.song && !Number.isFinite(state.song.duration)) state.song.duration = state.player.duration;
    updatePlayback(0);
  };
  state.player.ontimeupdate = function () { updatePlayback(state.player.currentTime); };
  state.player.onseeking = function () {
    const t = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
  };
  state.player.onseeked = function () {
    const t = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
  };
  state.player.onplay = startTicker;
  state.player.onpause = stopTicker;
  state.player.onended = stopTicker;
  initPitchCtx();
  if (songTitle) setText('#audioFileName', songTitle);
}

// Initial fetch of library
listSongs();

function setText(selector, text) { const el = $(selector); if (el) el.textContent = text; }
function populateChordOptions() {
  const select = $('#editChord');
  if (!select) return;
  select.replaceChildren();
  CHORD_OPTIONS.forEach(function (chord) {
    const option = document.createElement('option');
    option.value = chord;
    option.textContent = chord;
    select.append(option);
  });
}
function selectChordValue(chord) {
  const select = $('#editChord');
  if (!select) return;
  const value = normalizeChord(chord);
  if (!Array.from(select.options).some(function (option) { return option.value === value; })) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value + ' (จาก AI)';
    select.prepend(option);
  }
  select.value = value;
}
function formatTime(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return String(Math.floor(seconds / 60)) + ':' + String(seconds % 60).padStart(2, '0');
}
function normalizeChord(chord) {
  if (!chord || chord === 'N' || chord === 'X' || chord === 'N.C.' || chord === 'no_chord') return 'N.C.';
  return String(chord).trim().replace(/:maj(?=\d)/i, 'maj').replace(/:maj$/i, '').replace(/:min(?=\d)/i, 'm').replace(/:min$/i, 'm').replace(/:/g, '').replace(/min/ig, 'm');
}
function simplifyChord(chord) {
  if (!chord || chord === 'N.C.' || chord === '—') return chord;
  const m = /^([A-G][#b]?)(.*)/.exec(chord.trim());
  if (!m) return chord;
  const root = m[1];
  const ext = m[2];
  if (/m(?!aj)/i.test(ext) || /min/i.test(ext)) {
    return root + 'm';
  }
  if (/dim/i.test(ext)) {
    return root + 'dim';
  }
  if (/aug/i.test(ext)) {
    return root + 'aug';
  }
  return root;
}
function transposeChord(chord, amount) {
  if (!chord || chord === 'N.C.' || chord === '—') return chord;
  let targetChord = chord;
  if (state && state.simplifiedChords) {
    targetChord = simplifyChord(targetChord);
  }
  if (!amount) return targetChord;
  return targetChord.replace(/^([A-G])([#b]?)/, function (_, root, accidental) {
    const note = FLAT_EQUIVALENTS[root + accidental] || root + accidental;
    const index = NOTE_NAMES.indexOf(note);
    return index < 0 ? root + accidental : NOTE_NAMES[(index + amount + 120) % 12];
  });
}
function transposeKey(key, amount) {
  const match = /^([A-G])([#b]?)(.*)$/.exec(key || '');
  return match ? transposeChord(match[1] + match[2], amount) + match[3] : key || '—';
}
function chordAt(time) {
  const effTime = Math.max(0, time + (state.syncOffset || 0));
  const beats = state.song ? state.song.beats : [];
  let result = beats[0] || { chord: 'N.C.', time: 0, index: 0 };
  beats.forEach(function (beat) { if (beat.time <= effTime + 0.01) result = beat; });
  return result;
}
function nextChordAfter(time) {
  const effTime = Math.max(0, time + (state.syncOffset || 0));
  const current = chordAt(time).chord;
  const next = state.song.beats.find(function (beat) { return beat.time > effTime && beat.chord !== current && beat.chord !== 'N.C.'; });
  return next ? next.chord : '—';
}
function getPreviousBeat(time) {
  return state.song.beats.filter(function (beat) { return beat.time < time - 0.02; }).at(-1);
}
function getNextBeat(time) {
  return state.song.beats.find(function (beat) { return beat.time > time + 0.02; });
}
function calculateCapo(transpose) {
  if (transpose === 0) return 'Capo: ไม่มี (เล่นคีย์จริง)';
  let capo = transpose < 0 ? Math.abs(transpose) : 12 - transpose;
  if (capo > 7) return 'Capo: ไม่มี (แนะนำปรับฟอร์มคอร์ด)';
  const formOffset = transpose > 0 ? -transpose : Math.abs(transpose);
  return 'Capo ช่อง ' + capo + ' (เล่นฟอร์ม ' + (formOffset > 0 ? '+' + formOffset : formOffset) + ')';
}
function playMetronomeClick(isDownbeat) {
  try {
    if (!state.metronome.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.metronome.audioCtx = new AudioContext();
    }
    const ctx = state.metronome.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = Number($('#metronomeVolume').value) || 0.5;
    osc.type = 'sine';
    osc.frequency.value = isDownbeat ? 1200 : 800;
    gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════
//  PITCH SHIFT — AudioWorklet + Rubber Band (WASM) & SoundTouch Fallback
//  Studio-grade phase-vocoder pitch shifting on dedicated real-time audio thread!
// ═══════════════════════════════════════════════════════════
function ensurePitchPreserved(audio) {
  if (!audio) return;
  try {
    audio.preservesPitch = true;
    audio.mozPreservesPitch = true;
    audio.webkitPreservesPitch = true;
  } catch (e) {}
}

function initPitchCtx() {
  if (state.pitchCtx) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.pitchCtx = new AudioCtx();

    // Input bus: all playback sources (player & stems) connect here
    state.pitchInputBus = state.pitchCtx.createGain();
    state.pitchSource = state.pitchCtx.createMediaElementSource(state.player);
    state.pitchSource.connect(state.pitchInputBus);

    // Bypass & Wet buses for instantaneous, glitch-free switching
    state.bypassGain = state.pitchCtx.createGain();
    state.wetGain = state.pitchCtx.createGain();
    state.pitchGain = state.pitchCtx.createGain();
    state.pitchGain.gain.value = 1.0;

    const isShifted = Boolean(state.pitchShift && state.pitchShift !== 0);
    state.bypassGain.gain.value = isShifted ? 0.0 : 1.0;
    state.wetGain.gain.value = isShifted ? 1.0 : 0.0;

    // Connect: InputBus -> Bypass -> PitchGain -> Destination
    state.pitchInputBus.connect(state.bypassGain);
    state.bypassGain.connect(state.pitchGain);
    state.wetGain.connect(state.pitchGain);
    state.pitchGain.connect(state.pitchCtx.destination);

    // Fallback: SoundTouch WSOLA script processor
    const bufferSize = 4096;
    state.pitchNode = state.pitchCtx.createScriptProcessor(bufferSize, 2, 2);

    if (typeof window.SoundTouch !== 'undefined') {
      state.soundTouch = new window.SoundTouch();
      if (state.soundTouch.stretch && typeof state.soundTouch.stretch.setParameters === 'function') {
        state.soundTouch.stretch.setParameters(state.pitchCtx.sampleRate || 44100, 0, 0, 8);
      }
      state.soundTouch.pitchSemitones = state.pitchShift || 0;
    }

    const interleavedIn = new Float32Array(bufferSize * 2);
    let fifo = new Float32Array(bufferSize * 8);
    let fifoCount = 0;

    state.clearPitchBuffer = function () {
      if (state.soundTouch) {
        try { state.soundTouch.clear(); } catch (e) {}
      }
      fifo.fill(0);
      fifoCount = 0;
    };

    state.pitchNode.onaudioprocess = function (e) {
      const inL = e.inputBuffer.getChannelData(0);
      const inR = e.inputBuffer.getChannelData(1);
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);

      if (!state.pitchShift || !state.soundTouch) {
        outL.set(inL);
        outR.set(inR);
        fifoCount = 0;
        return;
      }

      for (let i = 0; i < bufferSize; i++) {
        interleavedIn[i * 2] = inL[i];
        interleavedIn[i * 2 + 1] = inR[i];
      }

      state.soundTouch.inputBuffer.putSamples(interleavedIn, 0, bufferSize);
      state.soundTouch.process();

      const avail = state.soundTouch.outputBuffer.frameCount;
      if (avail > 0) {
        const neededSize = fifoCount + avail * 2;
        if (neededSize > fifo.length) {
          const newFifo = new Float32Array(Math.max(neededSize + bufferSize * 4, fifo.length * 2));
          newFifo.set(fifo.subarray(0, fifoCount));
          fifo = newFifo;
        }
        state.soundTouch.outputBuffer.receiveSamples(fifo.subarray(fifoCount), avail);
        fifoCount += avail * 2;
      }

      const need = bufferSize * 2;
      if (fifoCount >= need) {
        for (let i = 0; i < bufferSize; i++) {
          outL[i] = fifo[i * 2];
          outR[i] = fifo[i * 2 + 1];
        }
        fifo.copyWithin(0, need, fifoCount);
        fifoCount -= need;
      } else {
        outL.fill(0);
        outR.fill(0);
      }

      const maxFifo = bufferSize * 4;
      if (fifoCount > maxFifo) {
        fifo.copyWithin(0, fifoCount - maxFifo, fifoCount);
        fifoCount = maxFifo;
      }
    };

    // Connect SoundTouch scriptProcessor to wet path initially as fallback
    state.pitchInputBus.connect(state.pitchNode);
    state.pitchNode.connect(state.wetGain);

    // Upgrade to AudioWorklet + Rubber Band (WASM) on dedicated real-time audio thread
    if (state.pitchCtx.audioWorklet) {
      state.pitchCtx.audioWorklet.addModule('./rubberband-processor.js').then(function () {
        try {
          const rbNode = new AudioWorkletNode(state.pitchCtx, 'rubberband-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2]
          });
          rbNode.setPitch = function (pitchRatio) {
            rbNode.port.postMessage(JSON.stringify(['pitch', pitchRatio]));
          };
          rbNode.setHighQuality = function (hq) {
            rbNode.port.postMessage(JSON.stringify(['quality', hq]));
          };
          rbNode.setHighQuality(true);

          // Disconnect fallback ScriptProcessor from wet path
          try {
            state.pitchInputBus.disconnect(state.pitchNode);
            state.pitchNode.disconnect(state.wetGain);
          } catch (e) {}

          // Route wet audio through Rubber Band AudioWorkletNode
          state.pitchInputBus.connect(rbNode);
          rbNode.connect(state.wetGain);

          state.rubberBandNode = rbNode;
          state.dspEngine = 'rubberband';
          console.log('[Web Audio DSP] 🚀 Rubber Band AudioWorklet (WASM) active on real-time audio thread.');

          if (state.pitchShift) {
            rbNode.setPitch(Math.pow(2, state.pitchShift / 12));
          }
        } catch (nodeErr) {
          console.warn('[Web Audio DSP] Rubber Band WorkletNode fallback:', nodeErr.message);
        }
      }).catch(function (moduleErr) {
        console.warn('[Web Audio DSP] Rubber Band module load fallback:', moduleErr.message);
      });
    }

    ensurePitchPreserved(state.player);

    // Route any existing stem audios through pitchInputBus
    if (state.stemAudios) {
      Object.values(state.stemAudios).forEach(routeStemToPitchNode);
    }
  } catch (e) {
    console.warn('Pitch AudioContext init failed:', e.message);
  }
}

function routeStemToPitchNode(audio) {
  if (!audio) return;
  audio.crossOrigin = 'anonymous';
  if (!state.pitchCtx) initPitchCtx();
  if (!state.pitchCtx || !state.pitchInputBus) return;
  if (audio._pitchSource) return;
  try {
    const src = state.pitchCtx.createMediaElementSource(audio);
    src.connect(state.pitchInputBus);
    audio._pitchSource = src;
  } catch (err) {}
}

function applyPitchShift(semitones) {
  if (!state.player) return;
  try {
    if (!state.pitchCtx) initPitchCtx();
    if (state.pitchCtx && state.pitchCtx.state === 'suspended') {
      state.pitchCtx.resume().catch(function () {});
    }
  } catch (e) {}

  ensurePitchPreserved(state.player);
  Object.values(state.stemAudios).forEach(ensurePitchPreserved);

  // Seamless bypass / wet switching
  if (state.bypassGain && state.wetGain && state.pitchCtx) {
    const now = state.pitchCtx.currentTime;
    if (semitones === 0) {
      state.bypassGain.gain.setValueAtTime(1.0, now);
      state.wetGain.gain.setValueAtTime(0.0, now);
      if (typeof state.clearPitchBuffer === 'function') {
        state.clearPitchBuffer();
      }
    } else {
      state.bypassGain.gain.setValueAtTime(0.0, now);
      state.wetGain.gain.setValueAtTime(1.0, now);
    }
  }

  // 1. Rubber Band AudioWorklet (WASM)
  if (state.rubberBandNode && typeof state.rubberBandNode.setPitch === 'function') {
    const pitchRatio = Math.pow(2, semitones / 12);
    state.rubberBandNode.setPitch(pitchRatio);
  }

  // 2. SoundTouch WSOLA fallback
  if (state.soundTouch) {
    state.soundTouch.pitchSemitones = semitones;
    if (semitones === 0 && typeof state.clearPitchBuffer === 'function') {
      state.clearPitchBuffer();
    }
  }
}

function setPitchShift(semitones) {
  state.pitchShift = Math.max(-12, Math.min(12, semitones));
  applyPitchShift(state.pitchShift);
  const el = $('#pitchValue');
  if (el) {
    el.textContent = (state.pitchShift > 0 ? '+' : '') + state.pitchShift + ' st';
    el.classList.toggle('active-shift', state.pitchShift !== 0);
  }
  if (state.pitchShift !== 0) {
    showToast((state.pitchShift > 0 ? '↑ เพิ่มเสียง ' : '↓ ลดเสียง ') + Math.abs(state.pitchShift) + ' ครึ่งเสียง (' + (state.pitchShift > 0 ? '+' : '') + state.pitchShift + ' st)');
  } else {
    showToast('คืนเสียงต้นฉบับแล้ว (0 st)');
  }
}

// ═══════════════════════════════════════════════════════════
//  STEM MIXER — Moises style
// ═══════════════════════════════════════════════════════════
const STEM_META = {
  vocals:      { icon: '✦', label: 'เสียงร้อง (Vocals)' },
  guitar:      { icon: '🎸', label: 'กีตาร์ (Guitar)' },
  solo_guitar: { icon: '🎸⚡', label: 'กีตาร์โซโล่ (Solo Guitar)' },
  piano:       { icon: '🎹', label: 'เปียโน / คีย์บอร์ด (Piano/Keys)' },
  bass:        { icon: '🎸', label: 'เบส (Bass)' },
  drums:       { icon: '🥁', label: 'กลอง (Drums)' },
  synth:       { icon: '🎛️', label: 'ซินธ์ / คีย์บอร์ด (Synth)' },
  strings:     { icon: '🎻', label: 'เครื่องสาย (Strings)' }
};

async function startStemSeparation() {
  if (!state.song || !state.audioUrl) {
    showToast('กรุณาเปิดไฟล์เพลงก่อน');
    return;
  }
  const btn = $('#stemSeparateButton');
  const startBtn = $('#stemStartBtn');
  const idleState = $('#stemIdleState');
  const loadingState = $('#stemLoadingState');
  const tracksState = $('#stemTracksState');

  // Switch to stems view
  setViewMode('stems');

  // Show loading
  if (idleState) idleState.classList.add('hidden');
  if (loadingState) loadingState.classList.remove('hidden');
  if (tracksState) tracksState.classList.add('hidden');
  if (btn) btn.classList.add('loading');
  if (startBtn) startBtn.disabled = true;
  setText('#stemMixerStatus', ' — กำลังแยกแทร็กเสียง…');

  try {
    // Fetch the original file and send to /api/separate
    const audioResp = await fetch(state.audioUrl);
    const audioBlob = await audioResp.blob();
    const fileName = (state.song.title || 'audio') + '.wav';
    const formData = new FormData();
    formData.append('audio', audioBlob, fileName);

    setText('#stemLoadingText', 'กำลังส่งไฟล์ไปยัง AI engine…');
    const headers = { 'x-chordtube-noncommercial': 'true' };
    if (state.song && state.song.id) {
      headers['x-chordtube-song-id'] = state.song.id;
    }
    const sepResp = await fetch('/api/separate', {
      method: 'POST',
      headers: headers,
      body: formData
    });
    const sepResult = await sepResp.json().catch(function () { return {}; });
    if (!sepResp.ok) throw new Error(sepResult.error || 'แยกเสียงไม่สำเร็จ');

    setText('#stemLoadingText', 'กำลังโหลดแทร็กเสียง…');

    const availableStems = sepResult.stems || [];
    const absentStems = sepResult.absentStems || [];

    if (state.song && state.song.id) {
      state.song.hasStems = true;
      state.song.stems = availableStems;
      state.song.absentStems = absentStems;
      state.song.stemPresence = sepResult.stemPresence || {};
      initStemsFromLibrary(state.song.id, availableStems, absentStems);
      listSongs();
      showToast('แยกแทร็กเสียงสำเร็จ! ตรวจพบ ' + availableStems.length + ' ชิ้นดนตรี');
      return;
    }

    // Cleanup old session
    if (state.stemSession) {
      fetch('/api/stems/' + state.stemSession, { method: 'DELETE' }).catch(function () {});
    }
    Object.values(state.stemAudios).forEach(function (a) { try { a.pause(); a.src = ''; } catch (e) {} });
    state.stemAudios = {};
    state.stemMuted = {};
    state.stemSoloed = null;
    state.stemVolumes = {};
    state.stemSession = sepResult.sessionId;

    // Create audio elements for each stem
    for (const stem of availableStems) {
      const audio = new Audio();
      audio.src = '/api/stems/' + sepResult.sessionId + '/' + stem;
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.playbackRate = state.player.playbackRate;
      // Sync with main player
      audio.addEventListener('canplay', function () {}, { once: true });
      state.stemAudios[stem] = audio;
      state.stemMuted[stem] = false;
      state.stemVolumes[stem] = 1.0;
      routeStemToPitchNode(audio);
    }

    // 100% PREVENT SOUND DOUBLING: When stems are active, mute master player!
    if (state.player) {
      state.player.muted = true;
    }

    // Render mixer UI
    renderStemMixer(availableStems, absentStems);

    // Show tracks
    if (loadingState) loadingState.classList.add('hidden');
    if (tracksState) tracksState.classList.remove('hidden');
    setText('#stemMixerStatus', ' — ตรวจพบ ' + availableStems.length + ' ชิ้นดนตรี');
    showToast('แยกแทร็กเสียงสำเร็จ! ' + availableStems.length + ' tracks พร้อมแล้ว');
  } catch (error) {
    console.error('[Stem Separation]:', error.message);
    if (idleState) idleState.classList.remove('hidden');
    if (loadingState) loadingState.classList.add('hidden');
    setText('#stemMixerStatus', ' — เกิดข้อผิดพลาด');
    showToast('แยกเสียงไม่สำเร็จ: ' + (error.message || 'ลองใหม่อีกครั้ง'));
  } finally {
    if (btn) btn.classList.remove('loading');
    if (startBtn) startBtn.disabled = false;
  }
}

function renderStemMixer(stems, absentStems) {
  const container = $('#stemTracks');
  if (!container) return;
  container.replaceChildren();

  // Only show detected instruments that actually exist
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'stem-detected-summary';
  const detectedLabels = stems.map(function (s) {
    const meta = STEM_META[s];
    return meta ? meta.label.split(' ')[0] : s;
  }).join(', ');

  summaryDiv.innerHTML = '<span>🎯 ตรวจพบเครื่องดนตรี: <strong>' + detectedLabels + '</strong> (' + stems.length + ' ชิ้นดนตรี)</span>';
  container.append(summaryDiv);

  stems.forEach(function (stem) {
    const meta = STEM_META[stem] || { icon: '🎵', label: stem };
    const row = document.createElement('div');
    row.className = 'stem-track-row';
    row.id = 'stem-row-' + stem;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'stem-track-name';
    nameDiv.innerHTML = '<span class="stem-track-icon">' + meta.icon + '</span>' + meta.label;
    if (stem === 'guitar') {
      nameDiv.style.cursor = 'pointer';
      nameDiv.title = 'คลิกเพื่อสลับป้ายชื่อ: กีตาร์ / เปียโน / ซินธ์';
      const alternates = [
        { icon: '🎸', label: 'กีตาร์ (Guitar)' },
        { icon: '🎹', label: 'เปียโน / คีย์บอร์ด (Piano/Keys)' },
        { icon: '🎛️', label: 'ซินธ์ / คีย์บอร์ด (Synth)' }
      ];
      let altIdx = 0;
      nameDiv.addEventListener('click', function () {
        altIdx = (altIdx + 1) % alternates.length;
        nameDiv.innerHTML = '<span class="stem-track-icon">' + alternates[altIdx].icon + '</span>' + alternates[altIdx].label;
        showToast('เปลี่ยนการแสดงผลแทร็กเป็น: ' + alternates[altIdx].label);
      });
    }

    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'stem-btn';
    muteBtn.id = 'stem-mute-' + stem;
    muteBtn.title = 'Mute ' + stem;
    muteBtn.textContent = 'M';
    muteBtn.addEventListener('click', function () { toggleStemMute(stem); });

    const soloBtn = document.createElement('button');
    soloBtn.type = 'button';
    soloBtn.className = 'stem-btn';
    soloBtn.id = 'stem-solo-' + stem;
    soloBtn.title = 'Solo ' + stem;
    soloBtn.textContent = 'S';
    soloBtn.addEventListener('click', function () { toggleStemSolo(stem); });

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '1';
    slider.className = 'stem-volume-slider';
    slider.style.setProperty('--fill', '80%');
    slider.addEventListener('input', function () {
      const vol = parseFloat(slider.value);
      state.stemVolumes[stem] = vol;
      slider.style.setProperty('--fill', Math.round(vol * 100) + '%');
      labelEl.textContent = Math.round(vol * 100) + '%';
      if (state.stemAudios[stem]) state.stemAudios[stem].volume = state.stemMuted[stem] ? 0 : vol;
    });

    const labelEl = document.createElement('span');
    labelEl.className = 'stem-volume-label';
    labelEl.textContent = '100%';

    row.append(nameDiv, muteBtn, soloBtn, slider, labelEl);
    container.append(row);
  });
}

function updateStemAudioVolumes() {
  const hasSolo = state.stemSoloed !== null;
  Object.keys(state.stemAudios).forEach(function (stem) {
    const audio = state.stemAudios[stem];
    const muted = state.stemMuted[stem];
    const soloed = state.stemSoloed === stem;
    const vol = state.stemVolumes[stem] !== undefined ? state.stemVolumes[stem] : 1.0;
    if (hasSolo) {
      audio.volume = soloed ? vol : 0;
    } else {
      audio.volume = muted ? 0 : vol;
    }
  });
}

function toggleStemMute(stem) {
  state.stemMuted[stem] = !state.stemMuted[stem];
  const muteBtn = $('#stem-mute-' + stem);
  const row = $('#stem-row-' + stem);
  if (muteBtn) muteBtn.classList.toggle('muted-active', state.stemMuted[stem]);
  if (row) row.classList.toggle('muted', state.stemMuted[stem]);
  updateStemAudioVolumes();
  showToast(stem + (state.stemMuted[stem] ? ' — ปิดเสียงแล้ว' : ' — เปิดเสียงแล้ว'));
}

function toggleStemSolo(stem) {
  if (state.stemSoloed === stem) {
    state.stemSoloed = null; // un-solo
  } else {
    state.stemSoloed = stem;
  }
  // Update UI
  Object.keys(state.stemAudios).forEach(function (s) {
    const soloBtn = $('#stem-solo-' + s);
    const row = $('#stem-row-' + s);
    if (soloBtn) soloBtn.classList.toggle('solo-active', state.stemSoloed === s);
    if (row) row.classList.toggle('soloed', state.stemSoloed === s);
  });
  updateStemAudioVolumes();
  if (state.stemSoloed) showToast('Solo: ' + stem);
  else showToast('ยกเลิก Solo แล้ว');
}

function isStemMixActive() {
  const stems = Object.keys(state.stemAudios);
  if (!stems.length) return false;
  if (state.stemSoloed !== null) return true;
  for (const s of stems) {
    if (state.stemMuted[s]) return true;
    if (state.stemVolumes[s] !== undefined && state.stemVolumes[s] < 0.98) return true;
  }
  return false;
}

function syncStemAudios(time) {
  const stems = Object.keys(state.stemAudios);
  if (!stems.length) return;
  const stemMixActive = isStemMixActive();

  if (!stemMixActive) {
    // When no stem is soloed or muted, play crystal-clear Master audio with zero latency!
    if (state.player && state.player.muted) state.player.muted = false;
    stems.forEach(function (stem) {
      const audio = state.stemAudios[stem];
      if (audio && !audio.paused) audio.pause();
    });
    return;
  }

  // Active stem mixing (Mute/Solo/Fader applied):
  if (state.player && !state.player.muted) {
    state.player.muted = true;
  }
  const paused = state.player ? state.player.paused : true;
  stems.forEach(function (stem) {
    const audio = state.stemAudios[stem];
    if (!audio) return;
    if (Math.abs(audio.currentTime - time) > 0.06) {
      audio.currentTime = time;
    }
    if (audio.playbackRate !== state.player.playbackRate) {
      audio.playbackRate = state.player.playbackRate;
    }
    if (!paused && audio.paused) {
      audio.play().catch(function () {});
    } else if (paused && !audio.paused) {
      audio.pause();
    }
  });
}

function clearStemSession() {
  if (state.stemSession && !state.stemSession.startsWith('lib_')) {
    fetch('/api/stems/' + state.stemSession, { method: 'DELETE' }).catch(function () {});
  }
  state.stemSession = null;
  Object.values(state.stemAudios).forEach(function (a) {
    try { a.pause(); a.src = ''; } catch (e) {}
  });
  state.stemAudios = {};
  state.stemMuted = {};
  state.stemSoloed = null;
  state.stemVolumes = {};
  // Restore normal master player output when stems are not loaded
  if (state.player) {
    state.player.muted = false;
    state.player.volume = 1.0;
  }
}

async function checkEngine() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const status = await response.json();
    state.engineReady = Boolean(status.ready);
    state.modelsReady = Boolean(status.modelsReady);
    if (state.engineReady) {
      if (state.modelsReady) {
        if ($('#engineBanner')) $('#engineBanner').classList.add('hidden');
      } else {
        setText('#engineMessageTitle', 'Local AI Engine พร้อมแล้ว');
        setText('#engineMessage', ' — กดเริ่มวิเคราะห์เพลงเพื่อดาวน์โหลดโมเดลคอร์ดและเนื้อเพลงครั้งเดียว');
        if ($('#downloadModelsButton')) $('#downloadModelsButton').classList.remove('hidden');
        if ($('#setupLink')) $('#setupLink').classList.add('hidden');
        if ($('#engineBanner')) $('#engineBanner').classList.remove('hidden');
      }
    } else {
      setText('#engineMessageTitle', 'ยังไม่พบ Local AI Engine');
      setText('#engineMessage', ' — ติดตั้งครั้งเดียวเพื่อใช้โมเดล Transformer บนเครื่องคุณ');
      if ($('#downloadModelsButton')) $('#downloadModelsButton').classList.add('hidden');
      if ($('#setupLink')) $('#setupLink').classList.remove('hidden');
      if ($('#engineBanner')) $('#engineBanner').classList.remove('hidden');
    }
  } catch (error) {
    state.engineReady = false;
    state.modelsReady = false;
    if ($('#engineBanner')) $('#engineBanner').classList.remove('hidden');
  }
}
async function downloadModelsNow() {
  if (!$('#licenseAcceptance').checked) {
    setText('#formError', 'กรุณาติ๊กยืนยันสิทธิ์ใช้ไฟล์และการใช้ส่วนตัวก่อนดาวน์โหลดโมเดล');
    return;
  }
  const button = $('#downloadModelsButton');
  button.disabled = true;
  setText('#formError', '');
  setText('#sourceHint', 'กำลังดาวน์โหลดโมเดลคอร์ด จังหวะ และเนื้อเพลง…');
  try {
    const response = await fetch('/api/models', { method: 'POST', headers: { 'x-chordtube-noncommercial': 'true' } });
    const result = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(result.error || 'ดาวน์โหลดโมเดลไม่สำเร็จ');
    state.modelsReady = true;
    setText('#sourceHint', 'โมเดลพร้อมแล้ว — เลือกไฟล์เพลงและกดวิเคราะห์ได้ทันที');
    await checkEngine();
    showToast('ดาวน์โหลดโมเดลเรียบร้อยแล้ว');
  } catch (error) {
    setText('#formError', error.message || 'ดาวน์โหลดโมเดลไม่สำเร็จ');
  } finally {
    button.disabled = false;
  }
}

function sourceMode(mode) {
  state.source = mode;
  document.querySelectorAll('.source-tab').forEach(function (button) {
    const active = button.dataset.source === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('#mp3Panel').classList.toggle('hidden', mode !== 'mp3');
  $('#youtubePanel').classList.toggle('hidden', mode !== 'youtube');
  $('#analysisControls').classList.toggle('hidden', mode !== 'mp3');
  $('#analyzeLabel').textContent = mode === 'mp3' ? 'เริ่มวิเคราะห์คอร์ด & เนื้อเพลง' : 'เปิดวิดีโอ YouTube';
}
function safeYoutubeUrl(value) {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? 'https://www.youtube.com/watch?v=' + match[1] : null;
}

function normaliseAnalysis(raw, file) {
  const fileTitle = file && file.name ? file.name.replace(/[.][^.]+$/, '') : (raw.title || 'เพลง');
  const chords = Array.isArray(raw.chords) ? raw.chords.map(function (item) {
    return { start: Number(item.start) || 0, end: Number(item.end) || 0, chord: normalizeChord(item.chord), confidence: Number(item.confidence) || 0 };
  }) : [];

  let beats = [];
  if (Array.isArray(raw.beats) && raw.beats.length > 0 && typeof raw.beats[0].chord === 'string') {
    beats = raw.beats.map(function (b, index) {
      return {
        index: index,
        time: Number(b.time) || 0,
        downbeat: Boolean(b.downbeat || b.type === 'downbeat'),
        chord: normalizeChord(b.chord),
        aiChord: normalizeChord(b.aiChord || b.chord),
        confidence: Number(b.confidence) || 0
      };
    });
  } else {
    const beatTimes = Array.isArray(raw.beats) ? raw.beats.map(function (item) {
      return { time: Number(item.time) || 0, downbeat: Boolean(item.downbeat || item.type === 'downbeat') };
    }) : [];

    let chordIndex = 0;
    beats = beatTimes.map(function (beat, index) {
      while (chordIndex < chords.length - 1 && chords[chordIndex].end <= beat.time) chordIndex += 1;
      const currentChord = chords[chordIndex] ? chords[chordIndex].chord : 'N.C.';
      return {
        index: index, time: beat.time, downbeat: beat.downbeat,
        chord: currentChord, aiChord: currentChord,
        confidence: chords[chordIndex] ? chords[chordIndex].confidence : 0
      };
    }).filter(function (beat) { return Number.isFinite(beat.time); });
  }

  const duration = Number(raw.duration) || Number(state.player.duration) || (beats.length ? beats[beats.length - 1].time + 1 : 180);
  return {
    id: raw.id || ('song_' + Date.now()),
    title: raw.title || fileTitle,
    author: raw.author || 'ไฟล์เพลงในเครื่อง',
    key: raw.key || 'รอตรวจ',
    bpm: raw.bpm || raw.tempo || '—',
    meter: raw.meter || 4,
    duration: duration,
    beats: beats,
    chords: chords,
    lyrics: raw.lyrics || null,
    model: raw.model || 'BTC Transformer + Beat This! + Whisper',
    hasStems: Boolean(raw.hasStems),
    stems: raw.stems || [],
    absentStems: raw.absentStems || [],
    stemPresence: raw.stemPresence || {},
    audioUrl: raw.audioUrl || null
  };
}

async function analyzeMp3(file, jobId) {
  const body = new FormData();
  body.append('audio', file, file.name);
  body.append('acceptNonCommercial', 'true');
  const activeQualityBtn = document.querySelector('.quality-button.active');
  const mode = activeQualityBtn ? activeQualityBtn.dataset.analysis : 'standard';
  const meter = $('#meterSelect') ? $('#meterSelect').value : 'auto';
  const lang = $('#lyricsLangSelect') ? $('#lyricsLangSelect').value : 'th';
  
  const headers = {
    'x-chordtube-noncommercial': 'true',
    'x-chordtube-analysis': mode,
    'x-chordtube-meter': meter,
    'x-chordtube-lang': lang
  };
  if (jobId) headers['x-chordtube-job-id'] = jobId;

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: headers,
    body: body
  });
  const result = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(result.error || 'วิเคราะห์ไฟล์ไม่สำเร็จ');
  return normaliseAnalysis(result, file);
}

function clearAudio() {
  stopTicker();
  clearStemSession();
  state.player.pause();
  state.player.removeAttribute('src');
  state.player.load();
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = null;
  // Reset pitch to 0 when loading a new song
  state.pitchShift = 0;
  if (typeof state.clearPitchBuffer === 'function') state.clearPitchBuffer();
  const pitchEl = $('#pitchValue');
  if (pitchEl) { pitchEl.textContent = '0 st'; pitchEl.classList.remove('active-shift'); }
  state.syncOffset = 0;
  updateSyncOffsetUI();
}
function mountAudio(file) {
  clearAudio();
  state.audioUrl = URL.createObjectURL(file);
  state.player.src = state.audioUrl;
  state.speed = 1;
  state.player.playbackRate = 1;
  ensurePitchPreserved(state.player);
  state.player.onloadedmetadata = function () {
    if (state.song && !Number.isFinite(state.song.duration)) state.song.duration = state.player.duration;
    updatePlayback(0);
  };
  state.player.ontimeupdate = function () { updatePlayback(state.player.currentTime); };
  state.player.onseeking = function () {
    const t = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
  };
  state.player.onseeked = function () {
    const t = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
  };
  state.player.onplay = startTicker;
  state.player.onpause = stopTicker;
  state.player.onended = stopTicker;
  initPitchCtx();
}
function startTicker() {
  stopTicker();
  const stemMixActive = isStemMixActive();
  if (state.player) {
    state.player.muted = stemMixActive;
  }
  if (stemMixActive) {
    const curTime = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) {
      try {
        if (Math.abs(a.currentTime - curTime) > 0.05) a.currentTime = curTime;
        a.playbackRate = state.player.playbackRate;
        a.play().catch(function () {});
      } catch (e) {}
    });
  } else {
    Object.values(state.stemAudios).forEach(function (a) { try { if (!a.paused) a.pause(); } catch (e) {} });
  }
  state.playingTimer = window.setInterval(function () {
    const time = state.player.currentTime || 0;
    if (state.loop.enabled && state.loop.a !== null && state.loop.b !== null && time >= state.loop.b) {
      state.player.currentTime = state.loop.a;
      // Seek stems too
      Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = state.loop.a; } catch (e) {} });
    }
    if (state.metronome.enabled && state.song) {
      const effTime = Math.max(0, time + (state.syncOffset || 0));
      const nextBeatObj = state.song.beats.find(function(b) { return b.time > effTime; });
      if (nextBeatObj && state.metronome.nextBeat !== nextBeatObj.index) {
        if (effTime >= nextBeatObj.time - 0.03) {
          playMetronomeClick(nextBeatObj.downbeat);
          state.metronome.nextBeat = nextBeatObj.index;
        }
      }
    }
    syncStemAudios(time);
    updatePlayback(time);
  }, 50);
  const playBtn = $('#playPause');
  const playBtnIcon = $('#playPause span.play-icon') || playBtn;
  if (playBtnIcon) playBtnIcon.textContent = '⏸';
  if (playBtn) playBtn.classList.add('playing');
}
function stopTicker() {
  if (state.playingTimer) window.clearInterval(state.playingTimer);
  state.playingTimer = null;
  // Pause all stem audios
  Object.values(state.stemAudios).forEach(function (a) { try { if (!a.paused) a.pause(); } catch (e) {} });
  const playBtn = $('#playPause');
  const playBtnIcon = $('#playPause span.play-icon') || playBtn;
  if (playBtnIcon) playBtnIcon.textContent = '▶';
  if (playBtn) playBtn.classList.remove('playing');
}

function renderChordDiagram(chord) {
  const target = $('#chordDiagram');
  if (!target) return;
  const display = transposeChord(chord, state.transpose);
  const diagramKey = display + '|' + state.instrument;
  if (state._renderedChordKey === diagramKey) return;
  state._renderedChordKey = diagramKey;

  $('#diagramName').textContent = display;
  if (display === 'N.C.' || display === '—') {
    target.innerHTML = '<div style="font-size:24px;color:var(--text-muted);padding:40px 0;">—</div>';
    setText('#diagramCaption', 'ไม่มีคอร์ดในช่วงนี้');
    return;
  }
  if (state.instrument === 'piano') {
    renderPianoNotes(display, target);
    return;
  }
  const shapeMap = state.instrument === 'ukulele' ? UKULELE_SHAPES : GUITAR_SHAPES;
  const shape = standardShapeFor(display, shapeMap);
  if (!shape) {
    target.innerHTML = '<div style="font-size:24px;color:var(--text-muted);padding:40px 0;">?</div>';
    setText('#diagramCaption', 'ไม่มีรูปทรงมาตรฐานสำหรับคอร์ดนี้');
    return;
  }
  renderFretboard(shape, target, state.instrument);
  setText('#diagramCaption', state.instrument === 'ukulele' ? 'รูปทรงมาตรฐานอูคูเลเล่' : 'รูปทรงมาตรฐานกีตาร์');
}
function standardShapeFor(chord, shapeMap) {
  if (shapeMap[chord]) return shapeMap[chord];
  const match = /^([A-G][#b]?)(m?)/.exec(chord);
  return match ? shapeMap[match[1] + match[2]] : null;
}
function renderFretboard(shape, target, instrument) {
  const strings = shape.length;
  const frets = shape.split('').map(function (item) { return /^[1-9]$/.test(item) ? Number(item) : 0; }).filter(Boolean);
  const baseFret = frets.length && Math.min.apply(null, frets) > 3 ? Math.min.apply(null, frets) : 1;
  const x = function (index) { return 26 + index * (108 / Math.max(1, strings - 1)); };
  const y = function (fret) { return 27 + (fret - baseFret + 0.5) * 25; };
  const vertical = Array.from({ length: strings }, function (_, index) {
    return '<line x1="' + x(index) + '" y1="27" x2="' + x(index) + '" y2="152" stroke="rgba(212, 175, 55, 0.4)" stroke-width="1.5"/>';
  }).join('');
  const horizontal = Array.from({ length: 6 }, function (_, index) {
    return '<line x1="26" y1="' + (27 + index * 25) + '" x2="134" y2="' + (27 + index * 25) + '" stroke="rgba(212, 175, 55, 0.4)" stroke-width="' + (index === 0 ? 4 : 1.2) + '"/>';
  }).join('');
  const markers = shape.split('').map(function (item, index) {
    if (item === 'x') return '<text x="' + x(index) + '" y="18" text-anchor="middle" fill="#ef4444" font-size="13">×</text>';
    if (item === '0') return '<text x="' + x(index) + '" y="18" text-anchor="middle" fill="#10b981" font-size="12">○</text>';
    return '<circle cx="' + x(index) + '" cy="' + y(Number(item)) + '" r="7" fill="#ffd700" stroke="#d4af37" stroke-width="1.2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>';
  }).join('');
  const base = baseFret > 1 ? '<text x="8" y="44" fill="#d4af37" font-size="10" font-weight="600">' + baseFret + 'fr</text>' : '';
  target.innerHTML = '<svg style="width:160px;height:176px;" viewBox="0 0 160 176" aria-hidden="true">' + vertical + horizontal + markers + base + '</svg>';
}
function renderPianoKeyboard(activeSemitones) {
  const whiteKeySemitones = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
  const blackKeys = [
    { semitone: 1, leftWhiteIndex: 0 },
    { semitone: 3, leftWhiteIndex: 1 },
    { semitone: 6, leftWhiteIndex: 3 },
    { semitone: 8, leftWhiteIndex: 4 },
    { semitone: 10, leftWhiteIndex: 5 },
    { semitone: 13, leftWhiteIndex: 7 },
    { semitone: 15, leftWhiteIndex: 8 },
    { semitone: 18, leftWhiteIndex: 10 },
    { semitone: 20, leftWhiteIndex: 11 },
    { semitone: 22, leftWhiteIndex: 12 }
  ];

  let svg = '<svg class="piano-keyboard-svg" viewBox="0 0 230 114" style="width:100%;max-width:240px;height:auto;margin:6px 0;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));" aria-label="ผังลิ่มเปียโน">';
  svg += '<defs>';
  svg += '<linearGradient id="pkWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="85%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient>';
  svg += '<linearGradient id="pkWhiteActive" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fffbeb"/><stop offset="55%" stop-color="#fde68a"/><stop offset="100%" stop-color="#d4af37"/></linearGradient>';
  svg += '<linearGradient id="pkBlackGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#334155"/><stop offset="15%" stop-color="#1e293b"/><stop offset="90%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/></linearGradient>';
  svg += '<linearGradient id="pkBlackActive" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="60%" stop-color="#d4af37"/><stop offset="100%" stop-color="#854d0e"/></linearGradient>';
  svg += '<filter id="pkKeyShadow" x="-15%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.55"/></filter>';
  svg += '</defs>';

  // Piano Case & Red Felt
  svg += '<rect x="1" y="1" width="228" height="112" rx="6" fill="#080b12" stroke="rgba(212,175,55,0.35)" stroke-width="1.5"/>';
  svg += '<rect x="3" y="3" width="224" height="4" rx="1" fill="#b91c1c" opacity="0.95"/>';

  // White Keys
  whiteKeySemitones.forEach(function (st, idx) {
    const x = 3 + idx * 16;
    const isActive = activeSemitones.includes(st);
    const fill = isActive ? 'url(#pkWhiteActive)' : 'url(#pkWhiteGrad)';
    const noteName = NOTE_NAMES[st % 12];
    svg += '<rect x="' + x + '" y="7" width="15.5" height="102" rx="2" fill="' + fill + '" stroke="#94a3b8" stroke-width="0.5"/>';
    if (isActive) {
      svg += '<circle cx="' + (x + 7.75) + '" cy="92" r="5.5" fill="#080a0f" stroke="#d4af37" stroke-width="1.2"/>';
      svg += '<text x="' + (x + 7.75) + '" y="95" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" fill="#fef08a">' + noteName + '</text>';
    } else if (noteName === 'C') {
      svg += '<text x="' + (x + 7.75) + '" y="102" text-anchor="middle" font-family="monospace" font-size="6" fill="#64748b">C</text>';
    }
  });

  // Black Keys
  blackKeys.forEach(function (bk) {
    const x = 3 + (bk.leftWhiteIndex + 1) * 16 - 5.5;
    const isActive = activeSemitones.includes(bk.semitone);
    const fill = isActive ? 'url(#pkBlackActive)' : 'url(#pkBlackGrad)';
    const noteName = NOTE_NAMES[bk.semitone % 12];
    svg += '<rect x="' + x + '" y="7" width="11" height="65" rx="2" fill="' + fill + '" stroke="#000" stroke-width="0.6" filter="url(#pkKeyShadow)"/>';
    if (isActive) {
      svg += '<circle cx="' + (x + 5.5) + '" cy="55" r="4.5" fill="#080a0f" stroke="#fef08a" stroke-width="1"/>';
      svg += '<text x="' + (x + 5.5) + '" y="57.5" text-anchor="middle" font-family="monospace" font-size="5" font-weight="bold" fill="#fef08a">' + noteName + '</text>';
    }
  });

  svg += '</svg>';
  return svg;
}

function renderPianoNotes(chord, target) {
  const match = /^([A-G][#b]?)(.*)$/.exec(chord);
  const note = match ? (FLAT_EQUIVALENTS[match[1]] || match[1]) : 'C';
  const root = Math.max(0, NOTE_NAMES.indexOf(note));
  const suffix = match ? match[2] : '';
  const intervals = /dim7/i.test(suffix) ? [0, 3, 6, 9] :
                    /dim/i.test(suffix) ? [0, 3, 6] :
                    /aug/i.test(suffix) ? [0, 4, 8] :
                    /sus2/i.test(suffix) ? [0, 2, 7] :
                    /sus4/i.test(suffix) ? [0, 5, 7] :
                    /maj7/i.test(suffix) ? [0, 4, 7, 11] :
                    /m7/i.test(suffix) ? [0, 3, 7, 10] :
                    /7/i.test(suffix) ? [0, 4, 7, 10] :
                    /m6/i.test(suffix) ? [0, 3, 7, 9] :
                    /6/i.test(suffix) ? [0, 4, 7, 9] :
                    /add9/i.test(suffix) ? [0, 4, 7, 14] :
                    /^m/.test(suffix) ? [0, 3, 7] : [0, 4, 7];

  const activeSemitones = intervals.map(function (interval) {
    return (root + interval);
  });

  const notesList = intervals.map(function (interval) {
    return NOTE_NAMES[(root + interval) % 12];
  }).join(' · ');

  target.innerHTML = renderPianoKeyboard(activeSemitones);
  setText('#diagramCaption', 'โน้ตคอร์ดเปียโน: ' + notesList);
}

function renderBeatGrid() {
  const grid = $('#beatGrid');
  if (!grid || !state.song) return;
  grid.replaceChildren();
  let barNumber = 1;
  state.song.beats.forEach(function (beat, index) {
    const prior = state.song.beats[index - 1];
    const curChord = transposeChord(beat.chord, state.transpose);
    const prevChord = prior ? transposeChord(prior.chord, state.transpose) : null;
    const isChanged = !prior || curChord !== prevChord;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'beat-cell' + (beat.downbeat ? ' downbeat' : '') + (isChanged ? ' changed' : ' empty');
    cell.dataset.index = String(index);
    cell.dataset.time = String(beat.time);
    if (beat.downbeat) {
      cell.dataset.count = String(barNumber++);
    } else {
      cell.dataset.count = '';
    }
    cell.textContent = isChanged ? curChord : '·';
    if (state.reviewMode) cell.classList.add('editable');
    cell.addEventListener('click', function () {
      seek(beat.time);
      if (state.reviewMode) selectBeat(index);
    });
    grid.append(cell);
  });
}

function shiftDownbeat(offset) {
  if (!state.song || !state.song.beats || state.song.beats.length === 0) return;
  const oldDownbeats = state.song.beats.map(function (b) { return Boolean(b.downbeat); });
  const len = state.song.beats.length;
  state.song.beats.forEach(function (b, i) {
    const srcIndex = (i - offset + len) % len;
    b.downbeat = oldDownbeats[srcIndex];
    b.type = b.downbeat ? 'downbeat' : 'beat';
  });
  renderBeatGrid();
  renderOverview();
  showToast(offset > 0 ? 'เลื่อนหัวห้องเพลงไปข้างหน้า +1 จังหวะ' : 'เลื่อนหัวห้องเพลงถอยหลัง -1 จังหวะ');
}

function toggleChordComplexity() {
  state.simplifiedChords = !state.simplifiedChords;
  const btn = $('#simplifyChordsBtn');
  if (btn) {
    btn.classList.toggle('active', state.simplifiedChords);
    btn.innerHTML = state.simplifiedChords ? '<span>🎸</span> คอร์ดง่าย (เปิดอยู่)' : '<span>🎼</span> คอร์ดง่าย';
  }
  renderBeatGrid();
  renderLyrics();
  renderOverview();
  showToast(state.simplifiedChords ? 'เปิดโหมดคอร์ดง่าย (Triads พื้นฐาน)' : 'เปิดโหมดคอร์ดเต็ม (Extended/Tension Chords)');
}

function adjustSyncOffset(delta) {
  state.syncOffset = Math.round(((state.syncOffset || 0) + delta) * 1000) / 1000;
  state.syncOffset = Math.max(-2.0, Math.min(2.0, state.syncOffset));
  updateSyncOffsetUI();
  const ms = Math.round(state.syncOffset * 1000);
  showToast('ปรับจูน Sync: ' + (ms >= 0 ? '+' : '') + ms + ' ms');
  updatePlayback(state.player ? state.player.currentTime || 0 : 0);
}

function resetSyncOffset() {
  state.syncOffset = 0;
  updateSyncOffsetUI();
  showToast('รีเซ็ต Sync เป็น 0 ms');
  updatePlayback(state.player ? state.player.currentTime || 0 : 0);
}

function updateSyncOffsetUI() {
  const ms = Math.round((state.syncOffset || 0) * 1000);
  const text = (ms >= 0 ? '+' : '') + ms + ' ms';
  ['#syncGridOffsetValue', '#syncLyricsOffsetValue'].forEach(function (sel) {
    const el = $(sel);
    if (el) {
      el.textContent = text;
      el.classList.toggle('offset-active', ms !== 0);
    }
  });
}

function renderLyrics() {
  const panel = $('#lyricsPanel');
  if (!panel || !state.song) return;
  panel.replaceChildren();

  if (!state.song.lyrics || !state.song.lyrics.segments || state.song.lyrics.segments.length === 0) {
    panel.innerHTML = '<div class="lyrics-empty"><div class="empty-icon">✦</div><p>ยังไม่มีเนื้อร้องในเพลงนี้</p><small>คลิกปุ่มด้านล่างเพื่อวางเนื้อเพลงและซิงค์คอร์ดอัตโนมัติได้ทันที</small><button class="empty-action-btn" id="emptyPasteBtn" type="button">วางเนื้อเพลงเพื่อเริ่มซิงค์</button></div>';
    const emptyBtn = $('#emptyPasteBtn');
    if (emptyBtn) emptyBtn.onclick = openLyricsModal;
    return;
  }

  state.song.lyrics.segments.forEach(function (segment, segIdx) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'lyrics-line';
    lineDiv.dataset.start = String(segment.start);
    lineDiv.dataset.end = String(segment.end);
    lineDiv.dataset.index = String(segIdx);

    const isThai = /[\u0e00-\u0e7f]/.test(segment.text || '');

    if (isThai && window.thaiTokenizer && typeof window.thaiTokenizer.createTimedSyllables === 'function' && segment.text) {
      const syllables = window.thaiTokenizer.createTimedSyllables(segment.text, segment.start, segment.end);
      syllables.forEach(function (syl) {
        const sylSpan = document.createElement('span');
        sylSpan.className = 'lyrics-word';
        sylSpan.dataset.start = String(syl.start);
        sylSpan.dataset.end = String(syl.end);
        sylSpan.textContent = syl.text;
        sylSpan.onclick = function (e) { e.stopPropagation(); seek(syl.start); };

        if (syl.isWord) {
          const sylChords = state.song.beats.filter(function (b, idx) {
            if (idx === 0) return false;
            const prev = state.song.beats[idx - 1];
            if (b.chord === prev.chord || b.chord === 'N.C.') return false;
            return b.time >= syl.start - 0.15 && b.time < syl.end + 0.15;
          });

          if (sylChords.length > 0) {
            const chordSpan = document.createElement('span');
            chordSpan.className = 'lyrics-chord';
            chordSpan.textContent = transposeChord(sylChords[0].chord, state.transpose);
            sylSpan.prepend(chordSpan);
          }
        }
        lineDiv.append(sylSpan);
      });
    } else if (segment.words && segment.words.length > 0) {
      segment.words.forEach(function (wordObj) {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'lyrics-word';
        wordSpan.dataset.start = String(wordObj.start);
        wordSpan.dataset.end = String(wordObj.end);
        wordSpan.textContent = /[\u0e00-\u0e7f]/.test(wordObj.word) ? wordObj.word : (wordObj.word + ' ');
        wordSpan.onclick = function (e) { e.stopPropagation(); seek(wordObj.start); };

        const wordChords = state.song.beats.filter(function (b, idx) {
          if (idx === 0) return false;
          const prev = state.song.beats[idx - 1];
          if (b.chord === prev.chord || b.chord === 'N.C.') return false;
          return b.time >= wordObj.start - 0.1 && b.time < wordObj.end + 0.1;
        });

        if (wordChords.length > 0) {
          const chordSpan = document.createElement('span');
          chordSpan.className = 'lyrics-chord';
          chordSpan.textContent = transposeChord(wordChords[0].chord, state.transpose);
          wordSpan.prepend(chordSpan);
        }
        lineDiv.append(wordSpan);
      });
    } else {
      const lineChords = state.song.beats.filter(function (b, idx) {
        if (idx === 0) return b.time >= segment.start && b.time < segment.end && b.chord !== 'N.C.';
        const prev = state.song.beats[idx - 1];
        return (b.chord !== prev.chord || idx === 0) && b.chord !== 'N.C.' && b.time >= segment.start && b.time < segment.end;
      });

      if (lineChords.length > 0) {
        const chordBadge = document.createElement('span');
        chordBadge.className = 'lyrics-chord';
        chordBadge.textContent = lineChords.map(function (c) { return transposeChord(c.chord, state.transpose); }).join(' · ');
        lineDiv.append(chordBadge);
      }

      const textSpan = document.createElement('span');
      textSpan.style.fontSize = '18px';
      textSpan.style.fontWeight = '500';
      textSpan.textContent = segment.text;
      lineDiv.append(textSpan);
    }

    lineDiv.onclick = function () { seek(segment.start); };
    panel.append(lineDiv);
  });
}

function openLyricsModal() {
  if (!state.song) {
    showToast('กรุณาวิเคราะห์เพลงก่อนนำเข้าเนื้อร้อง');
    return;
  }
  const modal = $('#lyricsModal');
  const textarea = $('#pasteLyricsInput');
  if (state.song.lyrics && state.song.lyrics.segments) {
    textarea.value = state.song.lyrics.segments.map(function (s) { return s.text; }).join('\n');
  } else {
    textarea.value = '';
  }
  modal.classList.remove('hidden');
}
function closeLyricsModal() {
  $('#lyricsModal').classList.add('hidden');
}
function savePastedLyrics() {
  const text = $('#pasteLyricsInput').value;
  const lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
  if (lines.length === 0) {
    showToast('กรุณากรอกเนื้อเพลงอย่างน้อย 1 บรรทัด');
    return;
  }

  const duration = state.song.duration || 180;
  const startOffset = Math.min(6, (state.song.beats[0] ? state.song.beats[0].time : 4));
  const availableTime = Math.max(10, duration - startOffset - 4);
  const lineDur = availableTime / lines.length;

  const newSegments = lines.map(function (line, idx) {
    const sStart = startOffset + idx * lineDur;
    const sEnd = sStart + lineDur;
    return {
      start: Number(sStart.toFixed(2)),
      end: Number(sEnd.toFixed(2)),
      text: line
    };
  });

  state.song.lyrics = { language: 'th', segments: newSegments };
  renderLyrics();
  saveSong(state.song);
  closeLyricsModal();
  setViewMode('lyrics');
  showToast('ซิงค์เนื้อร้องและจัดคอร์ดเรียบร้อยแล้ว!');
}

function setViewMode(mode) {
  state.viewMode = mode;
  document.querySelectorAll('.view-tab').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
  const workspace = $('#workspace');
  if (workspace) workspace.classList.toggle('split-mode', mode === 'split');

  const viewLyrics = $('#viewLyrics');
  const viewGrid = $('#viewGrid');
  const viewStems = $('#viewStems');
  const viewPractice = $('#viewPractice');

  if (mode === 'split') {
    if (viewGrid) viewGrid.classList.add('active');
    if (viewLyrics) viewLyrics.classList.add('active');
    if (viewStems) viewStems.classList.remove('active');
    if (viewPractice) viewPractice.classList.remove('active');
  } else if (mode === 'grid') {
    if (viewGrid) viewGrid.classList.add('active');
    if (viewLyrics) viewLyrics.classList.remove('active');
    if (viewStems) viewStems.classList.remove('active');
    if (viewPractice) viewPractice.classList.remove('active');
  } else if (mode === 'stems') {
    if (viewStems) viewStems.classList.add('active');
    if (viewLyrics) viewLyrics.classList.remove('active');
    if (viewGrid) viewGrid.classList.remove('active');
    if (viewPractice) viewPractice.classList.remove('active');
  } else if (mode === 'practice') {
    if (viewPractice) viewPractice.classList.add('active');
    if (viewLyrics) viewLyrics.classList.remove('active');
    if (viewGrid) viewGrid.classList.remove('active');
    if (viewStems) viewStems.classList.remove('active');
  } else {
    if (viewLyrics) viewLyrics.classList.add('active');
    if (viewGrid) viewGrid.classList.remove('active');
    if (viewStems) viewStems.classList.remove('active');
    if (viewPractice) viewPractice.classList.remove('active');
  }
}

function updatePlayback(time) {
  if (!state.song) return;
  const current = chordAt(time);
  const currentIndex = current.index;
  const currentTChord = transposeChord(current.chord, state.transpose);
  const nextTChord = transposeChord(nextChordAfter(time), state.transpose);

  if (state.lastChord !== currentTChord) {
    state.lastChord = currentTChord;
    const curEl = $('#currentChord');
    const dockEl = $('#dockCurrentChord');
    if (curEl) {
      curEl.classList.remove('chord-pop');
      void curEl.offsetWidth; // trigger reflow
      curEl.classList.add('chord-pop');
    }
    if (dockEl) {
      dockEl.classList.remove('chord-pop');
      void dockEl.offsetWidth;
      dockEl.classList.add('chord-pop');
    }
    renderChordDiagram(current.chord);
    updatePracticeHUD(currentTChord);
  }

  setText('#currentChord', currentTChord);
  setText('#dockCurrentChord', currentTChord);
  setText('#nextChord', nextTChord);
  setText('#currentTime', formatTime(time));

  // Progress bars
  const pct = Math.min(100, (time / (state.song.duration || 1)) * 100);
  if ($('#progressFill')) $('#progressFill').style.width = pct + '%';

  // Stage Mode
  if (state.stageMode) {
    setText('#stageCurrentChord', currentTChord);
    setText('#stageNextChord', nextTChord);
    if ($('#stageProgressFill')) $('#stageProgressFill').style.width = pct + '%';
  }

  // Loop highlight
  if (state.loop.a !== null) {
    const loopB = state.loop.b !== null ? state.loop.b : state.song.duration;
    const left = (state.loop.a / state.song.duration) * 100;
    const width = ((loopB - state.loop.a) / state.song.duration) * 100;
    const hl = $('#loopHighlight');
    if (hl) {
      hl.style.left = left + '%';
      hl.style.width = width + '%';
      hl.classList.remove('hidden');
    }
  } else {
    if ($('#loopHighlight')) $('#loopHighlight').classList.add('hidden');
  }

  // Beat Grid Update
  if (state.viewMode === 'grid' || state.viewMode === 'split') {
    let activeCell = null;
    document.querySelectorAll('.beat-cell').forEach(function (cell) {
      const index = Number(cell.dataset.index);
      const isCur = index === currentIndex;
      cell.classList.toggle('current', isCur);
      cell.classList.toggle('selected', index === state.selectedBeat);
      if (isCur) activeCell = cell;
    });
    const gridWrap = $('#beatGridWrap');
    if (activeCell && !state.reviewMode && gridWrap) {
      const cellLeft = activeCell.offsetLeft;
      const wrapWidth = gridWrap.clientWidth;
      const cellWidth = activeCell.clientWidth;
      const targetScroll = cellLeft - (wrapWidth / 2) + (cellWidth / 2);
      gridWrap.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }

  // LIVE TELEPROMPTER & LYRICS SHEET SYNC
  let activeLyricText = '';
  let nextLyricText = '—';
  const effTime = Math.max(0, time + (state.syncOffset || 0));

  if (state.song.lyrics && state.song.lyrics.segments && state.song.lyrics.segments.length > 0) {
    const segs = state.song.lyrics.segments;
    let foundIdx = -1;

    for (let i = 0; i < segs.length; i++) {
      if (effTime >= segs[i].start && effTime <= segs[i].end) {
        foundIdx = i;
        activeLyricText = segs[i].text;
        if (i + 1 < segs.length) nextLyricText = segs[i + 1].text;
        break;
      } else if (effTime < segs[i].start && foundIdx === -1) {
        nextLyricText = segs[i].text;
      }
    }

    if (foundIdx === -1 && effTime < segs[0].start) {
      activeLyricText = '✦ อินโทร (Intro)';
      nextLyricText = segs[0].text;
    } else if (foundIdx === -1 && effTime > segs[segs.length - 1].end) {
      activeLyricText = '✦ เอาต์โทร (Outro)';
      nextLyricText = 'จบเพลง';
    }

    // Highlighting words
    document.querySelectorAll('.lyrics-word').forEach(function (word) {
      const start = Number(word.dataset.start);
      const end = Number(word.dataset.end);
      const isActive = effTime >= start && effTime <= end;
      word.classList.toggle('active', isActive);
      word.classList.toggle('past', effTime > end);
    });

    // Highlighting lines
    const lyricsContainer = $('#lyricsPanel');
    document.querySelectorAll('.lyrics-line').forEach(function (line) {
      const start = Number(line.dataset.start);
      const end = Number(line.dataset.end);
      const isActive = effTime >= start && effTime <= end;
      const wasActive = line.classList.contains('active-line');
      line.classList.toggle('active-line', isActive);
      // Only scroll when newly becoming active and scroll inside its container only
      if (isActive && !wasActive && !state.reviewMode && lyricsContainer && (state.viewMode === 'lyrics' || state.viewMode === 'split')) {
        const topPos = line.offsetTop - lyricsContainer.offsetTop - (lyricsContainer.clientHeight / 2) + (line.clientHeight / 2);
        lyricsContainer.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
      }
    });
  } else {
    activeLyricText = '✦ บรรเลงดนตรี (คลิก "วาง/แก้เนื้อเพลง" เพื่อใส่เนื้อร้อง)';
    nextLyricText = '—';
  }

  setText('#liveCurrentLine', activeLyricText);
  setText('#liveNextLine', 'ท่อนถัดไป: ' + nextLyricText);
  if (state.stageMode) setText('#stageCurrentLyrics', activeLyricText);
}

function seek(time) {
  state.player.currentTime = Math.max(0, Math.min(time, state.song ? state.song.duration : 0));
  if (typeof state.clearPitchBuffer === 'function') state.clearPitchBuffer();
  updatePlayback(state.player.currentTime);
}
function selectBeat(index) {
  state.selectedBeat = index;
  const beat = state.song.beats[index];
  setText('#selectedBeatTime', formatTime(beat.time));
  selectChordValue(beat.chord);
  $('#reviewEmpty').classList.add('hidden');
  $('#reviewEditor').classList.remove('hidden');
  updatePlayback(state.player.currentTime);
}
function setReviewMode(enabled) {
  state.reviewMode = enabled;
  $('#reviewToggle').classList.toggle('active', enabled);
  $('#reviewToggle').textContent = enabled ? 'ปิดโหมดตรวจแก้' : 'โหมดตรวจแก้คอร์ด';
  $('#reviewCard').classList.toggle('active', enabled);
  if ($('#practiceLayout')) $('#practiceLayout').classList.toggle('review-active', enabled);
  setText('#reviewState', enabled ? 'กำลังตรวจแก้' : 'ปิดอยู่');
  if (!enabled) {
    state.selectedBeat = null;
    $('#reviewEmpty').classList.remove('hidden');
    $('#reviewEditor').classList.add('hidden');
  }
  renderBeatGrid();
  updatePlayback(state.player.currentTime);
}

function renderOverview() {
  const groups = [];
  const barSize = (state.song.meter || 4) * 4;
  for (let index = 0; index < state.song.beats.length; index += barSize) {
    groups.push(state.song.beats.slice(index, index + barSize));
  }
  const sectionNames = ['Intro', 'Verse 1', 'Chorus', 'Verse 2', 'Chorus 2', 'Bridge', 'Solo', 'Outro'];

  $('#sections').innerHTML = groups.map(function (group, index) {
    const changed = group.filter(function (beat, beatIndex) { return !beatIndex || beat.chord !== group[beatIndex - 1].chord; });
    const sName = sectionNames[index % sectionNames.length] + (index >= sectionNames.length ? ' ' + Math.floor(index / sectionNames.length + 1) : '');
    return '<article class="song-section"><div class="section-meta"><input class="section-name-edit" value="' + sName + '"><span class="section-time">' + formatTime(group[0].time) + '</span></div><div class="chord-list">' +
      changed.map(function (beat) { return '<button type="button" class="chord-button" data-time="' + beat.time + '">' + transposeChord(beat.chord, state.transpose) + '</button>'; }).join('') +
      '</div></article>';
  }).join('');
  document.querySelectorAll('.chord-button').forEach(function (button) {
    button.addEventListener('click', function () { seek(Number(button.dataset.time)); });
  });

  const beatsDiv = $('#seekbarBeats');
  if (beatsDiv) {
    beatsDiv.replaceChildren();
    state.song.beats.forEach(function (beat) {
      if (beat.downbeat) {
        const tick = document.createElement('div');
        tick.className = 'seekbar-tick';
        tick.style.left = (beat.time / (state.song.duration || 1) * 100) + '%';
        beatsDiv.append(tick);
      }
    });
  }
}

function renderSong() {
  state._renderedChordKey = null;
  state.lastChord = null;
  setText('#songTitle', state.song.title);
  setText('#songArtist', state.song.author);
  setText('#songKey', transposeKey(state.song.key, state.transpose));
  setText('#songTempo', state.song.bpm === '—' ? '—' : String(Math.round(Number(state.song.bpm))) + ' BPM');
  setText('#songMeter', state.song.meter ? state.song.meter + '/4' : '4/4');
  setText('#songConfidence', state.reviewMode ? 'กำลังตรวจแก้' : 'AI Draft · พร้อมซ้อม');
  setText('#totalDuration', formatTime(state.song.duration));
  setText('#analysisMethod', state.song.model);
  setText('#sourceChip', 'STUDIO MASTER · LOCAL');
  setText('#transposeValue', state.transpose === 0 ? 'ต้นฉบับ' : (state.transpose > 0 ? '+' : '') + state.transpose);
  setText('#capoDisplay', calculateCapo(state.transpose));

  renderBeatGrid();
  renderLyrics();
  renderOverview();
  renderChordDiagram(chordAt(0).chord);
  updatePlayback(0);
}

// Exports
function exportText() {
  const lines = [
    state.song.title + ' — ' + state.song.author,
    'Key: ' + transposeKey(state.song.key, state.transpose) + ' | Tempo: ' + state.song.bpm + ' BPM',
    ''
  ];
  state.song.beats.forEach(function (beat, index) {
    if (!index || beat.chord !== state.song.beats[index - 1].chord) {
      lines.push(formatTime(beat.time) + '  ' + transposeChord(beat.chord, state.transpose));
    }
  });
  return lines.join('\n');
}
function exportChordPro() {
  const lines = [
    '{title: ' + state.song.title + '}',
    '{artist: ' + state.song.author + '}',
    '{key: ' + transposeKey(state.song.key, state.transpose) + '}',
    '{tempo: ' + state.song.bpm + '}',
    ''
  ];
  if (state.song.lyrics && state.song.lyrics.segments) {
    state.song.lyrics.segments.forEach(function (segment) {
      let lineStr = '';
      if (segment.words) {
        segment.words.forEach(function (w) {
          const wchords = state.song.beats.filter(function (b, idx) {
            if (idx === 0) return false;
            const prev = state.song.beats[idx - 1];
            if (b.chord === prev.chord) return false;
            return b.time >= w.start && b.time < w.end;
          });
          if (wchords.length > 0) lineStr += '[' + transposeChord(wchords[0].chord, state.transpose) + ']';
          lineStr += w.word + ' ';
        });
      } else {
        lineStr = segment.text;
      }
      lines.push(lineStr);
    });
  }
  return lines.join('\n');
}
function exportLRC() {
  const lines = ['[ti:' + state.song.title + ']', '[ar:' + state.song.author + ']', ''];
  if (state.song.lyrics && state.song.lyrics.segments) {
    state.song.lyrics.segments.forEach(function (segment) {
      const min = Math.floor(segment.start / 60);
      const sec = (segment.start % 60).toFixed(2).padStart(5, '0');
      lines.push('[' + String(min).padStart(2, '0') + ':' + sec + ']' + segment.text);
    });
  }
  return lines.join('\n');
}
function exportJSON() {
  return JSON.stringify(state.song, null, 2);
}

// ═══════════════════════════════════════════════════════════
//  ANALYSIS LOADING OVERLAY (Real-time Timeline & Polling)
// ═══════════════════════════════════════════════════════════
const TIMELINE_ACCURATE = [
  { key: 'upload',   name: 'อัปโหลดและเตรียมโมเดล AI' },
  { key: 'separate', name: 'HTDemucs: แยกเสียงดนตรี (1–2 นาที)' },
  { key: 'chords',   name: 'BTC AI: ถอดคอร์ดแทร็กดนตรี' },
  { key: 'beats',    name: 'Beat This!: จับจังหวะแทร็กกลอง' },
  { key: 'ensemble', name: 'ผสาน Beat-Aligned Ensemble' },
  { key: 'done',     name: 'สร้าง Beat Map & ตารางคอร์ด' }
];

const TIMELINE_FAST = [
  { key: 'upload',       name: 'อัปโหลดและเตรียมไฟล์' },
  { key: 'chords_beats', name: 'BTC AI & Beat This!: แกะคอร์ดและจังหวะ' },
  { key: 'final',        name: 'คำนวณคีย์และโครงสร้างเพลง' },
  { key: 'done',         name: 'สร้าง Beat Map & ตารางคอร์ด' }
];

let _pollTimer = null;
let _elapsedTimer = null;
let _elapsedSeconds = 0;
let _currentDisplayPct = 0;

function _formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function _startElapsedTimer() {
  _elapsedSeconds = 0;
  setText('#analysisLiveTimer', '00:00');
  if (_elapsedTimer) clearInterval(_elapsedTimer);
  _elapsedTimer = setInterval(function () {
    _elapsedSeconds += 1;
    setText('#analysisLiveTimer', _formatElapsed(_elapsedSeconds));
  }, 1000);
}

function _stopElapsedTimer() {
  if (_elapsedTimer) clearInterval(_elapsedTimer);
  _elapsedTimer = null;
}

function renderTimelineStages(isAccurate) {
  const stagesContainer = $('#analysisStages');
  if (!stagesContainer) return;
  stagesContainer.replaceChildren();

  const stages = isAccurate ? TIMELINE_ACCURATE : TIMELINE_FAST;
  stages.forEach(function (s, index) {
    const div = document.createElement('div');
    div.className = 'analysis-stage' + (index === 0 ? ' active' : '');
    div.dataset.stage = s.key;
    div.innerHTML = '<span class="stage-dot"></span><span class="stage-name">' + s.name + '</span><span class="stage-check">✓</span>';
    stagesContainer.append(div);
  });
}

function updateTimelineStageUI(activeStageKey, isAccurate) {
  const stages = isAccurate ? TIMELINE_ACCURATE : TIMELINE_FAST;
  let activeIndex = stages.findIndex(function (s) { return s.key === activeStageKey; });
  if (activeIndex === -1) {
    // Map fallback/prepare/final keys
    if (activeStageKey === 'prepare') activeIndex = 0;
    else if (activeStageKey === 'fallback') activeIndex = 2;
    else if (activeStageKey === 'final') activeIndex = stages.length - 2;
    else if (activeStageKey === 'done') activeIndex = stages.length - 1;
  }

  stages.forEach(function (s, idx) {
    const el = document.querySelector('.analysis-stage[data-stage="' + s.key + '"]');
    if (!el) return;
    if (idx < activeIndex) {
      el.classList.add('done');
      el.classList.remove('active');
    } else if (idx === activeIndex) {
      el.classList.add('active');
      el.classList.remove('done');
    } else {
      el.classList.remove('active', 'done');
    }
  });
}

function showAnalysisOverlay(isAccurate) {
  const overlay = $('#analysisOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  if (isAccurate) overlay.classList.add('accurate-mode');
  else overlay.classList.remove('accurate-mode');

  _currentDisplayPct = 0;
  _setProgressBar(0);
  setText('#analysisPct', '0%');
  setText('#analysisLiveBadge', isAccurate ? 'Studio Accurate Mode' : 'Fast Mode');
  setText('#analysisCurrentTitle', 'กำลังเริ่มระบบ AI…');
  setText('#analysisCurrentDetail', 'เตรียมพร้อมไฟล์และทรัพยากรสำหรับการวิเคราะห์');
  setText('#analysisEta', isAccurate ? 'ประมาณ 1–3 นาที' : 'ประมาณ 20–40 วินาที');

  renderTimelineStages(isAccurate);
  _startElapsedTimer();
  document.body.style.overflow = 'hidden';
}

function hideAnalysisOverlay() {
  const overlay = $('#analysisOverlay');
  if (!overlay) return;
  _stopElapsedTimer();
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = null;

  _setProgressBar(100, true);
  setText('#analysisPct', '100%');
  setText('#analysisLiveBadge', 'เสร็จสมบูรณ์');
  setText('#analysisCurrentTitle', '✦ วิเคราะห์เสร็จสมบูรณ์ 100%!');
  setText('#analysisCurrentDetail', 'พร้อมเปิดใช้งานในสตูดิโอแกะคอร์ด');

  document.querySelectorAll('.analysis-stage').forEach(function (el) {
    el.classList.remove('active');
    el.classList.add('done');
  });

  window.setTimeout(function () {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }, 700);
}

function startProgressPolling(jobId, isAccurate) {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(async function () {
    try {
      const resp = await fetch('/api/progress?jobId=' + encodeURIComponent(jobId), { cache: 'no-store' });
      if (!resp.ok) return;
      const job = await resp.json();
      if (!job || !job.stage) return;

      if (job.message) setText('#analysisCurrentTitle', job.message);
      if (job.detail) setText('#analysisCurrentDetail', job.detail);
      if (job.stage) updateTimelineStageUI(job.stage, isAccurate);

      if (typeof job.percent === 'number') {
        // Smoothly interpolate to new percent
        _currentDisplayPct = Math.max(_currentDisplayPct, job.percent);
        _setProgressBar(_currentDisplayPct);
      }

      if (job.done || job.stage === 'done') {
        clearInterval(_pollTimer);
        _pollTimer = null;
      }
    } catch (e) {}
  }, 400);
}

function _setProgressBar(pct, instant) {
  const fill = $('#analysisProgressFill');
  const glow = $('#analysisProgressGlow');
  const pctEl = $('#analysisPct');
  const p = Math.min(100, Math.max(0, pct));
  if (fill) {
    fill.style.transition = instant ? 'width 0.3s ease' : 'width 0.5s ease-out';
    fill.style.width = p + '%';
  }
  if (glow) glow.style.width = p + '%';
  if (pctEl) pctEl.textContent = Math.round(p) + '%';
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(function () { toast.classList.remove('show'); }, 2800);
}

function handleExport(type) {
  if (!state.song) return;
  let data = '', ext = '.txt', mime = 'text/plain;charset=utf-8';
  switch (type) {
    case 'text': data = exportText(); ext = '-chords.txt'; break;
    case 'chordpro': data = exportChordPro(); ext = '.cho'; break;
    case 'lrc': data = exportLRC(); ext = '.lrc'; break;
    case 'json': data = exportJSON(); ext = '.json'; mime = 'application/json;charset=utf-8'; break;
  }
  const blob = new Blob([data], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = state.song.title.replace(/[<>:"/\\|?*]/g, '') + ext;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('ดาวน์โหลดไฟล์ ' + ext + ' สำเร็จ');
  $('#exportDropdown').classList.add('hidden');
}

/// FORM SUBMIT
$('#sourceForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  setText('#formError', '');
  if (state.source !== 'mp3') {
    const videoUrl = safeYoutubeUrl($('#youtubeUrl').value);
    if (!videoUrl) { setText('#formError', 'กรุณาวางลิงก์ youtube.com หรือ youtu.be ที่ถูกต้อง'); return; }
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
    setText('#sourceHint', 'เปิดวิดีโอในแท็บใหม่แล้ว — นำเข้าไฟล์ MP3/WAV เพื่อให้ AI วิเคราะห์คอร์ดในเครื่อง');
    return;
  }
  const file = $('#audioFile').files[0];
  if (!file) { setText('#formError', 'กรุณาเลือกไฟล์เสียงก่อนเริ่มวิเคราะห์'); return; }
  if (!$('#licenseAcceptance').checked) { setText('#formError', 'กรุณายืนยันสิทธิ์ใช้ไฟล์และการใช้ส่วนตัวก่อน'); return; }
  if (!state.engineReady) { setText('#formError', 'ยังไม่พบ AI engine — เปิดหน้า "คู่มือติดตั้ง" เพื่อติดตั้งครั้งเดียว'); return; }

  const button = $('#analyzeButton');
  const activeQualityBtn = document.querySelector('.quality-button.active');
  const isAccurate = activeQualityBtn && activeQualityBtn.dataset.analysis === 'accurate';
  const jobId = 'ct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Show beautiful real-time loading overlay
  button.classList.add('loading');
  showAnalysisOverlay(isAccurate);

  // Start polling server for actual progress
  startProgressPolling(jobId, isAccurate);

  try {
    mountAudio(file);
    state.song = await analyzeMp3(file, jobId);

    // If Studio Accurate mode separated stems, initialize mixer right away!
    if (state.song.hasStems && state.song.stems && state.song.stems.length > 0) {
      initStemsFromLibrary(state.song.id, state.song.stems, state.song.absentStems);
    }

    state.transpose = 0;
    state.selectedBeat = null;
    setReviewMode(false);
    $('#workspace').classList.remove('hidden');
    renderSong();
    saveSong(state.song);
    hideAnalysisOverlay();
    setText('#sourceHint', 'วิเคราะห์เสร็จสมบูรณ์ 100% — บันทึกลงแฟ้มและพร้อมใช้งานทันที');
    state.modelsReady = true;
    $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('✦ วิเคราะห์เพลงสำเร็จ!' + (state.song.hasStems ? ' (มิกซ์ ' + state.song.stems.length + ' แทร็กพร้อมใช้งาน)' : ''));
  } catch (error) {
    hideAnalysisOverlay();
    clearAudio();
    setText('#formError', error.message || 'วิเคราะห์ไฟล์ไม่สำเร็จ');
    setText('#sourceHint', 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง');
  } finally {
    button.classList.remove('loading');
  }
});

// Drag and drop
document.body.addEventListener('dragover', function (e) {
  e.preventDefault();
  $('#dropOverlay').classList.remove('hidden');
});
document.body.addEventListener('dragleave', function (e) {
  if (e.target === $('#dropOverlay')) $('#dropOverlay').classList.add('hidden');
});
document.body.addEventListener('drop', function (e) {
  e.preventDefault();
  $('#dropOverlay').classList.add('hidden');
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)) {
      sourceMode('mp3');
      const dt = new DataTransfer();
      dt.items.add(file);
      $('#audioFile').files = dt.files;
      $('#audioFileName').textContent = file.name;
      showToast('เลือกไฟล์: ' + file.name);
    } else {
      showToast('รองรับเฉพาะไฟล์เสียงเท่านั้น (MP3, WAV, M4A, FLAC, OGG)');
    }
  }
});

// Seekbar Click
$('#seekbar').addEventListener('click', function (e) {
  if (!state.song) return;
  const rect = this.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seek(pct * (state.song.duration || 1));
});

// Keyboard Shortcuts
document.addEventListener('keydown', function (e) {
  if (!state.song || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.key.toLowerCase()) {
    case ' ': e.preventDefault(); $('#playPause').click(); break;
    case 'arrowleft': e.preventDefault(); $('#previousBeat').click(); break;
    case 'arrowright': e.preventDefault(); $('#nextBeat').click(); break;
    case '[': e.preventDefault(); $('#transposeDown').click(); break;
    case ']': e.preventDefault(); $('#transposeUp').click(); break;
    case 'a': e.preventDefault(); $('#loopStart').click(); break;
    case 'b': e.preventDefault(); $('#loopEnd').click(); break;
    case 'l': e.preventDefault(); $('#loopToggle').click(); break;
    case 'm': e.preventDefault(); $('#metronomeToggle').click(); break;
    case 'w': e.preventDefault(); if ($('#wideModeBtn')) $('#wideModeBtn').click(); break;
    case 'f': e.preventDefault(); $('#stageMode').click(); break;
    case 'escape':
      e.preventDefault();
      if (state.stageMode) { state.stageMode = false; $('#stageOverlay').classList.add('hidden'); }
      closeLyricsModal();
      $('#libraryPanel').classList.add('hidden');
      $('#exportDropdown').classList.add('hidden');
      break;
    case 'tab':
      e.preventDefault();
      const nextMode = state.viewMode === 'lyrics' ? 'grid' : (state.viewMode === 'grid' ? 'split' : 'lyrics');
      setViewMode(nextMode);
      break;
    case '1': $('.speed-btn[data-rate="1"]').click(); break;
    case '2': $('.speed-btn[data-rate="0.9"]').click(); break;
    case '3': $('.speed-btn[data-rate="0.75"]').click(); break;
    case '4': $('.speed-btn[data-rate="0.5"]').click(); break;
    case '5': $('.speed-btn[data-rate="1.25"]').click(); break;
  }
});

// Event Listeners
document.querySelectorAll('.source-tab').forEach(function (button) { button.addEventListener('click', function () { sourceMode(button.dataset.source); }); });
document.querySelectorAll('.quality-button').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('.quality-button').forEach(function (b) { b.classList.remove('active'); });
    button.classList.add('active');
    const isAccurate = button.dataset.analysis === 'accurate';
    const hintEl = $('#analysisModeHint');
    if (hintEl) {
      hintEl.textContent = isAccurate
        ? '✦ Studio Accurate: แยกเสียงกลอง/เสียงร้องด้วย Demucs เหมาะสำหรับเพลงที่มีเสียงดนตรีซับซ้อน (ใช้เวลา 2-4 นาที)'
        : '✦ Fast Mode (แนะนำ): วิเคราะห์รวดเร็ว ~30-60 วินาที ได้คอร์ด BTC Transformer + บีต Beat This! + เนื้อเพลงภาษาไทยครบถ้วน';
    }
  });
});
document.querySelectorAll('.view-tab').forEach(function (button) {
  button.addEventListener('click', function () { setViewMode(button.dataset.view); });
});

$('#audioFile').addEventListener('change', function () {
  const file = $('#audioFile').files[0];
  setText('#audioFileName', file ? file.name : 'คลิกหรือลากไฟล์เสียงมาวางที่นี่');
});
$('#downloadModelsButton').addEventListener('click', downloadModelsNow);
$('#playPause').addEventListener('click', function () {
  if (!state.song) return;
  if (!state.pitchCtx) initPitchCtx();
  if (state.pitchCtx && state.pitchCtx.state === 'suspended') {
    state.pitchCtx.resume().catch(function () {});
  }
  ensurePitchPreserved(state.player);
  if (state.player.paused) state.player.play(); else state.player.pause();
});
$('#previousBeat').addEventListener('click', function () {
  if (state.song) { const beat = getPreviousBeat(state.player.currentTime); seek(beat ? beat.time : 0); }
});
$('#nextBeat').addEventListener('click', function () {
  if (state.song) { const beat = getNextBeat(state.player.currentTime); seek(beat ? beat.time : state.song.duration); }
});
document.querySelectorAll('.speed-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    const rate = Number(button.dataset.rate);
    state.speed = rate;
    ensurePitchPreserved(state.player);
    state.player.playbackRate = rate;
    Object.values(state.stemAudios).forEach(function (a) {
      try {
        ensurePitchPreserved(a);
        a.playbackRate = rate;
      } catch (e) {}
    });
    document.querySelectorAll('.speed-btn').forEach(function (b) { b.classList.toggle('active', b === button); });
  });
});

$('#loopStart').addEventListener('click', function () {
  if (!state.song) return;
  state.loop.a = state.player.currentTime;
  this.classList.add('active');
  showToast('ตั้งจุดเริ่มต้นลูป (A) ที่ ' + formatTime(state.loop.a));
});
$('#loopEnd').addEventListener('click', function () {
  if (!state.song) return;
  if (state.loop.a === null || state.player.currentTime <= state.loop.a) {
    showToast('กรุณากด A ก่อนเพื่อตั้งจุดเริ่มต้น');
    return;
  }
  state.loop.b = state.player.currentTime;
  this.classList.add('active');
  showToast('ตั้งจุดสิ้นสุดลูป (B) ที่ ' + formatTime(state.loop.b));
});
$('#loopToggle').addEventListener('click', function () {
  if (state.loop.a === null || state.loop.b === null) {
    showToast('ตั้งจุด A และ B ก่อนเปิดวนลูป');
    return;
  }
  state.loop.enabled = !state.loop.enabled;
  this.classList.toggle('active', state.loop.enabled);
  showToast(state.loop.enabled ? 'เปิดเล่นวนลูป A–B แล้ว' : 'ปิดการเล่นวนลูปแล้ว');
});

$('#metronomeToggle').addEventListener('click', function () {
  state.metronome.enabled = !state.metronome.enabled;
  this.classList.toggle('active', state.metronome.enabled);
  showToast(state.metronome.enabled ? 'เปิด Metronome เคาะจังหวะ' : 'ปิด Metronome');
});

const shiftPrevBtn = $('#shiftDownbeatPrev');
if (shiftPrevBtn) shiftPrevBtn.addEventListener('click', function () { shiftDownbeat(-1); });

const shiftNextBtn = $('#shiftDownbeatNext');
if (shiftNextBtn) shiftNextBtn.addEventListener('click', function () { shiftDownbeat(1); });

const simplifyBtn = $('#simplifyChordsBtn');
if (simplifyBtn) simplifyBtn.addEventListener('click', toggleChordComplexity);

const nudgeGMinus = $('#nudgeGridMinus');
if (nudgeGMinus) nudgeGMinus.addEventListener('click', function () { adjustSyncOffset(-0.05); });
const nudgeGPlus = $('#nudgeGridPlus');
if (nudgeGPlus) nudgeGPlus.addEventListener('click', function () { adjustSyncOffset(0.05); });
const syncGReset = $('#syncGridOffsetValue');
if (syncGReset) syncGReset.addEventListener('click', resetSyncOffset);

const nudgeLMinus = $('#nudgeLyricsMinus');
if (nudgeLMinus) nudgeLMinus.addEventListener('click', function () { adjustSyncOffset(-0.05); });
const nudgeLPlus = $('#nudgeLyricsPlus');
if (nudgeLPlus) nudgeLPlus.addEventListener('click', function () { adjustSyncOffset(0.05); });
const syncLReset = $('#syncLyricsOffsetValue');
if (syncLReset) syncLReset.addEventListener('click', resetSyncOffset);

$('#reviewToggle').addEventListener('click', function () {
  if (state.song) setReviewMode(!state.reviewMode);
});
$('#applyChord').addEventListener('click', function () {
  if (state.selectedBeat === null) return;
  const beat = state.song.beats[state.selectedBeat];
  const oldChord = beat.chord;
  const newChord = $('#editChord').value;
  if (oldChord === newChord) return;

  if (window.undoManager && window.ChangeChordCommand) {
    const cmd = new window.ChangeChordCommand(beat, oldChord, newChord, function (c) {
      selectChordValue(c);
      renderBeatGrid();
      renderLyrics();
      renderOverview();
      updatePlayback(state.player.currentTime);
      saveSong(state.song);
    });
    window.undoManager.execute(cmd);
    showToast('บันทึกคอร์ดสำหรับบีตนี้แล้ว (กด Ctrl+Z เพื่อย้อนกลับ)');
  } else {
    beat.chord = newChord;
    renderBeatGrid();
    renderLyrics();
    renderOverview();
    updatePlayback(state.player.currentTime);
    saveSong(state.song);
    showToast('บันทึกคอร์ดสำหรับบีตนี้แล้ว');
  }
});

$('#resetChord').addEventListener('click', function () {
  if (state.selectedBeat === null) return;
  const beat = state.song.beats[state.selectedBeat];
  const oldChord = beat.chord;
  const newChord = beat.aiChord;
  if (oldChord === newChord) return;

  if (window.undoManager && window.ChangeChordCommand) {
    const cmd = new window.ChangeChordCommand(beat, oldChord, newChord, function (c) {
      selectChordValue(c);
      renderBeatGrid();
      renderLyrics();
      renderOverview();
      updatePlayback(state.player.currentTime);
      saveSong(state.song);
    });
    window.undoManager.execute(cmd);
    showToast('คืนค่าคอร์ดจาก AI ดั้งเดิมแล้ว (กด Ctrl+Z เพื่อย้อนกลับ)');
  } else {
    beat.chord = newChord;
    selectChordValue(beat.chord);
    renderBeatGrid();
    renderLyrics();
    renderOverview();
    updatePlayback(state.player.currentTime);
    saveSong(state.song);
    showToast('คืนค่าคอร์ดจาก AI ดั้งเดิมแล้ว');
  }
});

// Undo / Redo Toolbar Controls
const undoBtn = $('#undoButton');
const redoBtn = $('#redoButton');
if (undoBtn) {
  undoBtn.addEventListener('click', function () {
    if (window.undoManager) window.undoManager.undo();
  });
}
if (redoBtn) {
  redoBtn.addEventListener('click', function () {
    if (window.undoManager) window.undoManager.redo();
  });
}
if (window.undoManager) {
  window.undoManager.subscribe(function (status) {
    if (undoBtn) undoBtn.disabled = !status.canUndo;
    if (redoBtn) redoBtn.disabled = !status.canRedo;
  });
  window.undoManager.bindKeyboardShortcuts(window);
}

// Standard MIDI (.mid) Export
const exportMidiBtn = $('#exportMidiButton');
if (exportMidiBtn) {
  exportMidiBtn.addEventListener('click', function () {
    if (!state.song) {
      showToast('กรุณาวิเคราะห์หรือเปิดเพลงก่อนส่งออก MIDI');
      return;
    }
    const exporter = window.midiExport || (window.ZixelMidi ? window.ZixelMidi : null);
    if (exporter && typeof exporter.downloadMidi === 'function') {
      exporter.downloadMidi(state.song, state.song.title);
      showToast('ส่งออกไฟล์ Standard MIDI (.mid) เรียบร้อยแล้ว');
    } else {
      showToast('MIDI Export Engine ยังไม่พร้อมทำงาน');
    }
  });
}

$('#instrumentSelect').addEventListener('change', function () {
  state.instrument = this.value;
  state._renderedChordKey = null;
  renderChordDiagram(chordAt(state.player ? state.player.currentTime : 0).chord);
});
$('#transposeDown').addEventListener('click', function () {
  if (state.song && state.transpose > -12) { state.transpose -= 1; state._renderedChordKey = null; renderSong(); }
});
$('#transposeUp').addEventListener('click', function () {
  if (state.song && state.transpose < 12) { state.transpose += 1; state._renderedChordKey = null; renderSong(); }
});

$('#copyButton').addEventListener('click', async function () {
  if (!state.song) return;
  try {
    await navigator.clipboard.writeText(exportText());
    showToast('คัดลอกคอร์ดทั้งหมดลงคลิปบอร์ดแล้ว');
  } catch (err) {
    showToast('กรุณาอนุญาตการเข้าถึงคลิปบอร์ดในเบราว์เซอร์');
  }
});

// Export Menu
$('#exportMenuButton').addEventListener('click', function (e) {
  e.stopPropagation();
  $('#exportDropdown').classList.toggle('hidden');
});
document.addEventListener('click', function () { $('#exportDropdown').classList.add('hidden'); });
document.querySelectorAll('#exportDropdown button').forEach(function (btn) {
  btn.addEventListener('click', function () { handleExport(btn.dataset.export); });
});

$('#backButton').addEventListener('click', function () {
  clearAudio();
  state.song = null;
  $('#workspace').classList.add('hidden');
  $('#audioFile').value = '';
  setText('#audioFileName', 'คลิกหรือลากไฟล์เสียงมาวางที่นี่');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('#libraryButton').addEventListener('click', function () { $('#libraryPanel').classList.remove('hidden'); });
const cockpitLibBtn = $('#cockpitLibraryTrigger');
if (cockpitLibBtn) cockpitLibBtn.addEventListener('click', function () { $('#libraryPanel').classList.remove('hidden'); });
$('#closeLibrary').addEventListener('click', function () { $('#libraryPanel').classList.add('hidden'); });
if (window.location.hash === '#library') {
  setTimeout(() => { if ($('#libraryPanel')) $('#libraryPanel').classList.remove('hidden'); }, 300);
}
window.addEventListener('hashchange', function () {
  if (window.location.hash === '#library' && $('#libraryPanel')) {
    $('#libraryPanel').classList.remove('hidden');
  }
});

// Paste Lyrics Modal Buttons
if ($('#pasteLyricsButton')) $('#pasteLyricsButton').addEventListener('click', openLyricsModal);
if ($('#editLyricsBtn')) $('#editLyricsBtn').addEventListener('click', openLyricsModal);
if ($('#closeLyricsModal')) $('#closeLyricsModal').addEventListener('click', closeLyricsModal);
if ($('#cancelLyricsBtn')) $('#cancelLyricsBtn').addEventListener('click', closeLyricsModal);
if ($('#saveLyricsBtn')) $('#saveLyricsBtn').addEventListener('click', savePastedLyrics);

// Stage Mode
$('#stageMode').addEventListener('click', function () {
  if (!state.song) return;
  state.stageMode = true;
  $('#stageOverlay').classList.remove('hidden');
  setText('#stageTitle', state.song.title);
  setText('#stageKey', 'Key: ' + transposeKey(state.song.key, state.transpose));
  updatePlayback(state.player.currentTime);
});
$('#stageClose').addEventListener('click', function () {
  state.stageMode = false;
  $('#stageOverlay').classList.add('hidden');
});

// Wide Mode Toggle (ขยายการ์ด Jam Card เต็มความกว้างหน้าจอ)
function setWideMode(enabled) {
  const layout = $('#practiceLayout');
  const btn = $('#wideModeBtn');
  const label = $('#wideModeLabel');
  if (!layout) return;
  layout.classList.toggle('wide-mode', enabled);
  if (btn) btn.classList.toggle('active', enabled);
  if (label) label.textContent = enabled ? 'ย่อแถบข้าง' : 'ขยายกว้าง';
  try {
    localStorage.setItem('zixel_wide_mode', enabled ? 'true' : 'false');
  } catch (err) {}
}

if ($('#wideModeBtn')) {
  $('#wideModeBtn').addEventListener('click', function () {
    const layout = $('#practiceLayout');
    const isWide = layout ? layout.classList.contains('wide-mode') : false;
    setWideMode(!isWide);
  });
}
try {
  if (localStorage.getItem('zixel_wide_mode') === 'true') {
    setWideMode(true);
  }
} catch (err) {}

// ─── Pitch Shift Event Listeners ───────────────────────────────────────────
if ($('#pitchDown')) {
  $('#pitchDown').addEventListener('click', function () {
    if (state.pitchShift > -12) setPitchShift(state.pitchShift - 1);
  });
}
if ($('#pitchUp')) {
  $('#pitchUp').addEventListener('click', function () {
    if (state.pitchShift < 12) setPitchShift(state.pitchShift + 1);
  });
}
if ($('#pitchReset')) {
  $('#pitchReset').addEventListener('click', function () {
    setPitchShift(0);
  });
}

// ─── Stem Separation Event Listeners ───────────────────────────────────────
if ($('#stemSeparateButton')) {
  $('#stemSeparateButton').addEventListener('click', startStemSeparation);
}
if ($('#stemStartBtn')) {
  $('#stemStartBtn').addEventListener('click', startStemSeparation);
}
if ($('#stemResetBtn')) {
  $('#stemResetBtn').addEventListener('click', function () {
    clearStemSession();
    const idleState = $('#stemIdleState');
    const tracksState = $('#stemTracksState');
    if (idleState) idleState.classList.remove('hidden');
    if (tracksState) tracksState.classList.add('hidden');
    setText('#stemMixerStatus', ' — กด "แยกแทร็กเสียง" เพื่อเริ่มต้น');
    showToast('คืนเสียงต้นฉบับแล้ว');
  });
}

// Keyboard shortcuts for pitch shift: Shift+[ and Shift+]
document.addEventListener('keydown', function (e) {
  if (!state.song || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (e.shiftKey && e.key === '{') { e.preventDefault(); if (state.pitchShift > -12) setPitchShift(state.pitchShift - 1); }
  if (e.shiftKey && e.key === '}') { e.preventDefault(); if (state.pitchShift < 12) setPitchShift(state.pitchShift + 1); }
});

// ─── Interactive MIDI Practice Mode & Full 88-Key Concert Grand Piano ─────────
const PIANO_PRESETS = {
  88: { startMidi: 21, endMidi: 108, name: '88 คีย์ (Grand Piano จริง A0–C8)' },
  76: { startMidi: 28, endMidi: 103, name: '76 คีย์ (E1–G7 Stage Piano)' },
  61: { startMidi: 36, endMidi: 96,  name: '61 คีย์ (C2–C7 Standard Synth)' },
  49: { startMidi: 36, endMidi: 84,  name: '49 คีย์ (C2–C6 Studio)' },
  25: { startMidi: 48, endMidi: 72,  name: '25 คีย์ (C3–C5 Compact)' }
};

state.pianoSize = 88; // Default to full 88-key acoustic grand piano!
state.pianoTheme = 'dark'; // Default to dark studio aesthetic matching user blueprint!
state.pianoLabels = 'all'; // 'all' | 'c-only'
state.pianoAutoScroll = true;

function updatePracticeHUD(targetChord) {
  const currentTarget = targetChord || (state.song ? transposeChord(chordAt(state.player.currentTime).chord, state.transpose) : '—');
  state.currentTargetChord = currentTarget;

  setText('#evalTargetChord', currentTarget);

  let targetNotes = [];
  let targetPCs = [];
  const engine = window.midiEngine || (window.ZixelMidiEngine ? window.ZixelMidiEngine.midiEngine : null);

  if (engine && typeof engine.getChordNotes === 'function') {
    const chordInfo = engine.getChordNotes(currentTarget);
    targetNotes = chordInfo.notes || [];
    targetPCs = chordInfo.pitchClasses || [];
    setText('#evalTargetNotes', targetNotes.length > 0 ? 'โน้ตในคอร์ด: ' + targetNotes.join(', ') : 'พักมือ (No Chord)');

    // Evaluate currently pressed MIDI notes against target chord
    const evalRes = engine.evaluateChord(currentTarget);
    setText('#evalAccuracyScore', evalRes.score + '%');
    const fill = $('#evalMeterFill');
    if (fill) {
      fill.style.width = Math.min(100, Math.max(0, evalRes.score)) + '%';
      if (evalRes.score >= 80) fill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      else if (evalRes.score >= 40) fill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      else fill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
    }
    setText('#evalFeedback', evalRes.feedback || '');
    setText('#evalPressedNotes', evalRes.pressedNotes && evalRes.pressedNotes.length > 0 ? evalRes.pressedNotes.join(', ') : '—');
  }

  updateVirtualPianoKeys(targetPCs);

  // Auto-scroll piano view to keep current chord visible if enabled
  if (state.pianoAutoScroll && targetPCs.length > 0) {
    const stage = $('#pianoStage');
    if (stage) {
      // Find middle octave target key (around C4 = 60)
      const targetMidi = 60 + targetPCs[0];
      const activeKey = document.querySelector(`.piano-key[data-midi="${targetMidi}"]`) ||
                        document.querySelector(`.piano-key.active-target`);
      if (activeKey) {
        const keyLeft = activeKey.offsetLeft;
        const stageWidth = stage.clientWidth;
        const targetScroll = keyLeft - (stageWidth / 2) + (activeKey.clientWidth / 2);
        stage.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }
}

function updateVirtualPianoKeys(targetPitchClasses = []) {
  const keys = document.querySelectorAll('.piano-key');
  if (!keys || keys.length === 0) return;

  const targetSet = new Set(targetPitchClasses);
  const engine = window.midiEngine || (window.ZixelMidiEngine ? window.ZixelMidiEngine.midiEngine : null);
  const activeMidiNotes = engine ? engine.activeNotes : new Set();

  keys.forEach(function (key) {
    const midi = Number(key.dataset.midi);
    const pc = Number(key.dataset.pc);
    const isPressed = activeMidiNotes.has(midi);
    const isTarget = targetSet.has(pc);

    key.classList.remove('active-target', 'active-pressed', 'active-both');

    if (isPressed && isTarget) {
      key.classList.add('active-both');
    } else if (isPressed) {
      key.classList.add('active-pressed');
    } else if (isTarget) {
      key.classList.add('active-target');
    }
  });
}

function scrollPianoToNote(targetMidi) {
  const stage = $('#pianoStage');
  if (!stage) return;
  const key = document.querySelector(`.piano-key[data-midi="${targetMidi}"]`);
  if (key) {
    const targetScroll = key.offsetLeft - (stage.clientWidth / 2) + (key.clientWidth / 2);
    stage.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }
}

function initVirtualPiano(presetSize = state.pianoSize || 88) {
  state.pianoSize = presetSize;
  const piano = $('#virtualPiano');
  if (!piano) return;
  piano.replaceChildren();

  // Apply theme class
  piano.className = 'virtual-piano theme-' + (state.pianoTheme || 'dark');

  const preset = PIANO_PRESETS[presetSize] || PIANO_PRESETS[88];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const blackPitchClasses = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
  const engine = window.midiEngine || (window.ZixelMidiEngine ? window.ZixelMidiEngine.midiEngine : null);

  for (let midi = preset.startMidi; midi <= preset.endMidi; midi++) {
    const pc = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    const isBlack = blackPitchClasses.includes(pc);
    const isMiddleC = midi === 60; // C4
    const name = noteNames[pc] + oct;

    const keyDiv = document.createElement('div');
    keyDiv.className = 'piano-key ' + (isBlack ? 'black' : 'white') + (isMiddleC ? ' middle-c' : '');
    keyDiv.dataset.midi = String(midi);
    keyDiv.dataset.pc = String(pc);
    keyDiv.dataset.name = name;

    const label = document.createElement('span');
    if (state.pianoLabels === 'all') {
      label.textContent = isBlack ? (oct >= 2 && oct <= 5 ? name : '') : name;
    } else {
      // C-only labels like authentic grand pianos
      if (pc === 0) {
        label.textContent = isMiddleC ? '★ C4' : name;
      } else {
        label.textContent = '';
      }
    }
    keyDiv.appendChild(label);

    // Mouse interactive controls
    keyDiv.addEventListener('mousedown', function (e) {
      e.preventDefault();
      if (engine && typeof engine.noteOn === 'function') engine.noteOn(midi, 100);
      updatePracticeHUD(state.currentTargetChord);
    });
    keyDiv.addEventListener('mouseup', function () {
      if (engine && typeof engine.noteOff === 'function') engine.noteOff(midi);
      updatePracticeHUD(state.currentTargetChord);
    });
    keyDiv.addEventListener('mouseleave', function () {
      if (engine && engine.activeNotes && engine.activeNotes.has(midi)) {
        engine.noteOff(midi);
        updatePracticeHUD(state.currentTargetChord);
      }
    });

    // Touch controls for mobile / touch screens
    keyDiv.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (engine && typeof engine.noteOn === 'function') engine.noteOn(midi, 100);
      updatePracticeHUD(state.currentTargetChord);
    });
    keyDiv.addEventListener('touchend', function (e) {
      e.preventDefault();
      if (engine && typeof engine.noteOff === 'function') engine.noteOff(midi);
      updatePracticeHUD(state.currentTargetChord);
    });

    piano.appendChild(keyDiv);
  }

  // Update button active states in toolbar
  document.querySelectorAll('.piano-preset-btn').forEach(function (btn) {
    btn.classList.toggle('active', Number(btn.dataset.size) === presetSize);
  });

  // Center view on Middle C (C4 = 60) on initial render
  setTimeout(function () {
    scrollPianoToNote(60);
  }, 100);
}

function initMidiPractice() {
  initVirtualPiano(88);

  // Wire Piano Toolbar Presets
  document.querySelectorAll('.piano-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const size = Number(btn.dataset.size);
      initVirtualPiano(size);
    });
  });

  // Wire Octave Jump Buttons
  document.querySelectorAll('.piano-oct-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetMidi = Number(btn.dataset.targetNote);
      scrollPianoToNote(targetMidi);
      document.querySelectorAll('.piano-oct-btn').forEach(b => b.classList.remove('active-oct'));
      btn.classList.add('active-oct');
    });
  });

  // Wire Theme Toggle
  const themeBtn = $('#pianoThemeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      state.pianoTheme = state.pianoTheme === 'dark' ? 'ivory' : 'dark';
      setText('#pianoThemeLabel', state.pianoTheme === 'dark' ? 'ธีม: Dark Studio' : 'ธีม: Classic Ivory');
      const piano = $('#virtualPiano');
      if (piano) {
        piano.className = 'virtual-piano theme-' + state.pianoTheme;
      }
    });
  }

  // Wire Labels Toggle
  const labelsBtn = $('#pianoLabelsBtn');
  if (labelsBtn) {
    labelsBtn.addEventListener('click', function () {
      state.pianoLabels = state.pianoLabels === 'all' ? 'c-only' : 'all';
      setText('#pianoLabelsLabel', state.pianoLabels === 'all' ? 'ชื่อโน้ต: ทั้งหมด' : 'ชื่อโน้ต: เฉพาะ C');
      initVirtualPiano(state.pianoSize);
    });
  }

  // Wire Auto-Scroll Checkbox
  const autoScrollCb = $('#pianoAutoScroll');
  if (autoScrollCb) {
    autoScrollCb.addEventListener('change', function () {
      state.pianoAutoScroll = this.checked;
    });
  }

  const engine = window.midiEngine || (window.ZixelMidiEngine ? window.ZixelMidiEngine.midiEngine : null);
  if (!engine) return;

  engine.subscribe(function (event) {
    if (event.type === 'noteOn' || event.type === 'noteOff') {
      updatePracticeHUD(state.currentTargetChord);
    } else if (event.type === 'status' || event.type === 'deviceChange') {
      const isConnected = engine.status === 'connected';
      const indicator = $('#midiIndicator');
      const label = $('#midiDeviceLabel');
      if (indicator) indicator.classList.toggle('connected', isConnected);
      if (label) {
        const inputs = typeof engine.getInputs === 'function' ? engine.getInputs() : [];
        if (inputs.length > 0) {
          label.textContent = 'MIDI: ' + inputs.map(function (i) { return i.name; }).join(', ');
        } else {
          label.textContent = isConnected ? 'MIDI: พร้อมเชื่อมต่ออุปกรณ์' : 'MIDI: ยังไม่ได้เชื่อมต่อ';
        }
      }
    }
  });

  const connectBtn = $('#midiConnectBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async function () {
      connectBtn.disabled = true;
      connectBtn.textContent = 'กำลังตรวจหา...';
      const success = await engine.init();
      if (success) {
        showToast('เชื่อมต่อ Web MIDI สำเร็จ พร้อมรับสัญญาณจากคีย์บอร์ด 88 คีย์');
        connectBtn.textContent = 'เชื่อมต่อแล้ว';
      } else {
        showToast('ไม่พบอุปกรณ์ MIDI หรือเบราว์เซอร์ไม่อนุญาต (ยังสามารถคลิกลิ่มเปียโนจำลองได้)');
        connectBtn.textContent = 'ลองเชื่อมต่อใหม่';
        connectBtn.disabled = false;
      }
    });
  }
}

// ─── Cuberto Interactive Fluid Follower Cursor Engine ───
function initCubertoCursor() {
  if (window.__luxuryCursorInitialized) return;
  const cursor = $('#cbCursor');
  const cursorText = $('#cbCursorText');
  if (!cursor) return;

  // Gracefully skip on touch devices
  if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let isMouseDown = false;
  let isVisible = false;

  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isVisible) {
      isVisible = true;
      cursor.style.opacity = '1';
    }
  }, { passive: true });

  window.addEventListener('mousedown', function () {
    isMouseDown = true;
    cursor.classList.add('cb-active');
  });

  window.addEventListener('mouseup', function () {
    isMouseDown = false;
    cursor.classList.remove('cb-active');
  });

  // Smooth Lerp Loop (60fps)
  function renderCursor() {
    const ease = 0.22;
    cursorX += (mouseX - cursorX) * ease;
    cursorY += (mouseY - cursorY) * ease;
    cursor.style.transform = 'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0px) translate(-50%, -50%)' + (isMouseDown ? ' scale(0.85)' : '');
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Delegation for hover states
  document.addEventListener('mouseover', function (e) {
    const target = e.target;
    if (!target) return;

    const interactive = target.closest('button, a, input, select, textarea, .luxury-upload-box, .chord-button, .view-tab, .source-tab, .lyrics-line, .metric-pill, .speed-btn, .loop-btn, .pitch-btn');
    if (interactive) {
      cursor.classList.add('cb-hover');
      if (interactive.classList.contains('luxury-upload-box') || interactive.id === 'analyzeButton') {
        if (cursorText) cursorText.textContent = 'OPEN';
        cursor.classList.add('cb-text-mode');
      } else if (interactive.id === 'playPause') {
        const isPlaying = state.player && !state.player.paused;
        if (cursorText) cursorText.textContent = isPlaying ? 'PAUSE' : 'PLAY';
        cursor.classList.add('cb-text-mode');
      } else {
        if (cursorText) cursorText.textContent = '';
        cursor.classList.remove('cb-text-mode');
      }
    }
  });

  document.addEventListener('mouseout', function (e) {
    const target = e.target;
    if (!target) return;
    const interactive = target.closest('button, a, input, select, textarea, .luxury-upload-box, .chord-button, .view-tab, .source-tab, .lyrics-line, .metric-pill, .speed-btn, .loop-btn, .pitch-btn');
    if (interactive) {
      cursor.classList.remove('cb-hover', 'cb-text-mode');
      if (cursorText) cursorText.textContent = '';
    }
  });

  document.addEventListener('mouseleave', function () {
    cursor.style.opacity = '0';
    isVisible = false;
  });

  document.addEventListener('mouseenter', function () {
    cursor.style.opacity = '1';
    isVisible = true;
  });
}

// ─── Cuberto Authentication Module ───
let authMode = 'login'; // 'login' or 'register'

function updateUserUI(user) {
  state.currentUser = user;
  const authBtnLabel = $('#authBtnLabel');
  const authDefaultIcon = $('#authDefaultIcon');
  const authAvatarChip = $('#authAvatarChip');
  const userDisplayName = $('#userDisplayName');
  const userUsername = $('#userUsername');
  const userAvatarCircle = $('#userAvatarCircle');

  if (user) {
    const initials = (user.displayName || user.username || 'U').slice(0, 2).toUpperCase();
    if (authBtnLabel) authBtnLabel.textContent = user.displayName || user.username;
    if (authDefaultIcon) authDefaultIcon.classList.add('hidden');
    if (authAvatarChip) {
      authAvatarChip.textContent = initials;
      authAvatarChip.classList.remove('hidden');
    }
    if (userDisplayName) userDisplayName.textContent = user.displayName || user.username;
    if (userUsername) userUsername.textContent = '@' + user.username;
    if (userAvatarCircle) userAvatarCircle.textContent = initials;
  } else {
    if (authBtnLabel) authBtnLabel.textContent = 'เข้าสู่ระบบ';
    if (authDefaultIcon) authDefaultIcon.classList.remove('hidden');
    if (authAvatarChip) authAvatarChip.classList.add('hidden');
    if (userDisplayName) userDisplayName.textContent = 'Guest';
    if (userUsername) userUsername.textContent = '@guest';
    if (userAvatarCircle) userAvatarCircle.textContent = 'ZC';
  }
}

async function checkAuthStatus() {
  try {
    const headers = {};
    if (state.authToken) headers['Authorization'] = 'Bearer ' + state.authToken;
    const res = await fetch('/api/auth/me', { headers: headers, cache: 'no-store' });
    if (!res.ok) throw new Error('Auth check failed');
    const data = await res.json();
    if (data.authenticated && data.user) {
      updateUserUI(data.user);
    } else {
      updateUserUI(null);
      state.authToken = null;
      try { localStorage.removeItem('zc_auth_token'); } catch (_) {}
    }
  } catch (err) {
    console.warn('[Auth] Status check skipped:', err);
    updateUserUI(null);
  }
}

function openAuthModal(mode) {
  authMode = mode || 'login';
  switchAuthMode(authMode);
  const modal = $('#authModal');
  const errorMsg = $('#authErrorMsg');
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
  }
  if (modal) modal.classList.remove('hidden');
  const userDropdown = $('#userMenuDropdown');
  if (userDropdown) userDropdown.classList.add('hidden');
}

function closeAuthModal() {
  const modal = $('#authModal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === 'login';
  const tabLogin = $('#authTabLogin');
  const tabRegister = $('#authTabRegister');
  const title = $('#authModalTitle');
  const displayNameGroup = $('#displayNameGroup');
  const submitLabel = $('#authSubmitLabel');
  const switchText = $('#authSwitchText');
  const switchReg = $('#authSwitchToRegister');
  const switchLog = $('#authSwitchToLogin');

  if (tabLogin) tabLogin.classList.toggle('active', isLogin);
  if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
  if (title) title.textContent = isLogin ? 'เข้าสู่ระบบ Zixel' : 'สมัครสมาชิก Zixel';
  if (displayNameGroup) displayNameGroup.classList.toggle('hidden', isLogin);
  if (submitLabel) submitLabel.textContent = isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้';
  if (switchText) switchText.textContent = isLogin ? 'ยังไม่มีบัญชีใช่ไหม?' : 'มีบัญชีอยู่แล้วใช่ไหม?';
  if (switchReg) switchReg.classList.toggle('hidden', !isLogin);
  if (switchLog) switchLog.classList.toggle('hidden', isLogin);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const usernameInput = $('#authUsername');
  const passwordInput = $('#authPassword');
  const displayNameInput = $('#authDisplayName');
  const errorMsg = $('#authErrorMsg');
  const submitBtn = $('#authSubmitBtn');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const displayName = displayNameInput ? displayNameInput.value.trim() : '';

  if (!username || !password) {
    if (errorMsg) {
      errorMsg.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (errorMsg) errorMsg.classList.add('hidden');

  try {
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = { username: username, password: password };
    if (authMode === 'register' && displayName) payload.displayName = displayName;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'การเข้าสู่ระบบล้มเหลว');

    state.authToken = data.token;
    try { localStorage.setItem('zc_auth_token', data.token); } catch (_) {}
    updateUserUI(data.user);
    closeAuthModal();
    showToast(authMode === 'login' ? 'ยินดีต้อนรับกลับ, ' + (data.user.displayName || data.user.username) : 'สร้างบัญชีสำเร็จ ยินดีต้อนรับสู่ Zixel Studio!');
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleLogout() {
  try {
    const headers = {};
    if (state.authToken) headers['Authorization'] = 'Bearer ' + state.authToken;
    await fetch('/api/auth/logout', { method: 'POST', headers: headers });
  } catch (_) {}
  state.authToken = null;
  try { localStorage.removeItem('zc_auth_token'); } catch (_) {}
  updateUserUI(null);
  const userDropdown = $('#userMenuDropdown');
  if (userDropdown) userDropdown.classList.add('hidden');
  showToast('ออกจากระบบเรียบร้อยแล้ว');
}

function initAuthUI() {
  const authTriggerBtn = $('#authTriggerBtn');
  const userDropdown = $('#userMenuDropdown');
  const closeAuthBtn = $('#closeAuthModal');
  const authModal = $('#authModal');
  const tabLogin = $('#authTabLogin');
  const tabRegister = $('#authTabRegister');
  const authForm = $('#authForm');
  const logoutBtn = $('#logoutBtn');
  const userLibraryShortcut = $('#userLibraryShortcut');

  if (authTriggerBtn) {
    authTriggerBtn.addEventListener('click', function (e) {
      if (state.currentUser) {
        e.preventDefault();
        e.stopPropagation();
        if (userDropdown) userDropdown.classList.toggle('hidden');
      } else if (authTriggerBtn.tagName === 'BUTTON') {
        openAuthModal('login');
      }
    });
  }

  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
  if (authModal) {
    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (tabLogin) tabLogin.addEventListener('click', function () { switchAuthMode('login'); });
  if (tabRegister) tabRegister.addEventListener('click', function () { switchAuthMode('register'); });

  const switchReg = $('#authSwitchToRegister');
  if (switchReg) switchReg.addEventListener('click', function (e) { e.preventDefault(); switchAuthMode('register'); });
  const switchLog = $('#authSwitchToLogin');
  if (switchLog) switchLog.addEventListener('click', function (e) { e.preventDefault(); switchAuthMode('login'); });

  if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  if (userLibraryShortcut) {
    userLibraryShortcut.addEventListener('click', function () {
      if (userDropdown) userDropdown.classList.add('hidden');
      const libBtn = $('#libraryButton');
      if (libBtn) libBtn.click();
    });
  }

  // Click outside user dropdown to close it
  document.addEventListener('click', function (e) {
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      if (!userDropdown.contains(e.target) && e.target !== authTriggerBtn) {
        userDropdown.classList.add('hidden');
      }
    }
  });

  checkAuthStatus();
}

// ══════════════════════════════════════════════════════════════════════════
// CUBERTO MUSIC TOOLS: GUITAR TUNER, CHORD CHART & VIRTUAL JAM STUDIO
// ══════════════════════════════════════════════════════════════════════════

let studioAudioCtx = null;
function getStudioAudioCtx() {
  if (!studioAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) studioAudioCtx = new AudioCtx();
  }
  if (studioAudioCtx && studioAudioCtx.state === 'suspended') {
    studioAudioCtx.resume();
  }
  return studioAudioCtx;
}

// ─── 1. GUITAR TUNER ENGINE ───
let tunerAudioCtx = null;
let tunerAnalyser = null;
let tunerMicStream = null;
let tunerRafId = null;
let isTunerListening = false;
const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function autoCorrelate(buf, sampleRate) {
  const size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.012) return -1; // Background silence

  let r1 = 0, r2 = size - 1, thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
  }
  const slice = buf.slice(r1, r2);
  const c = new Array(slice.length).fill(0);
  for (let i = 0; i < slice.length; i++) {
    for (let j = 0; j < slice.length - i; j++) {
      c[i] = c[i] + slice[j] * slice[j + i];
    }
  }
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < slice.length; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 > 0 && T0 < slice.length - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }
  return sampleRate / T0;
}

function updateTunerPitch() {
  if (!isTunerListening || !tunerAnalyser) return;
  const buffer = new Float32Array(tunerAnalyser.fftSize);
  tunerAnalyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, tunerAudioCtx.sampleRate);

  const noteEl = $('#tunerNote');
  const octaveEl = $('#tunerOctave');
  const freqEl = $('#tunerFreq');
  const centsEl = $('#tunerCents');
  const needleEl = $('#tunerNeedle');
  const badgeEl = $('#tunerStatusBadge');

  if (freq !== -1 && freq >= 60 && freq <= 1200) {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
    const rounded = Math.round(noteNum);
    const noteName = NOTE_STRINGS[rounded % 12];
    const octave = Math.floor(rounded / 12) - 1;
    const standardFreq = 440 * Math.pow(2, (rounded - 69) / 12);
    const cents = Math.floor(1200 * Math.log(freq / standardFreq) / Math.log(2));

    if (noteEl) noteEl.textContent = noteName;
    if (octaveEl) octaveEl.textContent = octave;
    if (freqEl) freqEl.textContent = freq.toFixed(1) + ' Hz';
    if (centsEl) centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' cents';

    // Update needle position
    const clampedCents = Math.max(-50, Math.min(50, cents));
    const needlePct = 50 + clampedCents;
    if (needleEl) {
      needleEl.style.left = needlePct + '%';
      if (Math.abs(cents) <= 4) {
        needleEl.classList.add('in-tune');
        if (noteEl) noteEl.classList.add('in-tune');
      } else {
        needleEl.classList.remove('in-tune');
        if (noteEl) noteEl.classList.remove('in-tune');
      }
    }

    if (badgeEl) {
      badgeEl.className = 'tuner-status-badge';
      if (Math.abs(cents) <= 4) {
        badgeEl.classList.add('in-tune');
        badgeEl.textContent = 'ตรงคีย์แล้ว (IN TUNE)';
      } else if (cents < -4) {
        badgeEl.classList.add('flat');
        badgeEl.textContent = 'เสียงต่ำไป (FLAT ♭)';
      } else {
        badgeEl.classList.add('sharp');
        badgeEl.textContent = 'เสียงสูงไป (SHARP ♯)';
      }
    }
  }

  tunerRafId = requestAnimationFrame(updateTunerPitch);
}

async function startTunerMic() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!tunerAudioCtx) tunerAudioCtx = new AudioCtx();
    if (tunerAudioCtx.state === 'suspended') await tunerAudioCtx.resume();

    tunerMicStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    const source = tunerAudioCtx.createMediaStreamSource(tunerMicStream);
    tunerAnalyser = tunerAudioCtx.createAnalyser();
    tunerAnalyser.fftSize = 2048;
    source.connect(tunerAnalyser);

    isTunerListening = true;
    const btn = $('#tunerMicToggle');
    if (btn) {
      btn.classList.add('active');
      $('#tunerMicLabel').textContent = 'กำลังตรวจจับเสียง... (คลิกเพื่อหยุด)';
      $('#tunerMicIcon').textContent = '⏹️';
    }
    const badge = $('#tunerStatusBadge');
    if (badge) badge.textContent = 'กำลังฟังเสียงเครื่องดนตรี...';
    updateTunerPitch();
  } catch (err) {
    console.warn('[Tuner] Mic error:', err);
    const badge = $('#tunerStatusBadge');
    if (badge) {
      badge.textContent = 'ไม่สามารถเข้าถึงไมค์ได้ (กรุณาอนุญาตสิทธิ์ไมโครโฟน)';
      badge.classList.add('sharp');
    }
  }
}

function stopTunerMic() {
  isTunerListening = false;
  if (tunerRafId) cancelAnimationFrame(tunerRafId);
  if (tunerMicStream) {
    tunerMicStream.getTracks().forEach(t => t.stop());
    tunerMicStream = null;
  }
  const btn = $('#tunerMicToggle');
  if (btn) {
    btn.classList.remove('active');
    $('#tunerMicLabel').textContent = 'เปิดไมค์ตรวจจับเสียงสด';
    $('#tunerMicIcon').textContent = '✦';
  }
  const badge = $('#tunerStatusBadge');
  if (badge) badge.textContent = 'พร้อมใช้งาน';
  const needle = $('#tunerNeedle');
  if (needle) {
    needle.style.left = '50%';
    needle.classList.remove('in-tune');
  }
  const noteEl = $('#tunerNote');
  if (noteEl) noteEl.classList.remove('in-tune');
}

function playGuitarStringTone(freq, noteName) {
  const ctx = getStudioAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Rich plucked acoustic string harmonics
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, now);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 6, now);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.8);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 2.3);
  osc2.stop(now + 2.3);

  // Update visual tuner values
  const noteEl = $('#tunerNote');
  const freqEl = $('#tunerFreq');
  const centsEl = $('#tunerCents');
  const needle = $('#tunerNeedle');
  const badge = $('#tunerStatusBadge');

  if (noteEl) {
    noteEl.textContent = noteName.replace(/[0-9]/g, '');
    noteEl.classList.add('in-tune');
  }
  if (freqEl) freqEl.textContent = freq.toFixed(1) + ' Hz';
  if (centsEl) centsEl.textContent = '0 cents (เสียงมาตรฐาน)';
  if (needle) {
    needle.style.left = '50%';
    needle.classList.add('in-tune');
  }
  if (badge) {
    badge.className = 'tuner-status-badge in-tune';
    badge.textContent = 'เสียงมาตรฐาน: สาย ' + noteName;
  }
}

// ─── 2. CHORD CHART EXPLORER ENGINE ───
const chordChartState = {
  root: 'C',
  quality: '',
  instrument: 'guitar'
};

const CHORD_NOTES_MAP = {
  '': [0, 4, 7],
  'm': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  'sus4': [0, 5, 7],
  'dim': [0, 3, 6]
};

function getNotesForChord(root, quality) {
  const rootIdx = NOTE_STRINGS.indexOf(root);
  if (rootIdx === -1) return [];
  const intervals = CHORD_NOTES_MAP[quality] || [0, 4, 7];
  return intervals.map(semitone => NOTE_STRINGS[(rootIdx + semitone) % 12]);
}

function renderChordChartExplorer() {
  const chordName = chordChartState.root + chordChartState.quality;
  const titleEl = $('#chartChordTitle');
  if (titleEl) {
    const qualText = chordChartState.quality === 'm' ? 'Minor' :
      chordChartState.quality === '7' ? '7th' :
      chordChartState.quality === 'maj7' ? 'Major 7' :
      chordChartState.quality === 'm7' ? 'Minor 7' :
      chordChartState.quality === 'sus4' ? 'Suspended 4' :
      chordChartState.quality === 'dim' ? 'Diminished' : 'Major';
    titleEl.textContent = chordChartState.root + ' ' + qualText;
  }

  const container = $('#chartDiagramContainer');
  if (!container) return;

  const notes = getNotesForChord(chordChartState.root, chordChartState.quality);
  const notesInfo = $('#chartNotesInfo');
  if (notesInfo) notesInfo.textContent = 'โน้ตในคอร์ด: ' + notes.join(' · ');

  if (chordChartState.instrument === 'piano') {
    const rootIdx = NOTE_STRINGS.indexOf(chordChartState.root);
    const intervals = CHORD_NOTES_MAP[chordChartState.quality] || [0, 4, 7];
    const semitones = intervals.map(i => (rootIdx + i) % 12);
    // Double in second octave for nice visual
    const active = semitones.concat(semitones.map(s => s + 12)).filter(s => s < 24);
    container.innerHTML = renderPianoKeyboard(active);
  } else {
    const shapeMap = chordChartState.instrument === 'ukulele' ? UKULELE_SHAPES : GUITAR_SHAPES;
    const shape = standardShapeFor(chordName, shapeMap);
    if (shape) {
      renderFretboard(shape, container, chordChartState.instrument);
    } else {
      container.innerHTML = '<div style="font-size:16px;color:var(--text-muted);padding:30px;">ไม่มีรูปทรงคอร์ดมาตรฐานสำหรับรูปแบบนี้</div>';
    }
  }
}

function strumChordSound(root, quality, instrument) {
  const ctx = getStudioAudioCtx();
  if (!ctx) return;

  const rootIdx = NOTE_STRINGS.indexOf(root);
  const intervals = CHORD_NOTES_MAP[quality] || [0, 4, 7];
  const notes = intervals.map(i => rootIdx + i);

  const baseMidi = instrument === 'ukulele' ? 60 : 48; // C3 for guitar, C4 for ukulele
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
    const now = ctx.currentTime + (i * 0.035); // Gentle realistic strum arpeggiation

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = instrument === 'piano' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 1.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.9);
  });
}

// ─── 3. VIRTUAL JAM STUDIO & SYNTHESIZER ───
let isDrumPlaying = false;
let drumIntervalId = null;
let currentDrumStep = 0;
let drumBpm = 100;
let drumGroove = 'metronome';

function playPianoKey(midi) {
  const ctx = getStudioAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);

  // Polyphonic acoustic piano synthesis
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, now);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 2, now); // Second harmonic overtone

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

function playDrumSound(type) {
  const ctx = getStudioAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (type === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'snare') {
    // Noise burst + body pop
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
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    oscGain.gain.setValueAtTime(0.35, now);
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
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  } else if (type === 'click_hi' || type === 'click_lo') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(type === 'click_hi' ? 1200 : 800, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

function startDrumSequencer() {
  if (isDrumPlaying) return;
  isDrumPlaying = true;
  currentDrumStep = 0;

  const btn = $('#jamToggleBeatBtn');
  if (btn) {
    btn.classList.add('playing');
    $('#jamBeatIcon').textContent = '⏹';
    $('#jamBeatLabel').textContent = 'หยุดจังหวะ';
  }

  const stepDurationMs = (60 / drumBpm / 2) * 1000; // 8th note steps

  drumIntervalId = setInterval(function () {
    const step = currentDrumStep % 8; // 8 eighth-notes = 1 measure of 4/4
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
}

// ─── INITIALIZE ALL 3 NAV TOOLS & MODALS ───
function initCubertoNavTools() {
  // 1. Modals Elements
  const tunerModal = $('#tunerModal');
  const chordChartModal = $('#chordChartModal');
  const onlineJamModal = $('#onlineJamModal');

  // Nav Buttons
  const tunerNavBtn = $('#tunerNavBtn');
  const chordChartNavBtn = $('#chordChartNavBtn');
  const onlineJamNavBtn = $('#onlineJamNavBtn');

  // Close Buttons
  const closeTunerModal = $('#closeTunerModal');
  const closeChordChartModal = $('#closeChordChartModal');
  const closeOnlineJamModal = $('#closeOnlineJamModal');

  // Open Tuner
  if (tunerNavBtn && tunerNavBtn.tagName === 'BUTTON') {
    tunerNavBtn.addEventListener('click', function () {
      getStudioAudioCtx();
      if (tunerModal) tunerModal.classList.remove('hidden');
    });
  }
  if (closeTunerModal) {
    closeTunerModal.addEventListener('click', function () {
      stopTunerMic();
      if (tunerModal) tunerModal.classList.add('hidden');
    });
  }
  if (tunerModal) {
    tunerModal.addEventListener('click', function (e) {
      if (e.target === tunerModal) {
        stopTunerMic();
        tunerModal.classList.add('hidden');
      }
    });
  }

  // Tuner Mic Toggle
  const micToggleBtn = $('#tunerMicToggle');
  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', function () {
      if (isTunerListening) stopTunerMic();
      else startTunerMic();
    });
  }

  // Pluckable Guitar Strings
  document.querySelectorAll('.tuner-str-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const freq = parseFloat(btn.dataset.freq);
      const note = btn.dataset.note;
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
      playGuitarStringTone(freq, note);
    });
  });

  // Open Chord Chart
  if (chordChartNavBtn && chordChartNavBtn.tagName === 'BUTTON') {
    chordChartNavBtn.addEventListener('click', function () {
      getStudioAudioCtx();
      if (chordChartModal) {
        chordChartModal.classList.remove('hidden');
        renderChordChartExplorer();
      }
    });
  }
  if (closeChordChartModal) {
    closeChordChartModal.addEventListener('click', function () {
      if (chordChartModal) chordChartModal.classList.add('hidden');
    });
  }
  if (chordChartModal) {
    chordChartModal.addEventListener('click', function (e) {
      if (e.target === chordChartModal) chordChartModal.classList.add('hidden');
    });
  }

  // Instrument Tabs in Chord Chart
  document.querySelectorAll('#chartInstTabs .chart-inst-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('#chartInstTabs .chart-inst-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      chordChartState.instrument = tab.dataset.inst;
      renderChordChartExplorer();
    });
  });

  // Root Selector in Chord Chart
  document.querySelectorAll('#chordRootSelector .chart-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('#chordRootSelector .chart-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      chordChartState.root = pill.dataset.root;
      renderChordChartExplorer();
    });
  });

  // Quality Selector in Chord Chart
  document.querySelectorAll('#chordQualitySelector .chart-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('#chordQualitySelector .chart-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      chordChartState.quality = pill.dataset.quality;
      renderChordChartExplorer();
    });
  });

  // Play Strum Chord in Chord Chart
  const playChordBtn = $('#chartPlayChordBtn');
  if (playChordBtn) {
    playChordBtn.addEventListener('click', function () {
      strumChordSound(chordChartState.root, chordChartState.quality, chordChartState.instrument);
    });
  }

  // Open Virtual Jam Studio
  if (onlineJamNavBtn && onlineJamNavBtn.tagName === 'BUTTON') {
    onlineJamNavBtn.addEventListener('click', function () {
      getStudioAudioCtx();
      if (onlineJamModal) onlineJamModal.classList.remove('hidden');
    });
  }
  if (closeOnlineJamModal) {
    closeOnlineJamModal.addEventListener('click', function () {
      stopDrumSequencer();
      if (onlineJamModal) onlineJamModal.classList.add('hidden');
    });
  }
  if (onlineJamModal) {
    onlineJamModal.addEventListener('click', function (e) {
      if (e.target === onlineJamModal) {
        stopDrumSequencer();
        onlineJamModal.classList.add('hidden');
      }
    });
  }

  // Instant Chord Pads in Jam Studio
  document.querySelectorAll('#jamChordPads .jam-pad').forEach(function (pad) {
    pad.addEventListener('click', function () {
      const chord = pad.dataset.chord;
      pad.classList.add('pressed');
      setTimeout(() => pad.classList.remove('pressed'), 250);
      const match = /^([A-G][#b]?)(m?)/.exec(chord);
      if (match) {
        strumChordSound(match[1], match[2] || '', 'guitar');
      }
    });
  });

  // Virtual Piano Keys (Mouse / Touch)
  document.querySelectorAll('#jamPianoKeys .jam-key').forEach(function (key) {
    key.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      const midi = parseInt(key.dataset.note, 10);
      key.classList.add('pressed');
      playPianoKey(midi);
    });
    key.addEventListener('pointerup', function () { key.classList.remove('pressed'); });
    key.addEventListener('pointerleave', function () { key.classList.remove('pressed'); });
  });

  // QWERTY Computer Keyboard support for Piano
  const KEY_TO_NOTE = {
    'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65,
    't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71,
    'k': 72, 'o': 73, 'l': 74
  };
  const activeKeys = new Set();

  window.addEventListener('keydown', function (e) {
    if (!onlineJamModal || onlineJamModal.classList.contains('hidden')) return;
    if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    const char = e.key.toLowerCase();
    if (KEY_TO_NOTE[char]) {
      const midi = KEY_TO_NOTE[char];
      if (!activeKeys.has(char)) {
        activeKeys.add(char);
        playPianoKey(midi);
        const keyEl = document.querySelector(`.jam-key[data-key="${char}"]`);
        if (keyEl) keyEl.classList.add('pressed');
      }
    }
  });

  window.addEventListener('keyup', function (e) {
    const char = e.key.toLowerCase();
    if (activeKeys.has(char)) {
      activeKeys.delete(char);
      const keyEl = document.querySelector(`.jam-key[data-key="${char}"]`);
      if (keyEl) keyEl.classList.remove('pressed');
    }
  });

  // Drum Machine Controls
  const jamGrooveSelect = $('#jamGrooveSelect');
  if (jamGrooveSelect) {
    jamGrooveSelect.addEventListener('change', function () {
      drumGroove = jamGrooveSelect.value;
    });
  }

  const bpmSlider = $('#jamBpmSlider');
  const bpmDisplay = $('#jamBpmDisplay');
  if (bpmSlider) {
    bpmSlider.addEventListener('input', function () {
      drumBpm = parseInt(bpmSlider.value, 10);
      if (bpmDisplay) bpmDisplay.textContent = drumBpm;
      if (isDrumPlaying) {
        stopDrumSequencer();
        startDrumSequencer();
      }
    });
  }

  const toggleBeatBtn = $('#jamToggleBeatBtn');
  if (toggleBeatBtn) {
    toggleBeatBtn.addEventListener('click', function () {
      if (isDrumPlaying) stopDrumSequencer();
      else startDrumSequencer();
    });
  }
}

// App Initialization
populateChordOptions();
checkEngine();
initMidiPractice();
initCubertoCursor();
initAuthUI();
initCubertoNavTools();




