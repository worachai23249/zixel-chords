<script lang="ts">
  import { workspace } from '../stores/workspace.svelte';
  import type { Beat, ChordEvent } from '../../../../contracts/analysis-contract';

  let { onSeek }: { onSeek?: (time: number) => void } = $props();

  let beats = $derived(workspace.song?.beats || []);
  let currentTime = $derived(workspace.currentTime);

  function handleBeatClick(beat: Beat) {
    if (onSeek) onSeek(beat.time);
  }
</script>

<div class="chord-grid-container">
  <div class="grid-header">
    <h4>ตารางคอร์ดและห้องเพลง (Harmonic Beat Grid)</h4>
    <div class="legend">
      <span class="indicator downbeat-dot"></span> ดาวน์บีท (ห้องใหม่)
      <span class="indicator regular-dot"></span> บีทปกติ
    </div>
  </div>

  {#if beats.length === 0}
    <div class="empty-state">
      <p>ยังไม่มีข้อมูลเพลง กรุณาเลือกหรืออัปโหลดเพลงเพื่อเริ่มแกะคอร์ด</p>
    </div>
  {:else}
    <div class="beats-grid">
      {#each beats as beat, idx}
        {@const isActive = currentTime >= beat.time && (idx === beats.length - 1 || currentTime < beats[idx + 1].time)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="beat-card"
          class:downbeat={beat.downbeat}
          class:active={isActive}
          onclick={() => handleBeatClick(beat)}
        >
          <div class="beat-chord">{beat.chord || 'N.C.'}</div>
          <div class="beat-footer">
            <span class="beat-num">#{idx + 1}</span>
            <span class="beat-time">{beat.time.toFixed(1)}s</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chord-grid-container {
    background: #131720;
    border: 1px solid #222938;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .grid-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .grid-header h4 {
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 600;
  }
  .legend {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .indicator {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .downbeat-dot { background: #3b82f6; }
  .regular-dot { background: #475569; }

  .empty-state {
    padding: 40px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
  }
  .beats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 6px;
    max-height: 380px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .beat-card {
    background: #181e2b;
    border: 1px solid #283245;
    border-radius: 6px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.1s ease;
  }
  .beat-card:hover {
    background: #232c3d;
    border-color: #3b82f6;
  }
  .beat-card.downbeat {
    border-top: 3px solid #3b82f6;
    background: #1a2233;
  }
  .beat-card.active {
    background: #2563eb;
    border-color: #60a5fa;
    transform: scale(1.04);
    box-shadow: 0 0 12px rgba(37, 99, 235, 0.5);
  }
  .beat-chord {
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    font-family: var(--font-mono);
  }
  .beat-card.active .beat-chord {
    color: #ffffff;
  }
  .beat-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
    margin-top: 4px;
    font-size: 9px;
    color: #64748b;
  }
  .beat-card.active .beat-footer {
    color: #bfdbfe;
  }
</style>
