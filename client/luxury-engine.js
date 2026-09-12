/**
 * ══════════════════════════════════════════════════════════════════════════
 * ZIXEL CHORDS — 5-STAR ULTRA LUXURY MASTER ENGINE (BUG-FREE PRODUCTION)
 * Fluid 24K Gold Magnetic Cursor · Stardust Nebula Canvas · Specular Showcase Tilt
 * Tactile Studio Haptic Web Audio Synthesis · Real-time Dynamic HUD
 * ══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Mark cursor as handled so app.js doesn't spawn a competing loop
  window.__luxuryCursorInitialized = true;

  // ─── 1. Web Audio Haptic Sound Synthesizer (Single Source of Truth) ───
  class LuxurySoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = localStorage.getItem('zc_luxury_sound') !== 'false';
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('zc_luxury_sound', this.enabled ? 'true' : 'false');
      return this.enabled;
    }

    // Crisp high-end mechanical switch click (subtle & non-fatiguing)
    playClick() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200, t);
        osc.frequency.exponentialRampToValueAtTime(450, t + 0.018);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2600, t);
        filter.Q.setValueAtTime(4.0, t);

        gain.gain.setValueAtTime(0.045, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.03);
      } catch (_) {}
    }

    // Celestial 432Hz harmonic chime for chords & achievements
    playChime() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        [432, 648].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.03 / (i + 1), t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.38);
        });
      } catch (_) {}
    }

    // Warm deep bass thump for master transport play/pause
    playThump() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      } catch (_) {}
    }
  }

  const soundEngine = new LuxurySoundEngine();

  // ─── 2. Interactive Fluid 24K Gold Magnetic Follower Cursor ───
  function initLuxuryCursor() {
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      return;
    }

    let cursor = document.getElementById('cbCursor');
    let cursorText = document.getElementById('cbCursorText');

    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'cb-cursor';
      cursor.id = 'cbCursor';
      cursor.setAttribute('aria-hidden', 'true');

      const pointer = document.createElement('div');
      pointer.className = 'cb-cursor-pointer';

      cursorText = document.createElement('div');
      cursorText.className = 'cb-cursor-text';
      cursorText.id = 'cbCursorText';

      cursor.appendChild(pointer);
      cursor.appendChild(cursorText);
      document.body.appendChild(cursor);
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let isMouseDown = false;
    let isVisible = false;
    let idleTimer = null;
    let isOverDiagram = false;

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        cursor.style.opacity = '0';
        isVisible = false;
      }, 1800);
    }

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isOverDiagram) {
        if (!isVisible) {
          isVisible = true;
          cursor.style.opacity = '1';
        }
        resetIdleTimer();
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      clearTimeout(idleTimer);
      cursor.style.opacity = '0';
      isVisible = false;
    });

    window.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      cursor.classList.add('cb-active');
      // Subtle ripple only on non-input elements
      if (!e.target.closest('input, textarea, select, .chord-diagram-wrap, #chordDiagram')) {
        createClickRipple(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
      cursor.classList.remove('cb-active');
    });

    function createClickRipple(x, y) {
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255, 215, 0, 0.9);
        box-shadow: 0 0 16px rgba(212, 175, 55, 0.7);
        transform: translate(-50%, -50%) scale(1);
        pointer-events: none;
        z-index: 999999;
        transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
      `;
      document.body.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.transform = 'translate(-50%, -50%) scale(4.5)';
        ripple.style.opacity = '0';
      });
      setTimeout(() => ripple.remove(), 480);
    }

    // Single unified 60fps lerp loop
    function renderCursor() {
      const ease = 0.22;
      cursorX += (mouseX - cursorX) * ease;
      cursorY += (mouseY - cursorY) * ease;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0px) translate(-50%, -50%)` + (isMouseDown ? ' scale(0.85)' : '');
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    const interactiveSelector = 'button, a, input, select, textarea, .luxury-upload-box, .chord-button, .chord-btn, .view-tab, .source-tab, .tuning-preset-pill, .jam-pad, .white-key, .black-key, .stem-btn, .gc-root-btn, .gc-q-btn, .uke-root-btn, .speed-btn, .loop-btn';
    const diagramSelector = '.chord-diagram-wrap, .fretboard-stage, #chartDiagramContainer, .piano-keyboard-svg';

    document.addEventListener('mouseover', (e) => {
      const target = e.target;
      if (!target) return;

      // When hovering chord diagrams, hide follower cursor completely so it never overlaps or confuses chord dots
      if (target.closest(diagramSelector)) {
        isOverDiagram = true;
        cursor.style.opacity = '0';
        isVisible = false;
        return;
      }

      const interactive = target.closest(interactiveSelector);
      if (interactive) {
        cursor.classList.add('cb-hover');

        if (interactive.id === 'playPause') {
          const isPlaying = window.state && window.state.player && !window.state.player.paused;
          if (cursorText) cursorText.textContent = isPlaying ? 'PAUSE' : 'PLAY';
          cursor.classList.add('cb-text-mode');
        } else if (interactive.classList.contains('jam-play-beat-btn')) {
          if (cursorText) cursorText.textContent = 'BEAT';
          cursor.classList.add('cb-text-mode');
        } else if (interactive.classList.contains('luxury-upload-box') || interactive.id === 'analyzeButton') {
          if (cursorText) cursorText.textContent = 'OPEN';
          cursor.classList.add('cb-text-mode');
        } else if (interactive.classList.contains('chord-button') || interactive.classList.contains('chord-btn') || interactive.classList.contains('gc-root-btn')) {
          if (cursorText) cursorText.textContent = 'CHORD';
          cursor.classList.add('cb-text-mode');
        } else if (interactive.classList.contains('jam-pad')) {
          if (cursorText) cursorText.textContent = 'PAD';
          cursor.classList.add('cb-text-mode');
        } else {
          if (cursorText) cursorText.textContent = '';
          cursor.classList.remove('cb-text-mode');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target;
      if (!target) return;

      if (target.closest(diagramSelector) && (!e.relatedTarget || !e.relatedTarget.closest(diagramSelector))) {
        isOverDiagram = false;
        cursor.style.opacity = '1';
        isVisible = true;
        resetIdleTimer();
      }

      const interactive = target.closest(interactiveSelector);
      // Prevent cursor flicker when moving between children of the same button/link
      if (interactive && (!e.relatedTarget || !interactive.contains(e.relatedTarget))) {
        cursor.classList.remove('cb-hover', 'cb-text-mode');
        if (cursorText) cursorText.textContent = '';
      }
    });
  }

  // ─── 3. Ambient 24K Stardust Nebula Canvas (Optimized Background) ───
  function initLuxuryStardustCanvas() {
    let canvas = document.getElementById('luxuryNebulaCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'luxuryNebulaCanvas';
      document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const PARTICLE_COUNT = Math.min(55, Math.floor((width * height) / 24000));
    const particles = [];
    let mouse = { x: -1000, y: -1000, radius: 120 };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2.0 + 0.8,
        alpha: Math.random() * 0.55 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.008,
        hue: Math.random() > 0.4 ? 43 : 210
      });
    }

    let isTabVisible = true;
    document.addEventListener('visibilitychange', () => {
      isTabVisible = !document.hidden;
    });

    function drawStardust() {
      if (!isTabVisible) {
        requestAnimationFrame(drawStardust);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Delicate golden constellation links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.1;
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.2;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
        }

        p.alpha += Math.sin(Date.now() * p.twinkleSpeed) * 0.008;
        const currentAlpha = Math.max(0.12, Math.min(0.8, p.alpha));

        ctx.fillStyle = p.hue === 43
          ? `rgba(255, 215, 0, ${currentAlpha})`
          : `rgba(165, 180, 252, ${currentAlpha * 0.75})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(drawStardust);
    }
    requestAnimationFrame(drawStardust);
  }

  // ─── 4. Specular Showcase 3D Tilt (Display Cards Only, Never on Form Decks) ───
  function init3DTiltCards() {
    // Only tilt showcase pedestals, NOT operational workstations with text inputs/sliders!
    const cards = document.querySelectorAll(
      '.inst-select-card, .spatial-pod-card, .shield-mini-card'
    );

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -4.5;
        const rotateY = ((x - centerX) / centerX) * 4.5;

        card.style.transition = 'transform 0.08s ease-out';
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // ─── 5. Inject HUD Sound Switch & VIP Pill (Clean Non-Intrusive Layout) ───
  function injectLuxuryNavElements() {
    const hud = document.querySelector('.spatial-hud-island');
    if (!hud) return;

    // 1. VIP Pill next to brand logo in .hud-brand-pill (NEVER in nav links)
    const brandPill = hud.querySelector('.hud-brand-pill');
    if (brandPill && !brandPill.querySelector('.vip-5star-pill')) {
      const vipPill = document.createElement('div');
      vipPill.className = 'vip-5star-pill';
      vipPill.setAttribute('title', 'Zixel Chords 5-Star Master Audio Suite');
      vipPill.innerHTML = '<span class="vip-stars">★★★★★</span> VIP';
      brandPill.appendChild(vipPill);
    }

    // 2. Sound Switch inside .hud-controls-pill (NEVER fixed over bottom transport bar)
    const controlsPill = hud.querySelector('.hud-controls-pill');
    if (controlsPill && !document.getElementById('hudSoundToggleBtn')) {
      const soundBtn = document.createElement('button');
      soundBtn.id = 'hudSoundToggleBtn';
      soundBtn.className = 'hud-sound-toggle-btn' + (soundEngine.enabled ? '' : ' muted');
      soundBtn.type = 'button';
      soundBtn.title = 'เปิด/ปิด เสียงสัมผัส Haptic Audio สตูดิโอ 5 ดาว';
      soundBtn.innerHTML = `
        <span class="sound-icon">${soundEngine.enabled ? '🔊' : '🔇'}</span>
        <span class="sound-label">${soundEngine.enabled ? 'AUDIO' : 'MUTED'}</span>
      `;

      soundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isEnabled = soundEngine.toggle();
        soundBtn.className = 'hud-sound-toggle-btn' + (isEnabled ? '' : ' muted');
        soundBtn.innerHTML = `
          <span class="sound-icon">${isEnabled ? '🔊' : '🔇'}</span>
          <span class="sound-label">${isEnabled ? 'AUDIO' : 'MUTED'}</span>
        `;
        if (isEnabled) soundEngine.playChime();
      });

      // Insert before auth container in controls pill
      controlsPill.insertBefore(soundBtn, controlsPill.firstChild);
    }
  }

  // ─── 6. Clean Single-Trigger Click Audio Hooks ───
  function bindActionSounds() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      // Never play sound when clicking inside text inputs, textareas or dropdown options
      if (target.closest('input, textarea, select, .hud-sound-toggle-btn')) return;

      // Chime on chord selection & presets
      const chordBtn = target.closest('.chord-button, .chord-btn, .gc-root-btn, .gc-q-btn, .uke-root-btn, .tuning-preset-pill');
      if (chordBtn) {
        soundEngine.playChime();
        return;
      }

      // Thump on major playback action
      const transportBtn = target.closest('#playPause, .jam-play-beat-btn, #analyzeButton');
      if (transportBtn) {
        soundEngine.playThump();
        return;
      }

      // Click on interactive buttons/tabs
      const interactive = target.closest('button, .hud-link, .source-tab, .view-tab, .auth-tab, .cb-pill-btn, .quick-chip-btn, .speed-btn, .loop-btn, .quality-button');
      if (interactive) {
        soundEngine.playClick();
      }
    });
  }

  // ─── Initialize Everything ───
  function init() {
    initLuxuryCursor();
    initLuxuryStardustCanvas();
    init3DTiltCards();
    injectLuxuryNavElements();
    bindActionSounds();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LuxurySoundEngine = soundEngine;
})();
