<script lang="ts">
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const BLACK_PCS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

  interface Props {
    startMidi?: number; // default 21 (A0)
    keyCount?: number;  // default 88 (up to C8 = 108)
    activeNotes?: number[]; // MIDI notes currently pressed
    targetPitchClasses?: number[]; // Target chord pitch classes (0-11)
    theme?: 'dark' | 'ivory';
    showAllLabels?: boolean;
    onNoteDown?: (midi: number) => void;
    onNoteUp?: (midi: number) => void;
  }

  let {
    startMidi = 21,
    keyCount = 88,
    activeNotes = [],
    targetPitchClasses = [],
    theme = 'dark',
    showAllLabels = true,
    onNoteDown,
    onNoteUp
  }: Props = $props();

  let keys = $derived(
    Array.from({ length: keyCount }, (_, i) => {
      const midi = startMidi + i;
      const pc = midi % 12;
      const oct = Math.floor(midi / 12) - 1;
      const isBlack = BLACK_PCS.includes(pc);
      const isMiddleC = midi === 60; // C4
      const name = `${NOTE_NAMES[pc]}${oct}`;
      return { midi, pc, oct, isBlack, isMiddleC, name };
    })
  );

  let activeSet = $derived(new Set(activeNotes));
  let targetSet = $derived(new Set(targetPitchClasses));

  function handleMouseDown(midi: number, e: MouseEvent) {
    e.preventDefault();
    if (onNoteDown) onNoteDown(midi);
  }

  function handleMouseUp(midi: number) {
    if (onNoteUp) onNoteUp(midi);
  }
</script>

<div class="piano-stage">
  <div class="piano-keyboard" class:theme-dark={theme === 'dark'} class:theme-ivory={theme === 'ivory'}>
    {#each keys as key}
      {@const isPressed = activeSet.has(key.midi)}
      {@const isTarget = targetSet.has(key.pc)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="piano-key"
        class:white={!key.isBlack}
        class:black={key.isBlack}
        class:middle-c={key.isMiddleC}
        class:active-target={isTarget && !isPressed}
        class:active-pressed={isPressed && !isTarget}
        class:active-both={isPressed && isTarget}
        onmousedown={(e) => handleMouseDown(key.midi, e)}
        onmouseup={() => handleMouseUp(key.midi)}
        onmouseleave={() => isPressed && handleMouseUp(key.midi)}
      >
        <span>
          {#if showAllLabels}
            {!key.isBlack ? key.name : ''}
          {:else if key.pc === 0}
            {key.isMiddleC ? '★ C4' : key.name}
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .piano-stage {
    display: flex;
    justify-content: flex-start;
    padding: 16px 0;
    overflow-x: auto;
    scroll-behavior: smooth;
  }
  .piano-stage::-webkit-scrollbar {
    height: 8px;
  }
  .piano-stage::-webkit-scrollbar-track {
    background: #0f172a;
    border-radius: 4px;
  }
  .piano-stage::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 4px;
  }
  .piano-keyboard {
    position: relative;
    display: flex;
    height: 154px;
    user-select: none;
    background: #080c14;
    padding: 10px 14px 10px;
    border-radius: 12px;
    border: 1px solid rgba(212, 175, 55, 0.25);
    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.7);
    margin: 0 auto;
  }
  /* Red felt strip */
  .piano-keyboard::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 10px;
    right: 10px;
    height: 6px;
    background: linear-gradient(180deg, #b91c1c, #991b1b);
    border-radius: 3px 3px 0 0;
    z-index: 5;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }
  .piano-key {
    position: relative;
    cursor: pointer;
    transition: background 0.08s, transform 0.04s;
    box-sizing: border-box;
  }
  .piano-key.white {
    width: 24px;
    height: 134px;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 5px;
    font-size: 9px;
    font-weight: 700;
    border-radius: 0 0 4px 4px;
  }
  .piano-key.white.middle-c span {
    color: #f59e0b !important;
    font-weight: 800;
  }
  .piano-key.white.middle-c::before {
    content: '★';
    position: absolute;
    top: 12px;
    font-size: 7px;
    color: #f59e0b;
  }
  .piano-key.black {
    width: 15px;
    height: 84px;
    margin-left: -7.5px;
    margin-right: -7.5px;
    z-index: 2;
    border-radius: 0 0 3px 3px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 3px;
    font-size: 7px;
    font-weight: 700;
    box-shadow: 0 4px 8px rgba(0,0,0,0.6);
  }

  /* Dark Studio Theme (Matches user's blueprint!) */
  .piano-keyboard.theme-dark .piano-key.white {
    background: #1e2530;
    border: 1px solid #334155;
    color: #94a3b8;
  }
  .piano-keyboard.theme-dark .piano-key.white:hover {
    background: #283344;
  }
  .piano-keyboard.theme-dark .piano-key.white.active-target {
    background: #d97706 !important;
    color: #fffbeb !important;
    border-color: #f59e0b;
  }
  .piano-keyboard.theme-dark .piano-key.white.active-pressed {
    background: #0284c7 !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }
  .piano-keyboard.theme-dark .piano-key.white.active-both {
    background: #16a34a !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }

  .piano-keyboard.theme-dark .piano-key.black {
    background: #0b101b;
    border: 1px solid #020617;
    color: #64748b;
  }
  .piano-keyboard.theme-dark .piano-key.black:hover {
    background: #161e2e;
  }
  .piano-keyboard.theme-dark .piano-key.black.active-target {
    background: #b45309 !important;
    color: #fef3c7 !important;
  }
  .piano-keyboard.theme-dark .piano-key.black.active-pressed {
    background: #0369a1 !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }
  .piano-keyboard.theme-dark .piano-key.black.active-both {
    background: #15803d !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }

  /* Classic Ivory Theme */
  .piano-keyboard.theme-ivory .piano-key.white {
    background: linear-gradient(180deg, #fdfbf7 0%, #f3eee3 90%, #e2d9c8 100%);
    border: 1px solid #cbd5e1;
    color: #475569;
  }
  .piano-keyboard.theme-ivory .piano-key.white.active-target {
    background: #fde047 !important;
    color: #854d0e !important;
  }
  .piano-keyboard.theme-ivory .piano-key.white.active-pressed {
    background: #38bdf8 !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }
  .piano-keyboard.theme-ivory .piano-key.white.active-both {
    background: #4ade80 !important;
    color: #ffffff !important;
    transform: translateY(2px);
  }
  .piano-keyboard.theme-ivory .piano-key.black {
    background: linear-gradient(180deg, #262626 0%, #111111 90%, #000000 100%);
    border: 1px solid #000;
    color: #cbd5e1;
  }
  .piano-keyboard.theme-ivory .piano-key.black.active-target {
    background: #eab308 !important;
    color: #000 !important;
  }
  .piano-keyboard.theme-ivory .piano-key.black.active-pressed {
    background: #0284c7 !important;
    color: #fff !important;
    transform: translateY(2px);
  }
  .piano-keyboard.theme-ivory .piano-key.black.active-both {
    background: #22c55e !important;
    color: #fff !important;
    transform: translateY(2px);
  }
</style>

