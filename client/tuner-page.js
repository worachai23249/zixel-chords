/* ══════════════════════════════════════════════════════════════════════════
   ZIXEL CHORDS — GUITARTUNA WORKSTATION CONTROLLER
   Real-Time Pitch DSP, Dynamic Arched Meter & Interactive Guitar Headstock
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ─── TUNING PRESETS & STRING MAPPINGS ───
  const PRESETS = {
    standard_guitar: {
      name: 'กีตาร์มาตรฐาน (E A D G B E)',
      type: 'guitar-6',
      strings: [
        { id: 6, label: 'สาย 6', note: 'E', octave: 2, noteFull: 'E2', freq: 82.41, side: 'left', pos: 0 },
        { id: 5, label: 'สาย 5', note: 'A', octave: 2, noteFull: 'A2', freq: 110.00, side: 'left', pos: 1 },
        { id: 4, label: 'สาย 4', note: 'D', octave: 3, noteFull: 'D3', freq: 146.83, side: 'left', pos: 2 },
        { id: 3, label: 'สาย 3', note: 'G', octave: 3, noteFull: 'G3', freq: 196.00, side: 'right', pos: 2 },
        { id: 2, label: 'สาย 2', note: 'B', octave: 3, noteFull: 'B3', freq: 246.94, side: 'right', pos: 1 },
        { id: 1, label: 'สาย 1', note: 'e', octave: 4, noteFull: 'E4', freq: 329.63, side: 'right', pos: 0 }
      ]
    },
    drop_d: {
      name: 'Drop D (D A D G B E)',
      type: 'guitar-6',
      strings: [
        { id: 6, label: 'สาย 6', note: 'D', octave: 2, noteFull: 'D2', freq: 73.42, side: 'left', pos: 0 },
        { id: 5, label: 'สาย 5', note: 'A', octave: 2, noteFull: 'A2', freq: 110.00, side: 'left', pos: 1 },
        { id: 4, label: 'สาย 4', note: 'D', octave: 3, noteFull: 'D3', freq: 146.83, side: 'left', pos: 2 },
        { id: 3, label: 'สาย 3', note: 'G', octave: 3, noteFull: 'G3', freq: 196.00, side: 'right', pos: 2 },
        { id: 2, label: 'สาย 2', note: 'B', octave: 3, noteFull: 'B3', freq: 246.94, side: 'right', pos: 1 },
        { id: 1, label: 'สาย 1', note: 'e', octave: 4, noteFull: 'E4', freq: 329.63, side: 'right', pos: 0 }
      ]
    },
    half_step_down: {
      name: 'ครึ่งเสียง (Eb Ab Db Gb Bb Eb)',
      type: 'guitar-6',
      strings: [
        { id: 6, label: 'สาย 6', note: 'Eb', octave: 2, noteFull: 'Eb2', freq: 77.78, side: 'left', pos: 0 },
        { id: 5, label: 'สาย 5', note: 'Ab', octave: 2, noteFull: 'Ab2', freq: 103.83, side: 'left', pos: 1 },
        { id: 4, label: 'สาย 4', note: 'Db', octave: 3, noteFull: 'Db3', freq: 138.59, side: 'left', pos: 2 },
        { id: 3, label: 'สาย 3', note: 'Gb', octave: 3, noteFull: 'Gb3', freq: 185.00, side: 'right', pos: 2 },
        { id: 2, label: 'สาย 2', note: 'Bb', octave: 3, noteFull: 'Bb3', freq: 233.08, side: 'right', pos: 1 },
        { id: 1, label: 'สาย 1', note: 'eb', octave: 4, noteFull: 'Eb4', freq: 311.13, side: 'right', pos: 0 }
      ]
    },
    ukulele: {
      name: 'อูคูเลเล่ (G C E A)',
      type: 'ukulele-4',
      strings: [
        { id: 4, label: 'สาย 4', note: 'G', octave: 4, noteFull: 'G4', freq: 392.00, side: 'left', pos: 0 },
        { id: 3, label: 'สาย 3', note: 'C', octave: 4, noteFull: 'C4', freq: 261.63, side: 'left', pos: 1 },
        { id: 2, label: 'สาย 2', note: 'E', octave: 4, noteFull: 'E4', freq: 329.63, side: 'right', pos: 1 },
        { id: 1, label: 'สาย 1', note: 'A', octave: 4, noteFull: 'A4', freq: 440.00, side: 'right', pos: 0 }
      ]
    },
    bass: {
      name: 'เบส 4 สาย (E A D G)',
      type: 'bass-4',
      strings: [
        { id: 4, label: 'สาย 4', note: 'E', octave: 1, noteFull: 'E1', freq: 41.20, side: 'left', pos: 0 },
        { id: 3, label: 'สาย 3', note: 'A', octave: 1, noteFull: 'A1', freq: 55.00, side: 'left', pos: 1 },
        { id: 2, label: 'สาย 2', note: 'D', octave: 2, noteFull: 'D2', freq: 73.42, side: 'right', pos: 1 },
        { id: 1, label: 'สาย 1', note: 'G', octave: 2, noteFull: 'G2', freq: 98.00, side: 'right', pos: 0 }
      ]
    }
  };

  // ─── TUNER STATE ───
  let currentPreset = 'standard_guitar';
  let isAutoMode = true;
  let activeStringId = 6;
  let isTunerListening = false;
  let isSoundEnabled = true;

  let audioCtx = null;
  let tunerAnalyser = null;
  let tunerMicStream = null;
  let tunerRafId = null;

  // Smoothing physics for needle
  let smoothedCents = 0;
  let smoothedAngle = 0;
  let inTuneStartTime = 0;
  let lastChimeTime = 0;
  let lastDetectedTime = 0;

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

  // ─── DSP PITCH DETECTION (AUTOCORRELATION) ───
  function autoCorrelate(buf, sampleRate) {
    const size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / size);

    // Update Mic Visualizer Level
    const micFill = $('#gtMicLevelFill');
    if (micFill) {
      const levelPct = Math.min(100, Math.round(rms * 450));
      micFill.style.width = levelPct + '%';
    }

    if (rms < 0.012) return -1; // Silence threshold

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

  // ─── CLOSEST STRING MATCHING (GUITARTUNA AUTO MODE) ───
  function findClosestString(freq, presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return null;
    let closest = preset.strings[0];
    let minDiff = Infinity;
    for (const s of preset.strings) {
      const diff = Math.abs(12 * Math.log2(freq / s.freq));
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }
    return closest;
  }

  // ─── REALISTIC TONE GENERATION (ACOUSTIC GUITAR PLUCK) ───
  function playGuitarStringTone(freq, noteName) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 1.6);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);

    // Visual feedback for string pluck
    highlightActiveString(activeStringId, true);
  }

  // ─── GUITARTUNA IN-TUNE CHIME (HARMONIC BELL CHIME) ───
  function playInTuneChime() {
    if (!isSoundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const masterGain = ctx.createGain();

    // High harmonic bell chime (E6 + E7 + B7 sparkle)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2637.0, now);

    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(3951.0, now);

    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    gain2.gain.setValueAtTime(0.16, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    masterGain.gain.setValueAtTime(0.38, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
    osc3.stop(now + 0.95);
  }

  // ─── VISUAL TUNER UPDATER LOOP ───
  function updateTunerPitch() {
    if (!isTunerListening || !tunerAnalyser) return;
    const buffer = new Float32Array(tunerAnalyser.fftSize);
    tunerAnalyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, audioCtx.sampleRate);

    const now = performance.now();
    const preset = PRESETS[currentPreset];

    if (freq !== -1 && freq >= 35 && freq <= 1200) {
      lastDetectedTime = now;

      let targetString = null;
      if (isAutoMode) {
        targetString = findClosestString(freq, currentPreset);
        if (targetString && targetString.id !== activeStringId) {
          activeStringId = targetString.id;
          highlightActiveString(activeStringId, false);
        }
      } else {
        targetString = preset.strings.find((s) => s.id === activeStringId) || preset.strings[0];
      }

      if (targetString) {
        // Calculate cents deviation relative to target string
        const targetFreq = targetString.freq;
        const rawCents = 1200 * Math.log2(freq / targetFreq);
        const clampedCents = Math.max(-50, Math.min(50, rawCents));

        // Exponential smoothing for fluid GuitarTuna needle motion
        smoothedCents = smoothedCents * 0.72 + clampedCents * 0.28;
        const targetAngle = (smoothedCents / 50) * 48; // -48 deg to +48 deg
        smoothedAngle = smoothedAngle * 0.68 + targetAngle * 0.32;

        const isInTune = Math.abs(smoothedCents) <= 3.2;

        // Update DOM elements
        const noteEl = $('#tunerNote');
        const octaveEl = $('#tunerOctave');
        const badgeEl = $('#gtStringBadge');
        const targetFreqEl = $('#gtTargetFreq');
        const liveFreqEl = $('#tunerFreq');
        const centsEl = $('#tunerCents');
        const guidanceEl = $('#tunerStatusBadge');
        const guidanceText = $('#gtGuidanceText');
        const guidanceIcon = $('#gtGuidanceIcon');
        const noteHalo = $('#gtNoteHalo');
        const needleBlade = $('#gtNeedleBlade');
        const sweetArc = $('#gtSweetArc');

        if (noteEl) noteEl.textContent = targetString.note;
        if (octaveEl) octaveEl.textContent = targetString.octave;
        if (badgeEl) badgeEl.textContent = `${targetString.label} (${targetString.noteFull})`;
        if (targetFreqEl) targetFreqEl.textContent = `${targetString.freq.toFixed(1)} Hz`;
        if (liveFreqEl) liveFreqEl.textContent = `${freq.toFixed(1)} Hz`;

        const centsRounded = Math.round(smoothedCents);
        if (centsEl) {
          centsEl.textContent = (centsRounded > 0 ? '+' : '') + centsRounded + ' cents';
        }

        // Apply needle rotation to SVG
        const needleGroup = $('#gtMeterNeedle');
        if (needleGroup) {
          needleGroup.setAttribute('transform', `rotate(${smoothedAngle.toFixed(2)} 200 190)`);
        }

        // Check in-tune lock
        if (isInTune) {
          if (noteEl) noteEl.classList.add('in-tune');
          if (noteHalo) noteHalo.classList.add('in-tune');
          if (sweetArc) sweetArc.classList.add('active');
          if (needleBlade) needleBlade.setAttribute('fill', '#d4ff00');

          if (guidanceEl) {
            guidanceEl.className = 'gt-guidance-pill in-tune';
            if (guidanceText) guidanceText.textContent = 'ตรงคีย์แล้ว (IN TUNE)';
            if (guidanceIcon) guidanceIcon.textContent = '✓';
          }

          // Mark active peg as in-tune
          setPegInTune(targetString.id, true);

          // Trigger harmonic chime if held for 180ms
          if (!inTuneStartTime) inTuneStartTime = now;
          if (now - inTuneStartTime > 180 && now - lastChimeTime > 1800) {
            playInTuneChime();
            lastChimeTime = now;
          }
        } else {
          inTuneStartTime = 0;
          if (noteEl) noteEl.classList.remove('in-tune');
          if (noteHalo) noteHalo.classList.remove('in-tune');
          if (sweetArc) sweetArc.classList.remove('active');
          setPegInTune(targetString.id, false);

          if (smoothedCents < -3.2) {
            if (needleBlade) needleBlade.setAttribute('fill', '#f59e0b');
            if (guidanceEl) {
              guidanceEl.className = 'gt-guidance-pill flat';
              if (guidanceText) guidanceText.textContent = 'ต่ำเกินไป — หมุนขึ้น ↑';
              if (guidanceIcon) guidanceIcon.textContent = '♭';
            }
          } else {
            if (needleBlade) needleBlade.setAttribute('fill', '#ef4444');
            if (guidanceEl) {
              guidanceEl.className = 'gt-guidance-pill sharp';
              if (guidanceText) guidanceText.textContent = 'สูงเกินไป — หมุนลง ↓';
              if (guidanceIcon) guidanceIcon.textContent = '♯';
            }
          }
        }
      }
    } else {
      // Silence or signal loss: smoothly drift needle toward center after 600ms
      if (now - lastDetectedTime > 600) {
        smoothedAngle *= 0.88;
        const needleGroup = $('#gtMeterNeedle');
        if (needleGroup && Math.abs(smoothedAngle) > 0.1) {
          needleGroup.setAttribute('transform', `rotate(${smoothedAngle.toFixed(2)} 200 190)`);
        }
        const sweetArc = $('#gtSweetArc');
        if (sweetArc) sweetArc.classList.remove('active');
      }
    }

    tunerRafId = requestAnimationFrame(updateTunerPitch);
  }

  // ─── START / STOP MICROPHONE ───
  async function startTunerMic() {
    try {
      const ctx = getAudioCtx();
      tunerMicStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const source = ctx.createMediaStreamSource(tunerMicStream);
      tunerAnalyser = ctx.createAnalyser();
      tunerAnalyser.fftSize = 2048;
      source.connect(tunerAnalyser);

      isTunerListening = true;
      const btn = $('#tunerMicToggle');
      if (btn) {
        btn.classList.add('listening');
        $('#tunerMicLabel').textContent = 'กำลังตรวจจับเสียง... (คลิกเพื่อหยุด)';
        $('#tunerMicIcon').textContent = '■';
      }
      const guidance = $('#gtGuidanceText');
      if (guidance) guidance.textContent = 'กำลังฟังเสียงสด (ดีดสายได้เลย)...';
      updateTunerPitch();
    } catch (err) {
      console.warn('[GuitarTuna] Microphone access failed:', err);
      const guidance = $('#gtGuidanceText');
      if (guidance) {
        guidance.textContent = 'ไม่สามารถเข้าถึงไมโครโฟนได้ (กรุณาอนุญาตไมค์)';
      }
      const badge = $('#tunerStatusBadge');
      if (badge) badge.className = 'gt-guidance-pill sharp';
    }
  }

  function stopTunerMic() {
    isTunerListening = false;
    if (tunerRafId) cancelAnimationFrame(tunerRafId);
    if (tunerMicStream) {
      tunerMicStream.getTracks().forEach((t) => t.stop());
      tunerMicStream = null;
    }
    const btn = $('#tunerMicToggle');
    if (btn) {
      btn.classList.remove('listening');
      $('#tunerMicLabel').textContent = 'เปิดไมค์ตรวจจับเสียงสด';
      $('#tunerMicIcon').textContent = '●';
    }
    const micFill = $('#gtMicLevelFill');
    if (micFill) micFill.style.width = '0%';

    const needleGroup = $('#gtMeterNeedle');
    if (needleGroup) needleGroup.setAttribute('transform', 'rotate(0 200 190)');

    const guidance = $('#gtGuidanceText');
    if (guidance) guidance.textContent = 'พร้อมใช้งาน (ดีดสายเพื่อเริ่ม)';
    const guidanceIcon = $('#gtGuidanceIcon');
    if (guidanceIcon) guidanceIcon.textContent = '✦';
    const badge = $('#tunerStatusBadge');
    if (badge) badge.className = 'gt-guidance-pill';

    const noteEl = $('#tunerNote');
    if (noteEl) noteEl.classList.remove('in-tune');
    const noteHalo = $('#gtNoteHalo');
    if (noteHalo) noteHalo.classList.remove('in-tune');
  }

  // ─── RENDER ARCHED METER TICKS ───
  function renderMeterTicks() {
    const ticksGroup = $('#gtMeterTicksGroup');
    if (!ticksGroup) return;

    const cx = 200;
    const cy = 190;
    const rTickInner = 140;
    const rTickOuterMajor = 162;
    const rTickOuterMinor = 154;

    let html = '';
    for (let c = -50; c <= 50; c += 5) {
      const angleDeg = (c / 50) * 48; // -48 deg to +48 deg
      const angleRad = (angleDeg - 90) * (Math.PI / 180);

      const isMajor = c % 10 === 0;
      const isCenter = c === 0;
      const rOuter = isMajor ? rTickOuterMajor : rTickOuterMinor;

      const x1 = cx + rTickInner * Math.cos(angleRad);
      const y1 = cy + rTickInner * Math.sin(angleRad);
      const x2 = cx + rOuter * Math.cos(angleRad);
      const y2 = cy + rOuter * Math.sin(angleRad);

      let strokeColor = 'rgba(255,255,255,0.22)';
      let strokeWidth = 1.5;

      if (isCenter) {
        strokeColor = '#d4ff00';
        strokeWidth = 3;
      } else if (Math.abs(c) <= 10) {
        strokeColor = 'rgba(212, 255, 0, 0.45)';
      }

      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;

      if (c === -50 || c === -25 || c === 0 || c === 25 || c === 50) {
        const rText = rOuter + 14;
        const tx = cx + rText * Math.cos(angleRad);
        const ty = cy + rText * Math.sin(angleRad);
        const labelText = c === 0 ? '0' : c > 0 ? `+${c}` : `${c}`;
        const textFill = isCenter ? '#d4ff00' : 'rgba(255,255,255,0.5)';
        html += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${textFill}" font-size="11" font-family="DM Mono, monospace" font-weight="${isCenter ? '700' : '500'}" text-anchor="middle" dominant-baseline="central">${labelText}</text>`;
      }
    }
    ticksGroup.innerHTML = html;
  }

  // ─── RENDER HEADSTOCK SVG & PEGS ───
  function getHeadstockSvg(stringCount) {
    if (stringCount === 4) {
      return `
<svg class="gt-headstock-svg" viewBox="0 0 260 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headstockGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e202c" />
      <stop offset="50%" stop-color="#12131b" />
      <stop offset="100%" stop-color="#0a0a0f" />
    </linearGradient>
    <linearGradient id="postGrad4" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <filter id="stringGlow4" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <path d="M 60 320 L 60 280 C 50 240, 45 180, 55 120 C 65 60, 90 20, 130 15 C 170 20, 195 60, 205 120 C 215 180, 210 240, 200 280 L 200 320 Z" fill="url(#headstockGrad4)" stroke="rgba(255,255,255,0.18)" stroke-width="2.5" />
  <path d="M 68 310 L 68 280 C 58 245, 54 185, 63 125 C 72 70, 94 32, 130 28 C 166 32, 188 70, 197 125 C 206 185, 202 245, 192 280 L 192 310" stroke="rgba(212,255,0,0.14)" stroke-width="1.5" fill="none" />
  <rect x="56" y="306" width="148" height="14" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />

  <!-- Center Logo -->
  <circle cx="130" cy="76" r="13" fill="rgba(212,255,0,0.06)" stroke="rgba(212,255,0,0.35)" stroke-width="1.5" />
  <path d="M 124 72 L 136 72 L 124 80 L 136 80" stroke="#d4ff00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Posts -->
  <line x1="85" y1="135" x2="25" y2="135" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="85" cy="135" r="8.5" fill="url(#postGrad4)" stroke="#334155" stroke-width="2" />
  <circle cx="85" cy="135" r="3" fill="#0f172a" />

  <line x1="90" y1="215" x2="25" y2="215" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="90" cy="215" r="8.5" fill="url(#postGrad4)" stroke="#334155" stroke-width="2" />
  <circle cx="90" cy="215" r="3" fill="#0f172a" />

  <line x1="170" y1="215" x2="235" y2="215" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="170" cy="215" r="8.5" fill="url(#postGrad4)" stroke="#334155" stroke-width="2" />
  <circle cx="170" cy="215" r="3" fill="#0f172a" />

  <line x1="175" y1="135" x2="235" y2="135" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="175" cy="135" r="8.5" fill="url(#postGrad4)" stroke="#334155" stroke-width="2" />
  <circle cx="175" cy="135" r="3" fill="#0f172a" />

  <!-- Strings -->
  <path id="gtString-4" class="gt-svg-string" d="M 82 306 L 82 215 L 85 135" stroke="#94a3b8" stroke-width="3.2" stroke-linecap="round" />
  <path id="gtString-3" class="gt-svg-string" d="M 114 306 L 90 215" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round" />
  <path id="gtString-2" class="gt-svg-string" d="M 146 306 L 170 215" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round" />
  <path id="gtString-1" class="gt-svg-string" d="M 178 306 L 178 215 L 175 135" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
</svg>`;
    }

    // 6-String Guitar Headstock
    return `
<svg class="gt-headstock-svg" viewBox="0 0 280 370" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headstockGrad6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1e28" />
      <stop offset="50%" stop-color="#10121a" />
      <stop offset="100%" stop-color="#08090d" />
    </linearGradient>
    <linearGradient id="postGrad6" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <filter id="stringGlow6" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <path d="M 70 370 L 70 330 C 60 280, 48 200, 58 120 C 66 60, 85 24, 115 14 C 130 18, 140 28, 140 28 C 140 28, 150 18, 165 14 C 195 24, 214 60, 222 120 C 232 200, 220 280, 210 330 L 210 370 Z" fill="url(#headstockGrad6)" stroke="rgba(255,255,255,0.18)" stroke-width="2.5" />
  <path d="M 78 355 L 78 330 C 69 285, 58 205, 68 125 C 75 70, 92 36, 118 26 C 130 30, 140 38, 140 38 C 140 38, 150 30, 162 26 C 188 36, 205 70, 212 125 C 222 205, 211 285, 202 330 L 202 355" stroke="rgba(212,255,0,0.14)" stroke-width="1.5" fill="none" />
  <rect x="66" y="354" width="148" height="14" rx="3" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />

  <g transform="translate(140, 68)">
    <circle cx="0" cy="0" r="14" fill="rgba(212,255,0,0.06)" stroke="rgba(212,255,0,0.35)" stroke-width="1.5" />
    <path d="M -7 -6 L 7 -6 L -7 6 L 7 6" stroke="#d4ff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Left Posts (6, 5, 4) -->
  <line x1="90" y1="110" x2="25" y2="110" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="90" cy="110" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="90" cy="110" r="3" fill="#0f172a" />

  <line x1="86" y1="185" x2="20" y2="185" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="86" cy="185" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="86" cy="185" r="3" fill="#0f172a" />

  <line x1="82" y1="260" x2="15" y2="260" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="82" cy="260" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="82" cy="260" r="3" fill="#0f172a" />

  <!-- Right Posts (1, 2, 3) -->
  <line x1="190" y1="110" x2="255" y2="110" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="190" cy="110" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="190" cy="110" r="3" fill="#0f172a" />

  <line x1="194" y1="185" x2="260" y2="185" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="194" cy="185" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="194" cy="185" r="3" fill="#0f172a" />

  <line x1="198" y1="260" x2="265" y2="260" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <circle cx="198" cy="260" r="8.5" fill="url(#postGrad6)" stroke="#334155" stroke-width="2" />
  <circle cx="198" cy="260" r="3" fill="#0f172a" />

  <!-- Strings -->
  <path id="gtString-6" class="gt-svg-string" d="M 84 354 L 84 260 L 88 185 L 90 110" stroke="#94a3b8" stroke-width="3.8" stroke-linecap="round" />
  <path id="gtString-5" class="gt-svg-string" d="M 106 354 L 102 260 L 86 185" stroke="#cbd5e1" stroke-width="3.2" stroke-linecap="round" />
  <path id="gtString-4" class="gt-svg-string" d="M 128 354 L 82 260" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round" />
  <path id="gtString-3" class="gt-svg-string" d="M 152 354 L 198 260" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round" />
  <path id="gtString-2" class="gt-svg-string" d="M 174 354 L 178 260 L 194 185" stroke="#f1f5f9" stroke-width="1.8" stroke-linecap="round" />
  <path id="gtString-1" class="gt-svg-string" d="M 196 354 L 196 260 L 192 185 L 190 110" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" />
</svg>`;
  }

  function renderHeadstock(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    const isFourString = preset.strings.length === 4;
    const artWrap = $('#gtHeadstockArtWrap');
    if (artWrap) {
      artWrap.innerHTML = getHeadstockSvg(isFourString ? 4 : 6);
    }

    const leftCol = $('#gtLeftPegs');
    const rightCol = $('#gtRightPegs');
    if (!leftCol || !rightCol) return;

    const leftStrings = preset.strings.filter((s) => s.side === 'left').sort((a, b) => a.pos - b.pos);
    const rightStrings = preset.strings.filter((s) => s.side === 'right').sort((a, b) => a.pos - b.pos);

    const renderPegBtn = (s) => `
      <button type="button" class="gt-peg-btn" id="gtPegBtn-${s.id}" data-string-id="${s.id}" data-freq="${s.freq}" data-note="${s.note}" data-octave="${s.octave}" title="คลิกเพื่อฟังเสียง ${s.label} (${s.noteFull})">
        <span class="gt-peg-string-badge">${s.id}</span>
        <span class="gt-peg-note">${s.note}</span>
        <span class="gt-peg-freq">${Math.round(s.freq)}Hz</span>
      </button>
    `;

    leftCol.innerHTML = leftStrings.map(renderPegBtn).join('');
    rightCol.innerHTML = rightStrings.map(renderPegBtn).join('');

    // Attach click handlers to pegs
    $$('.gt-peg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const strId = parseInt(btn.dataset.stringId, 10);
        const freq = parseFloat(btn.dataset.freq);
        const note = btn.dataset.note;

        activeStringId = strId;
        highlightActiveString(strId, true);

        // Play standard reference acoustic tone
        playGuitarStringTone(freq, note);

        // Update target note displays
        const strObj = preset.strings.find((s) => s.id === strId);
        if (strObj) {
          const noteEl = $('#tunerNote');
          const octaveEl = $('#tunerOctave');
          const badgeEl = $('#gtStringBadge');
          const targetFreqEl = $('#gtTargetFreq');

          if (noteEl) noteEl.textContent = strObj.note;
          if (octaveEl) octaveEl.textContent = strObj.octave;
          if (badgeEl) badgeEl.textContent = `${strObj.label} (${strObj.noteFull})`;
          if (targetFreqEl) targetFreqEl.textContent = `${strObj.freq.toFixed(1)} Hz`;
        }
      });
    });

    // Default select lowest string
    activeStringId = preset.strings[0].id;
    highlightActiveString(activeStringId, false);
  }

  function highlightActiveString(stringId, triggerVibrate = false) {
    // Peg buttons
    $$('.gt-peg-btn').forEach((btn) => {
      const id = parseInt(btn.dataset.stringId, 10);
      if (id === stringId) {
        btn.classList.add('active');
        if (triggerVibrate) {
          btn.classList.add('playing');
          setTimeout(() => btn.classList.remove('playing'), 450);
        }
      } else {
        btn.classList.remove('active');
      }
    });

    // SVG Strings
    $$('.gt-svg-string').forEach((strPath) => {
      strPath.classList.remove('active', 'vibrating');
    });

    const activePath = $(`#gtString-${stringId}`);
    if (activePath) {
      activePath.classList.add('active');
      if (triggerVibrate) {
        activePath.classList.add('vibrating');
        setTimeout(() => activePath.classList.remove('vibrating'), 1200);
      }
    }
  }

  function setPegInTune(stringId, inTune) {
    const peg = $(`#gtPegBtn-${stringId}`);
    if (peg) {
      if (inTune) peg.classList.add('in-tune');
      else peg.classList.remove('in-tune');
    }
  }

  // ─── INITIALIZATION ───
  function initGuitarTuna() {
    renderMeterTicks();
    renderHeadstock(currentPreset);

    // Initial note display setup
    const preset = PRESETS[currentPreset];
    const initialStr = preset.strings[0];
    if (initialStr) {
      const noteEl = $('#tunerNote');
      const octaveEl = $('#tunerOctave');
      const badgeEl = $('#gtStringBadge');
      const targetFreqEl = $('#gtTargetFreq');

      if (noteEl) noteEl.textContent = initialStr.note;
      if (octaveEl) octaveEl.textContent = initialStr.octave;
      if (badgeEl) badgeEl.textContent = `${initialStr.label} (${initialStr.noteFull})`;
      if (targetFreqEl) targetFreqEl.textContent = `${initialStr.freq.toFixed(1)} Hz`;
    }

    // Preset Pills
    $$('.tuning-preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        $$('.tuning-preset-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentPreset = pill.dataset.preset;
        renderHeadstock(currentPreset);

        // Update default target string
        const pObj = PRESETS[currentPreset];
        if (pObj && pObj.strings.length > 0) {
          const s = pObj.strings[0];
          activeStringId = s.id;
          highlightActiveString(s.id, false);
          const noteEl = $('#tunerNote');
          const octaveEl = $('#tunerOctave');
          const badgeEl = $('#gtStringBadge');
          const targetFreqEl = $('#gtTargetFreq');
          if (noteEl) noteEl.textContent = s.note;
          if (octaveEl) octaveEl.textContent = s.octave;
          if (badgeEl) badgeEl.textContent = `${s.label} (${s.noteFull})`;
          if (targetFreqEl) targetFreqEl.textContent = `${s.freq.toFixed(1)} Hz`;
        }
      });
    });

    // Mode Switcher: AUTO vs MANUAL
    const autoBtn = $('#gtModeAuto');
    const manualBtn = $('#gtModeManual');

    if (autoBtn && manualBtn) {
      autoBtn.addEventListener('click', () => {
        isAutoMode = true;
        autoBtn.classList.add('active');
        manualBtn.classList.remove('active');
        const guidance = $('#gtGuidanceText');
        if (guidance) guidance.textContent = 'โหมด AUTO: ดีดสายใดก็ได้ ระบบจะจับคู่อัตโนมัติ';
      });

      manualBtn.addEventListener('click', () => {
        isAutoMode = false;
        manualBtn.classList.add('active');
        autoBtn.classList.remove('active');
        const guidance = $('#gtGuidanceText');
        if (guidance) guidance.textContent = 'โหมด MANUAL: คลิกเลือกลูกบิดเพื่อเทียบเสียง';
      });
    }

    // Microphone Toggle
    const micToggleBtn = $('#tunerMicToggle');
    if (micToggleBtn) {
      micToggleBtn.addEventListener('click', () => {
        if (isTunerListening) stopTunerMic();
        else startTunerMic();
      });
    }

    // In-Tune Sound Chime Toggle
    const soundToggleBtn = $('#gtSoundToggle');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
          soundToggleBtn.classList.add('active');
          $('#gtSoundIcon').textContent = '✦';
          $('#gtSoundLabel').textContent = 'เสียงสำเร็จ';
          playInTuneChime(); // Play brief sample
        } else {
          soundToggleBtn.classList.remove('active');
          $('#gtSoundIcon').textContent = '✕';
          $('#gtSoundLabel').textContent = 'ปิดเสียง';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuitarTuna);
  } else {
    initGuitarTuna();
  }
})();
