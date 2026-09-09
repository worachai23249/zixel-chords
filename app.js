/* ZIXEL CHORDS STUDIO PRO - APPLICATION LOGIC */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_EQUIVALENTS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORD_OPTIONS = ['N.C.'].concat(ROOTS, ROOTS.map(function (root) { return root + 'm'; }), ROOTS.map(function (root) { return root + '7'; }), ROOTS.map(function (root) { return root + 'maj7'; }), ROOTS.map(function (root) { return root + 'm7'; }), ROOTS.map(function (root) { return root + 'sus4'; }), ROOTS.map(function (root) { return root + 'dim'; }));

const GUITAR_SHAPES = {
  C: 'x32010', 'C#': 'x46664', Db: 'x46664', D: 'xx0232', 'D#': 'x68886', Eb: 'x68886', E: '022100',
  F: '133211', 'F#': '244322', G: '320003', Ab: '466544', A: 'x02220', Bb: 'x13331', B: 'x24442',
  Cm: 'x35543', 'C#m': 'x46654', Dm: 'xx0231', 'D#m': 'x68876', Em: '022000', Fm: '133111',
  'F#m': '244222', Gm: '355333', 'G#m': '466444', Am: 'x02210', 'A#m': 'x13321', Bm: 'x24432'
};
const UKULELE_SHAPES = {
  C: '0003', 'C#': '1114', Db: '1114', D: '2220', 'D#': '3331', Eb: '3331', E: '4442',
  F: '2010', 'F#': '3121', G: '0232', Ab: '1343', A: '2100', Bb: '3211', B: '4322',
  Cm: '0333', 'C#m': '1104', Dm: '2210', 'D#m': '3321', Em: '0432', Fm: '1013',
  'F#m': '2120', Gm: '0231', 'G#m': '1342', Am: '2000', 'A#m': '3111', Bm: '4222'
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
  simplifiedChords: false
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
      const stemBadge = song.hasStems ? '<span class="lib-stem-badge">🎛️ แยก 4 แทร็กแล้ว</span>' : '';
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

  // 100% PREVENT SOUND DOUBLING: When stems are active, mute the master player!
  // The master player continues silently to drive timing, timeline, chords, and lyrics.
  if (state.player) {
    state.player.muted = true;
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
  const beats = state.song ? state.song.beats : [];
  let result = beats[0] || { chord: 'N.C.', time: 0, index: 0 };
  beats.forEach(function (beat) { if (beat.time <= time + 0.01) result = beat; });
  return result;
}
function nextChordAfter(time) {
  const current = chordAt(time).chord;
  const next = state.song.beats.find(function (beat) { return beat.time > time && beat.chord !== current && beat.chord !== 'N.C.'; });
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
//  PITCH SHIFT — Web Audio API with SoundTouch (WSOLA)
//  True pitch shifting by N semitones WITHOUT affecting playback speed!
// ═══════════════════════════════════════════════════════════
//  PITCH SHIFT — Web Audio API with SoundTouch (WSOLA)
//  True pitch shifting by N semitones WITHOUT affecting playback speed!
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
    state.pitchSource = state.pitchCtx.createMediaElementSource(state.player);

    const bufferSize = 4096;
    state.pitchNode = state.pitchCtx.createScriptProcessor(bufferSize, 2, 2);

    // Initialize SoundTouch WSOLA engine
    if (typeof window.SoundTouch !== 'undefined') {
      state.soundTouch = new window.SoundTouch();
      if (state.soundTouch.stretch && typeof state.soundTouch.stretch.setParameters === 'function') {
        state.soundTouch.stretch.setParameters(state.pitchCtx.sampleRate || 44100, 0, 0, 8);
      }
      state.soundTouch.pitchSemitones = state.pitchShift || 0;
    }

    const interleavedIn = new Float32Array(bufferSize * 2);
    let fifo = new Float32Array(bufferSize * 8);
    let fifoCount = 0; // count of interleaved samples in FIFO

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

      // 100% clean direct pass-through when 0 semitones (Clean Bypass)
      if (!state.pitchShift || !state.soundTouch) {
        outL.set(inL);
        outR.set(inR);
        fifoCount = 0;
        return;
      }

      // Interleave stereo input: [L0, R0, L1, R1, ...]
      for (let i = 0; i < bufferSize; i++) {
        interleavedIn[i * 2] = inL[i];
        interleavedIn[i * 2 + 1] = inR[i];
      }

      // Feed into SoundTouch WSOLA processor
      state.soundTouch.inputBuffer.putSamples(interleavedIn, 0, bufferSize);
      state.soundTouch.process();

      // Retrieve processed output frames from SoundTouch into FIFO
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

      // Output exactly bufferSize frames (bufferSize * 2 interleaved samples)
      const need = bufferSize * 2;
      if (fifoCount >= need) {
        for (let i = 0; i < bufferSize; i++) {
          outL[i] = fifo[i * 2];
          outR[i] = fifo[i * 2 + 1];
        }
        fifo.copyWithin(0, need, fifoCount);
        fifoCount -= need;
      } else {
        // Buffer warmup pre-roll: output silence while FIFO fills up
        outL.fill(0);
        outR.fill(0);
      }

      // Cap FIFO length to keep audio locked tightly < 160ms
      const maxFifo = bufferSize * 4;
      if (fifoCount > maxFifo) {
        fifo.copyWithin(0, fifoCount - maxFifo, fifoCount);
        fifoCount = maxFifo;
      }
    };

    state.pitchGain = state.pitchCtx.createGain();
    state.pitchGain.gain.value = 1.0;

    // Connect: MediaElementSource -> ScriptProcessor (SoundTouch) -> Gain -> Destination
    state.pitchSource.connect(state.pitchNode);
    state.pitchNode.connect(state.pitchGain);
    state.pitchGain.connect(state.pitchCtx.destination);

    ensurePitchPreserved(state.player);

    // Route any existing stem audios through pitchNode
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
  if (!state.pitchCtx || !state.pitchNode) return;
  if (audio._pitchSource) return;
  try {
    const src = state.pitchCtx.createMediaElementSource(audio);
    src.connect(state.pitchNode);
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

  // Sets pitch shift semitones in SoundTouch WSOLA engine
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
    showToast((state.pitchShift > 0 ? '⬆ เพิ่มเสียง ' : '⬇ ลดเสียง ') + Math.abs(state.pitchShift) + ' ครึ่งเสียง (' + (state.pitchShift > 0 ? '+' : '') + state.pitchShift + ' st)');
  } else {
    showToast('คืนเสียงต้นฉบับแล้ว (0 st)');
  }
}

// ═══════════════════════════════════════════════════════════
//  STEM MIXER — Moises style
// ═══════════════════════════════════════════════════════════
const STEM_META = {
  vocals:      { icon: '🎙️', label: 'เสียงร้อง (Vocals)' },
  guitar:      { icon: '🎸', label: 'กีตาร์ (Guitar)' },
  solo_guitar: { icon: '🎸⚡', label: 'กีตาร์โซโล่ (Solo Guitar)' },
  piano:       { icon: '🎹', label: 'เปียโน (Piano)' },
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

  // Moises-Style Detection Summary
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'stem-detected-summary';
  const detectedLabels = stems.map(function (s) {
    const meta = STEM_META[s];
    return meta ? meta.label.split(' ')[0] : s;
  }).join(', ');

  let summaryHtml = '<span>🎯 ตรวจพบเครื่องดนตรีเฉพาะชิ้น: <strong>' + detectedLabels + '</strong></span>';
  if (absentStems && absentStems.length > 0) {
    const absentLabels = absentStems.map(function (s) {
      const meta = STEM_META[s];
      return meta ? meta.label.split(' ')[0] : s;
    }).join(', ');
    summaryHtml += '<span class="stem-absent-tag">⚡ ไม่พบ ' + absentLabels + ' (ซ่อนแทร็กอัตโนมัติ)</span>';
  }
  summaryDiv.innerHTML = summaryHtml;
  container.append(summaryDiv);

  stems.forEach(function (stem) {
    const meta = STEM_META[stem] || { icon: '🎵', label: stem };
    const row = document.createElement('div');
    row.className = 'stem-track-row';
    row.id = 'stem-row-' + stem;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'stem-track-name';
    nameDiv.innerHTML = '<span class="stem-track-icon">' + meta.icon + '</span>' + meta.label;

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

function syncStemAudios(time) {
  // Sync all stem audio elements with the main player
  const stems = Object.keys(state.stemAudios);
  if (!stems.length) return;
  // Master player MUST be muted when stems are playing to prevent sound doubling
  if (state.player && !state.player.muted) {
    state.player.muted = true;
  }
  const paused = state.player ? state.player.paused : true;
  stems.forEach(function (stem) {
    const audio = state.stemAudios[stem];
    if (!audio) return;
    // Tight synchronization: if drift > 0.08s, realign
    if (Math.abs(audio.currentTime - time) > 0.08) {
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
        $('#engineStatus').classList.remove('offline');
        let label = 'Local AI Engine พร้อมใช้งาน 100%';
        if (status.gpu) {
          label = '🔥 ' + status.gpu + ' (ความเร็วสูงสุด 100%)';
        } else if (status.gpus && status.gpus.length > 0) {
          label = '🔥 ' + status.gpus[0].name + ' (ความเร็วสูงสุด 100%)';
        }
        setText('#engineStatus span.status-label', label);
        $('#engineBanner').classList.add('hidden');
      } else {
        $('#engineStatus').classList.add('offline');
        setText('#engineStatus span.status-label', 'พร้อมติดตั้งโมเดล AI');
        setText('#engineMessageTitle', 'Local AI Engine พร้อมแล้ว');
        setText('#engineMessage', ' — กดเริ่มวิเคราะห์เพลงเพื่อดาวน์โหลดโมเดลคอร์ดและเนื้อเพลงครั้งเดียว');
        $('#downloadModelsButton').classList.remove('hidden');
        $('#setupLink').classList.add('hidden');
        $('#engineBanner').classList.remove('hidden');
      }
    } else {
      $('#engineStatus').classList.add('offline');
      setText('#engineStatus span.status-label', 'ต้องเปิดหรือติดตั้ง AI Engine');
      setText('#engineMessageTitle', 'ยังไม่พบ Local AI Engine');
      setText('#engineMessage', ' — ติดตั้งครั้งเดียวเพื่อใช้โมเดล Transformer บนเครื่องคุณ');
      $('#downloadModelsButton').classList.add('hidden');
      $('#setupLink').classList.remove('hidden');
      $('#engineBanner').classList.remove('hidden');
    }
  } catch (error) {
    state.engineReady = false;
    state.modelsReady = false;
    $('#engineStatus').classList.add('offline');
    setText('#engineStatus span.status-label', 'ออฟไลน์ / กรุณารัน node server.js');
    $('#engineBanner').classList.remove('hidden');
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
  const hasStems = Object.keys(state.stemAudios).length > 0;
  if (hasStems && state.player) {
    state.player.muted = true;
    const curTime = state.player.currentTime || 0;
    Object.values(state.stemAudios).forEach(function (a) {
      try {
        if (Math.abs(a.currentTime - curTime) > 0.05) a.currentTime = curTime;
        a.playbackRate = state.player.playbackRate;
        a.play().catch(function () {});
      } catch (e) {}
    });
  }
  state.playingTimer = window.setInterval(function () {
    const time = state.player.currentTime || 0;
    if (state.loop.enabled && state.loop.a !== null && state.loop.b !== null && time >= state.loop.b) {
      state.player.currentTime = state.loop.a;
      // Seek stems too
      Object.values(state.stemAudios).forEach(function (a) { try { a.currentTime = state.loop.a; } catch (e) {} });
    }
    if (state.metronome.enabled && state.song) {
      const nextBeatObj = state.song.beats.find(function(b) { return b.time > time; });
      if (nextBeatObj && state.metronome.nextBeat !== nextBeatObj.index) {
        if (time >= nextBeatObj.time - 0.1) {
          playMetronomeClick(nextBeatObj.downbeat);
          state.metronome.nextBeat = nextBeatObj.index;
        }
      }
    }
    syncStemAudios(time);
    updatePlayback(time);
  }, 50);
  const playBtnIcon = $('#playPause span.play-icon') || $('#playPause');
  playBtnIcon.textContent = '⏸';
}
function stopTicker() {
  if (state.playingTimer) window.clearInterval(state.playingTimer);
  state.playingTimer = null;
  // Pause all stem audios
  Object.values(state.stemAudios).forEach(function (a) { try { if (!a.paused) a.pause(); } catch (e) {} });
  const playBtnIcon = $('#playPause span.play-icon') || $('#playPause');
  playBtnIcon.textContent = '▶';
}

function renderChordDiagram(chord) {
  const target = $('#chordDiagram');
  if (!target) return;
  const display = transposeChord(chord, state.transpose);
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
  const y = function (fret) { return 27 + (fret - baseFret + 1) * 25; };
  const vertical = Array.from({ length: strings }, function (_, index) {
    return '<line x1="' + x(index) + '" y1="27" x2="' + x(index) + '" y2="152" stroke="rgba(212, 175, 55, 0.4)" stroke-width="1.5"/>';
  }).join('');
  const horizontal = Array.from({ length: 6 }, function (_, index) {
    return '<line x1="26" y1="' + (27 + index * 25) + '" x2="134" y2="' + (27 + index * 25) + '" stroke="rgba(212, 175, 55, 0.4)" stroke-width="' + (index === 0 ? 4 : 1.2) + '"/>';
  }).join('');
  const markers = shape.split('').map(function (item, index) {
    if (item === 'x') return '<text x="' + x(index) + '" y="18" text-anchor="middle" fill="#ef4444" font-size="13">×</text>';
    if (item === '0') return '<text x="' + x(index) + '" y="18" text-anchor="middle" fill="#10b981" font-size="12">○</text>';
    return '<circle cx="' + x(index) + '" cy="' + y(Number(item)) + '" r="7" fill="#d4af37"/>';
  }).join('');
  const base = baseFret > 1 ? '<text x="8" y="57" fill="#d4af37" font-size="10">' + baseFret + 'fr</text>' : '';
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

function renderLyrics() {
  const panel = $('#lyricsPanel');
  if (!panel || !state.song) return;
  panel.replaceChildren();

  if (!state.song.lyrics || !state.song.lyrics.segments || state.song.lyrics.segments.length === 0) {
    panel.innerHTML = '<div class="lyrics-empty"><div class="empty-icon">🎙️</div><p>ยังไม่มีเนื้อร้องในเพลงนี้</p><small>คลิกปุ่มด้านล่างเพื่อวางเนื้อเพลงและซิงค์คอร์ดอัตโนมัติได้ทันที</small><button class="empty-action-btn" id="emptyPasteBtn" type="button">วางเนื้อเพลงเพื่อเริ่มซิงค์</button></div>';
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

    if (segment.words && segment.words.length > 0) {
      segment.words.forEach(function (wordObj) {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'lyrics-word';
        wordSpan.dataset.start = String(wordObj.start);
        wordSpan.dataset.end = String(wordObj.end);
        wordSpan.textContent = wordObj.word + ' ';
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

  if (mode === 'split') {
    if (viewGrid) viewGrid.classList.add('active');
    if (viewLyrics) viewLyrics.classList.add('active');
    if (viewStems) viewStems.classList.remove('active');
  } else if (mode === 'grid') {
    if (viewGrid) viewGrid.classList.add('active');
    if (viewLyrics) viewLyrics.classList.remove('active');
    if (viewStems) viewStems.classList.remove('active');
  } else if (mode === 'stems') {
    if (viewStems) viewStems.classList.add('active');
    if (viewLyrics) viewLyrics.classList.remove('active');
    if (viewGrid) viewGrid.classList.remove('active');
  } else {
    if (viewLyrics) viewLyrics.classList.add('active');
    if (viewGrid) viewGrid.classList.remove('active');
    if (viewStems) viewStems.classList.remove('active');
  }
}

function updatePlayback(time) {
  if (!state.song) return;
  const current = chordAt(time);
  const currentIndex = current.index;
  const currentTChord = transposeChord(current.chord, state.transpose);
  const nextTChord = transposeChord(nextChordAfter(time), state.transpose);

  setText('#currentChord', currentTChord);
  setText('#nextChord', nextTChord);
  setText('#currentTime', formatTime(time));

  // Progress bars
  const pct = Math.min(100, (time / (state.song.duration || 1)) * 100);
  if ($('#progressFill')) $('#progressFill').style.width = pct + '%';
  renderChordDiagram(current.chord);

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

  if (state.song.lyrics && state.song.lyrics.segments && state.song.lyrics.segments.length > 0) {
    const segs = state.song.lyrics.segments;
    let foundIdx = -1;

    for (let i = 0; i < segs.length; i++) {
      if (time >= segs[i].start && time <= segs[i].end) {
        foundIdx = i;
        activeLyricText = segs[i].text;
        if (i + 1 < segs.length) nextLyricText = segs[i + 1].text;
        break;
      } else if (time < segs[i].start && foundIdx === -1) {
        nextLyricText = segs[i].text;
      }
    }

    if (foundIdx === -1 && time < segs[0].start) {
      activeLyricText = '✦ อินโทร (Intro)';
      nextLyricText = segs[0].text;
    } else if (foundIdx === -1 && time > segs[segs.length - 1].end) {
      activeLyricText = '✦ เอาต์โทร (Outro)';
      nextLyricText = 'จบเพลง';
    }

    // Highlighting words
    document.querySelectorAll('.lyrics-word').forEach(function (word) {
      const start = Number(word.dataset.start);
      const end = Number(word.dataset.end);
      const isActive = time >= start && time <= end;
      word.classList.toggle('active', isActive);
      word.classList.toggle('past', time > end);
    });

    // Highlighting lines
    const lyricsContainer = $('#lyricsPanel');
    document.querySelectorAll('.lyrics-line').forEach(function (line) {
      const start = Number(line.dataset.start);
      const end = Number(line.dataset.end);
      const isActive = time >= start && time <= end;
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

$('#reviewToggle').addEventListener('click', function () {
  if (state.song) setReviewMode(!state.reviewMode);
});
$('#applyChord').addEventListener('click', function () {
  if (state.selectedBeat === null) return;
  state.song.beats[state.selectedBeat].chord = $('#editChord').value;
  renderBeatGrid();
  renderLyrics();
  renderOverview();
  updatePlayback(state.player.currentTime);
  saveSong(state.song);
  showToast('บันทึกคอร์ดสำหรับบีตนี้แล้ว');
});
$('#resetChord').addEventListener('click', function () {
  if (state.selectedBeat === null) return;
  const beat = state.song.beats[state.selectedBeat];
  beat.chord = beat.aiChord;
  selectChordValue(beat.chord);
  renderBeatGrid();
  renderLyrics();
  renderOverview();
  updatePlayback(state.player.currentTime);
  saveSong(state.song);
  showToast('คืนค่าคอร์ดจาก AI ดั้งเดิมแล้ว');
});

$('#instrumentSelect').addEventListener('change', function () {
  state.instrument = this.value;
  renderChordDiagram(chordAt(state.player.currentTime).chord);
});
$('#transposeDown').addEventListener('click', function () {
  if (state.song && state.transpose > -12) { state.transpose -= 1; renderSong(); }
});
$('#transposeUp').addEventListener('click', function () {
  if (state.song && state.transpose < 12) { state.transpose += 1; renderSong(); }
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
$('#closeLibrary').addEventListener('click', function () { $('#libraryPanel').classList.add('hidden'); });

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

// App Initialization
populateChordOptions();
checkEngine();
