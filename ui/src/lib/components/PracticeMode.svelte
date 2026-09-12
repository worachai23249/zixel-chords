<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { workspace } from '../stores/workspace.svelte';
  import PianoKeyboard from './PianoKeyboard.svelte';
  import { midiEngine } from '../../../../client/midi-engine';

  let activeNotes = $state<number[]>([]);
  let midiConnected = $state(false);
  let midiDeviceName = $state('ยังไม่ได้เชื่อมต่อ');
  let unsubscribe: (() => void) | null = null;

  // Find current chord from workspace beats
  let currentChord = $derived.by(() => {
    const beats = workspace.song?.beats || [];
    if (beats.length === 0) return '—';
    const time = workspace.currentTime;
    for (let i = beats.length - 1; i >= 0; i--) {
      if (time >= beats[i].time) {
        return beats[i].chord || '—';
      }
    }
    return beats[0].chord || '—';
  });

  let chordDetails = $derived.by(() => {
    return midiEngine.getChordNotes(currentChord);
  });

  let targetNotes = $derived(chordDetails.notes || []);
  let targetPitchClasses = $derived(chordDetails.pitchClasses || []);

  let evaluation = $derived.by(() => {
    return midiEngine.evaluateChord(currentChord);
  });

  onMount(() => {
    unsubscribe = midiEngine.subscribe((event: any) => {
      if (event.type === 'noteOn' || event.type === 'noteOff') {
        activeNotes = [...midiEngine.activeNotes];
      } else if (event.type === 'status' || event.type === 'deviceChange') {
        midiConnected = midiEngine.status === 'connected';
        const inputs = midiEngine.getInputs();
        midiDeviceName = inputs.length > 0 ? inputs.map((i: any) => i.name).join(', ') : 'ไม่มีอุปกรณ์';
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  async function connectMidi() {
    await midiEngine.init();
  }

  function handleNoteDown(midi: number) {
    midiEngine.noteOn(midi, 100);
    activeNotes = [...midiEngine.activeNotes];
  }

  function handleNoteUp(midi: number) {
    midiEngine.noteOff(midi);
    activeNotes = [...midiEngine.activeNotes];
  }
</script>

<div class="practice-container">
  <div class="practice-header">
    <div class="title-wrap">
      <h3>🎹 โหมดฝึกซ้อมคอร์ดสด (Interactive AI Practice Mode)</h3>
      <p>ตรวจจับโน้ตคอร์ดแบบเรียลไทม์ผ่าน USB/Bluetooth MIDI หรือคลิกลิ่มเปียโนเพื่อฝึกซ้อม</p>
    </div>
    <div class="midi-status-badge">
      <span class="dot" class:connected={midiConnected}></span>
      <span class="device-label">MIDI: {midiDeviceName}</span>
      {#if !midiConnected}
        <button class="connect-btn" onclick={connectMidi}>เชื่อมต่อ USB MIDI</button>
      {/if}
    </div>
  </div>

  <!-- AI Evaluation HUD -->
  <div class="hud-grid">
    <div class="hud-card">
      <span class="hud-tag">คอร์ดเป้าหมาย (TARGET)</span>
      <div class="hud-value gold">{currentChord}</div>
      <div class="hud-sub">
        {targetNotes.length > 0 ? `โน้ต: ${targetNotes.join(' - ')}` : 'พักมือ (No Chord)'}
      </div>
    </div>

    <div class="hud-card">
      <span class="hud-tag">ความแม่นยำ (AI ACCURACY)</span>
      <div class="hud-value cyan">{evaluation.score}%</div>
      <div class="score-track">
        <div
          class="score-bar"
          style="width: {evaluation.score}%; background: {evaluation.score >= 80 ? '#10b981' : (evaluation.score >= 40 ? '#f59e0b' : '#ef4444')};"
        ></div>
      </div>
    </div>

    <div class="hud-card">
      <span class="hud-tag">โน้ตที่กดอยู่ (ACTIVE NOTES)</span>
      <div class="hud-value notes">
        {evaluation.pressedNotes.length > 0 ? evaluation.pressedNotes.join(', ') : '—'}
      </div>
      <div class="hud-sub feedback">{evaluation.feedback}</div>
    </div>
  </div>

  <!-- Virtual Piano -->
  <PianoKeyboard
    {activeNotes}
    {targetPitchClasses}
    onNoteDown={handleNoteDown}
    onNoteUp={handleNoteUp}
  />
</div>

<style>
  .practice-container {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 20px;
    margin-top: 16px;
  }
  .practice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .title-wrap h3 {
    margin: 0 0 4px;
    font-size: 16px;
    color: #f1f5f9;
  }
  .title-wrap p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }
  .midi-status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #64748b;
  }
  .dot.connected {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }
  .device-label {
    color: #cbd5e1;
  }
  .connect-btn {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .connect-btn:hover {
    background: #1d4ed8;
  }

  /* HUD */
  .hud-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: 16px;
    margin: 20px 0;
  }
  @media (max-width: 768px) {
    .hud-grid {
      grid-template-columns: 1fr;
    }
  }
  .hud-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 16px;
  }
  .hud-tag {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.8px;
  }
  .hud-value {
    font-size: 28px;
    font-weight: 800;
    margin: 6px 0;
    font-family: monospace;
  }
  .hud-value.gold { color: #f59e0b; }
  .hud-value.cyan { color: #38bdf8; }
  .hud-value.notes { font-size: 20px; color: #f8fafc; }
  .hud-sub {
    font-size: 12px;
    color: #94a3b8;
  }
  .hud-sub.feedback {
    color: #6ee7b7;
  }
  .score-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 8px;
  }
  .score-bar {
    height: 100%;
    transition: width 0.2s, background 0.2s;
  }
</style>
