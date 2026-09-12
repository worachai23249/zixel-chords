<script lang="ts">
  import { workspace } from '../stores/workspace.svelte';

  let { health }: { health?: { ready: boolean; gpu: string; engine: string; engineVersion?: string } } = $props();
</script>

<div class="status-bar">
  <div class="status-left">
    <span class="indicator" class:ready={health?.ready}></span>
    <span class="text">
      Engine: <strong>{health?.engine || 'CrispASR'} {health?.engineVersion || ''}</strong>
    </span>
    <span class="divider">|</span>
    <span class="gpu-info">
      🚀 GPU: <strong>{health?.gpu || 'NVIDIA GeForce RTX 3070 Ti Laptop GPU'}</strong>
    </span>
  </div>

  <div class="status-right">
    {#if workspace.song}
      <span class="meta-tag">Key: <strong>{workspace.key}</strong></span>
      <span class="meta-tag">BPM: <strong>{workspace.bpm}</strong></span>
      <span class="meta-tag">Meter: <strong>{workspace.song.meter || 4}/4</strong></span>
      <span class="meta-tag schema-tag">Schema: v{workspace.song.schemaVersion || 1}</span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    background: #0d1017;
    border-top: 1px solid #1f2736;
    padding: 6px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94a3b8;
  }
  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
  }
  .indicator.ready {
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }
  strong {
    color: #f1f5f9;
  }
  .divider {
    color: #334155;
  }
  .meta-tag {
    background: #19202e;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #283245;
  }
  .schema-tag {
    color: #38bdf8;
    border-color: #0284c7;
  }
</style>
