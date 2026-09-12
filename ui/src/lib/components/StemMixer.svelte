<script lang="ts">
  import { workspace } from '../stores/workspace.svelte';

  const stemsList = [
    { key: 'vocals', label: 'เสียงร้อง (Vocals)', icon: '🎤' },
    { key: 'drums', label: 'กลอง (Drums)', icon: '🥁' },
    { key: 'bass', label: 'เบส (Bass)', icon: '🎸' },
    { key: 'guitar', label: 'กีตาร์/ดนตรี (Guitar/Other)', icon: '🎹' },
  ];
</script>

<div class="stem-mixer">
  <div class="mixer-header">
    <h4>🎛️ สตูดิโอมิกเซอร์แยกแทร็ก (Moises-Style Stem Mixer)</h4>
    <span class="status-badge" class:active={workspace.stemsEnabled}>
      {workspace.stemsEnabled ? 'เปิดใช้งานแทร็กแยก' : 'ยังไม่ได้แยกแทร็ก'}
    </span>
  </div>

  <div class="tracks-container">
    {#each stemsList as stem}
      {@const volume = workspace.stemVolumes[stem.key] ?? 1.0}
      {@const isMuted = workspace.stemMuted[stem.key] ?? false}
      {@const isSolo = workspace.stemSolo === stem.key}

      <div class="track-row" class:soloed={isSolo} class:muted={isMuted}>
        <div class="track-label">
          <span class="icon">{stem.icon}</span>
          <span class="name">{stem.label}</span>
        </div>

        <div class="fader-control">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            disabled={!workspace.stemsEnabled}
            oninput={(e) => workspace.setStemVolume(stem.key, parseFloat(e.currentTarget.value))}
          />
          <span class="volume-val">{Math.round(volume * 100)}%</span>
        </div>

        <div class="buttons">
          <button
            class="btn-mute"
            class:active={isMuted}
            disabled={!workspace.stemsEnabled}
            onclick={() => workspace.toggleMute(stem.key)}
          >
            M
          </button>
          <button
            class="btn-solo"
            class:active={isSolo}
            disabled={!workspace.stemsEnabled}
            onclick={() => workspace.toggleSolo(stem.key)}
          >
            S
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .stem-mixer {
    background: #131720;
    border: 1px solid #222938;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mixer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mixer-header h4 {
    font-size: 14px;
    color: #f1f5f9;
    font-weight: 600;
  }
  .status-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #222938;
    color: #94a3b8;
  }
  .status-badge.active {
    background: #064e3b;
    color: #6ee7b7;
  }
  .tracks-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .track-row {
    background: #181d28;
    border: 1px solid #263043;
    border-radius: 6px;
    padding: 8px 12px;
    display: grid;
    grid-template-columns: 180px 1fr 80px;
    align-items: center;
    gap: 16px;
  }
  .track-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e2e8f0;
  }
  .fader-control {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .fader-control input[type='range'] {
    flex: 1;
    accent-color: #3b82f6;
  }
  .volume-val {
    width: 36px;
    text-align: right;
    font-size: 11px;
    font-family: monospace;
    color: #94a3b8;
  }
  .buttons {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
  .btn-mute,
  .btn-solo {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid #334155;
    background: #1e293b;
    color: #94a3b8;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
  }
  .btn-mute.active {
    background: #7f1d1d;
    border-color: #ef4444;
    color: #fee2e2;
  }
  .btn-solo.active {
    background: #d97706;
    border-color: #fbbf24;
    color: #fffbeb;
  }
</style>
