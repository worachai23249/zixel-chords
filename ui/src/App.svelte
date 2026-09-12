<script lang="ts">
  import { onMount } from 'svelte';
  import { workspace } from './lib/stores/workspace.svelte';
  import { AnalysisApiClient } from '../../client/analysis-api';
  import ProgressOverlay from './lib/components/ProgressOverlay.svelte';
  import ChordGrid from './lib/components/ChordGrid.svelte';
  import StemMixer from './lib/components/StemMixer.svelte';
  import LyricsView from './lib/components/LyricsView.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import PracticeMode from './lib/components/PracticeMode.svelte';
  import { downloadMidi } from '../../client/midi-export';

  const api = new AnalysisApiClient();
  let health = $state<any>(null);
  let library = $state<any[]>([]);
  let activeTab = $state<'chords' | 'mixer' | 'lyrics' | 'practice'>('chords');
  let audioPlayer = $state<HTMLAudioElement | null>(null);

  onMount(async () => {
    try {
      health = await api.getHealth();
      library = await api.listLibrary();
    } catch (e) {
      console.warn('Init error:', e);
    }
  });

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      workspace.setProgress({
        jobId: 'active',
        stage: 'upload',
        percent: 5,
        message: 'กำลังอัปโหลดไฟล์เพลง...'
      });

      const result = await api.analyze(file, { mode: 'fast' }, (p) => {
        workspace.setProgress(p);
      });

      workspace.setSong(result);
      if (result.audioUrl && audioPlayer) {
        audioPlayer.src = result.audioUrl;
      }
      library = await api.listLibrary();
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      workspace.setProgress(null);
    }
  }

  async function loadLibrarySong(songId: string) {
    try {
      const song = await api.getSong(songId);
      workspace.setSong(song);
      if (audioPlayer) {
        audioPlayer.src = `/api/library/${encodeURIComponent(songId)}/audio`;
      }
    } catch (err: any) {
      alert(`Cannot load song: ${err.message}`);
    }
  }

  function handleTimeUpdate() {
    if (audioPlayer) {
      workspace.currentTime = audioPlayer.currentTime;
      workspace.duration = audioPlayer.duration || workspace.duration;
    }
  }

  function togglePlay() {
    if (!audioPlayer) return;
    if (audioPlayer.paused) {
      audioPlayer.play();
      workspace.isPlaying = true;
    } else {
      audioPlayer.pause();
      workspace.isPlaying = false;
    }
  }

  function handleSeek(time: number) {
    if (audioPlayer) {
      audioPlayer.currentTime = time;
      workspace.currentTime = time;
    }
  }

  function handleExportMidi() {
    if (!workspace.song) return;
    downloadMidi(workspace.song, workspace.song.title);
  }
</script>

<div class="studio-app">
  <!-- Hidden HTML5 Audio Element for synchronization -->
  <audio
    bind:this={audioPlayer}
    ontimeupdate={handleTimeUpdate}
    onplay={() => (workspace.isPlaying = true)}
    onpause={() => (workspace.isPlaying = false)}
  ></audio>

  <!-- Top Studio Navigation Bar -->
  <header class="app-header">
    <div class="brand">
      <span class="logo">⚡</span>
      <div class="titles">
        <h1>Zixel Chords</h1>
        <span class="subtitle">Ultimate Local AI Music Workstation</span>
      </div>
    </div>

    <!-- Center Playback Controls -->
    <div class="playback-controls">
      <button class="btn-play" onclick={togglePlay} disabled={!workspace.song}>
        {workspace.isPlaying ? '⏸ หยุด' : '▶ เล่น'}
      </button>

      <div class="time-readout">
        <span class="current">{workspace.formattedCurrentTime}</span>
        <span class="sep">/</span>
        <span class="total">{workspace.formattedDuration}</span>
      </div>

      <div class="transpose-controls">
        <button onclick={() => workspace.setTranspose(workspace.transpose - 1)}>-1</button>
        <span class="transpose-badge">
          {workspace.transpose >= 0 ? `+${workspace.transpose}` : workspace.transpose}
        </span>
        <button onclick={() => workspace.setTranspose(workspace.transpose + 1)}>+1</button>
      </div>
    </div>

    <!-- Right Upload & Action -->
    <div class="header-actions">
      <button class="btn-export-midi" onclick={handleExportMidi} disabled={!workspace.song}>
        🎹 ส่งออก MIDI (.mid)
      </button>
      <label class="btn-upload">
        📁 เลือกไฟล์เสียง (AI Analyze)
        <input type="file" accept="audio/*" onchange={handleFileUpload} />
      </label>
    </div>
  </header>

  <!-- Main Workstation Body -->
  <main class="workspace-body">
    <!-- Left Navigation Tabs & Library -->
    <aside class="sidebar">
      <div class="tab-buttons">
        <button class:active={activeTab === 'chords'} onclick={() => (activeTab = 'chords')}>
          🎵 ตารางคอร์ด
        </button>
        <button class:active={activeTab === 'mixer'} onclick={() => (activeTab = 'mixer')}>
          🎛️ สเตมมิกเซอร์
        </button>
        <button class:active={activeTab === 'lyrics'} onclick={() => (activeTab = 'lyrics')}>
          📝 เนื้อเพลง
        </button>
        <button class:active={activeTab === 'practice'} onclick={() => (activeTab = 'practice')}>
          🎹 โหมดซ้อมสด
        </button>
      </div>

      <div class="library-panel">
        <h5>แฟ้มเพลงในเครื่อง ({library.length})</h5>
        <div class="song-list">
          {#each library as item}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="song-item"
              class:selected={workspace.song?.id === item.id}
              onclick={() => loadLibrarySong(item.id)}
            >
              <div class="song-title">{item.title}</div>
              <div class="song-meta">{item.key || '—'} · {item.bpm || '—'} BPM</div>
            </div>
          {/each}
        </div>
      </div>
    </aside>

    <!-- Center Stage Workspace -->
    <section class="stage">
      {#if activeTab === 'chords'}
        <ChordGrid onSeek={handleSeek} />
      {:else if activeTab === 'mixer'}
        <StemMixer />
      {:else if activeTab === 'lyrics'}
        <LyricsView />
      {:else if activeTab === 'practice'}
        <PracticeMode />
      {/if}
    </section>
  </main>

  <!-- Bottom Hardware Status Bar -->
  <StatusBar {health} />

  <!-- Analysis Progress Overlay -->
  <ProgressOverlay onCancel={() => api.cancel(workspace.currentJobId || '')} />
</div>

<style>
  .studio-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0b0e14;
    color: #f1f5f9;
  }
  .app-header {
    background: #121722;
    border-bottom: 1px solid #1f2736;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo {
    font-size: 22px;
  }
  .titles h1 {
    font-size: 16px;
    font-weight: 700;
  }
  .subtitle {
    font-size: 10px;
    color: #64748b;
    letter-spacing: 0.5px;
  }
  .playback-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .btn-play {
    background: #2563eb;
    color: white;
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-play:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .time-readout {
    font-family: monospace;
    font-size: 13px;
    color: #cbd5e1;
  }
  .transpose-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1a2233;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid #29354a;
  }
  .transpose-controls button {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px 6px;
    font-weight: bold;
  }
  .transpose-badge {
    font-size: 11px;
    font-weight: bold;
    color: #38bdf8;
    min-width: 24px;
    text-align: center;
  }
  .btn-export-midi {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f1f5f9;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 8px;
    transition: all 0.2s;
  }
  .btn-export-midi:hover:not(:disabled) {
    background: #334155;
    border-color: #64748b;
  }
  .btn-export-midi:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-upload {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f1f5f9;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
  .btn-upload input {
    display: none;
  }
  .workspace-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .sidebar {
    width: 280px;
    background: #0f131a;
    border-right: 1px solid #1f2736;
    display: flex;
    flex-direction: column;
  }
  .tab-buttons {
    display: flex;
    border-bottom: 1px solid #1f2736;
  }
  .tab-buttons button {
    flex: 1;
    background: none;
    border: none;
    padding: 10px;
    font-size: 12px;
    color: #94a3b8;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tab-buttons button.active {
    color: #38bdf8;
    border-color: #38bdf8;
    background: #141b24;
  }
  .library-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12px;
    overflow: hidden;
  }
  .library-panel h5 {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .song-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .song-item {
    background: #141923;
    border: 1px solid #1e2738;
    border-radius: 6px;
    padding: 8px 10px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .song-item:hover {
    background: #1c2333;
  }
  .song-item.selected {
    border-color: #2563eb;
    background: #172554;
  }
  .song-title {
    font-size: 13px;
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .song-meta {
    font-size: 11px;
    color: #64748b;
  }
  .stage {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
</style>
