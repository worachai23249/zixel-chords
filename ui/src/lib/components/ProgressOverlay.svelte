<script lang="ts">
  import { workspace } from '../stores/workspace.svelte';

  let { onCancel }: { onCancel?: () => void } = $props();

  let percent = $derived(workspace.progress?.percent ?? 0);
  let stage = $derived(workspace.progress?.stage ?? 'upload');
  let message = $derived(workspace.progress?.message ?? 'กำลังประมวลผล...');
  let detail = $derived(workspace.progress?.detail ?? '');
</script>

{#if workspace.isAnalyzing}
  <div class="progress-backdrop">
    <div class="progress-modal">
      <div class="header">
        <h3>AI Analysis in Progress</h3>
        <span class="badge">{stage.toUpperCase()}</span>
      </div>

      <div class="bar-container">
        <div class="bar-fill" style="width: {percent}%"></div>
      </div>

      <div class="stats">
        <span class="message">{message}</span>
        <span class="percent">{Math.round(percent)}%</span>
      </div>

      {#if detail}
        <p class="detail">{detail}</p>
      {/if}

      <div class="actions">
        <button class="btn-cancel" onclick={onCancel}>
          ✕ ยกเลิกการวิเคราะห์ (Cancel Job)
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .progress-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8, 10, 15, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  .progress-modal {
    background: #151a24;
    border: 1px solid #283245;
    border-radius: 12px;
    padding: 24px;
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
  }
  .badge {
    background: #2563eb;
    color: #fff;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: monospace;
  }
  .bar-container {
    height: 8px;
    background: #222938;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    transition: width 0.25s ease-out;
  }
  .stats {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #cbd5e1;
    margin-bottom: 8px;
  }
  .percent {
    font-family: monospace;
    font-weight: 700;
  }
  .detail {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 20px;
    line-height: 1.4;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
  }
  .btn-cancel {
    background: #2d1818;
    border: 1px solid #7f1d1d;
    color: #fca5a5;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-cancel:hover {
    background: #451a1a;
  }
</style>
