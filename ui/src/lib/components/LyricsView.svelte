<script lang="ts">
  import { workspace } from '../stores/workspace.svelte';

  let lyrics = $derived(workspace.song?.lyrics || { segments: [] });
  let segments = $derived(lyrics.segments || []);
  let currentTime = $derived(workspace.currentTime);
</script>

<div class="lyrics-view">
  <div class="lyrics-header">
    <h4>เนื้อเพลงและการร้อง (Synchronized Lyrics)</h4>
    <span class="lang-tag">ภาษา: {lyrics.language || 'auto'}</span>
  </div>

  <div class="lyrics-scroll">
    {#if segments.length === 0}
      <p class="no-lyrics">ไม่มีเนื้อเพลงในแทร็กนี้ หรือยังไม่ได้เปิดระบบแกะเนื้อร้อง</p>
    {:else}
      {#each segments as seg}
        {@const isActive = currentTime >= seg.start && currentTime <= seg.end}
        <div class="lyric-line" class:active={isActive}>
          <span class="time">[{Math.floor(seg.start)}s]</span>
          <span class="text">{seg.text}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .lyrics-view {
    background: #131720;
    border: 1px solid #222938;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .lyrics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lyrics-header h4 {
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 600;
  }
  .lang-tag {
    font-size: 11px;
    color: #64748b;
  }
  .lyrics-scroll {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 6px;
  }
  .no-lyrics {
    color: #64748b;
    font-size: 13px;
    text-align: center;
    padding: 24px;
  }
  .lyric-line {
    display: flex;
    gap: 12px;
    font-size: 14px;
    color: #94a3b8;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .lyric-line.active {
    background: #1e293b;
    color: #38bdf8;
    font-weight: 600;
  }
  .time {
    font-family: monospace;
    font-size: 11px;
    color: #475569;
  }
  .lyric-line.active .time {
    color: #0284c7;
  }
</style>
