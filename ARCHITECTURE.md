# Zixel Chords — Ultimate Local AI Music Workstation

สถานะ: Architecture proposal v0.1  
วันที่: 11 กันยายน 2026  
เป้าหมายแพลตฟอร์มแรก: Windows 11 + NVIDIA RTX 3070 Ti Laptop GPU  
โหมดการประมวลผล: Local-first, offline-capable หลังติดตั้งโมเดล

เอกสารนี้แปลง Blueprint ของ “The Ultimate Local AI Music Workstation” ให้เป็นแผนที่นำไปพัฒนาต่อได้จริงกับโค้ดใน repository ปัจจุบัน โดยแบ่งงานเป็นช่วงที่ตรวจสอบผลได้ และรักษาแอปเดิมให้ใช้งานได้ระหว่างการย้ายระบบ

## 1. ข้อสรุปเชิงสถาปัตยกรรม

เราจะไม่ย้ายทั้งระบบในครั้งเดียว เป้าหมายที่ปลอดภัยที่สุดคือทำให้ระบบมี “core contract” กลางก่อน แล้วค่อยสลับ runtime ทีละชั้น:

1. รักษา Node.js + Vanilla JS เป็น compatibility baseline ระหว่างการพัฒนา
2. แยกสัญญาข้อมูลของการวิเคราะห์เพลงออกจาก HTTP และ DOM
3. เพิ่ม Tauri v2 + Rust เป็น native host แบบขนาน โดยให้เรียก engine ผ่าน adapter เดียวกับโหมดเดิม
4. เปลี่ยนโมเดลทีละตัว โดยต้องมี golden-set และ benchmark ก่อนประกาศว่าแม่นขึ้นหรือเร็วขึ้น
5. ให้ TensorRT เป็น backend ที่เลือกใช้ได้เมื่อ model export, plugin, driver และ license ผ่านการตรวจสอบ ไม่บังคับเป็น dependency ของทุกเครื่อง
6. ใช้ Svelte 5 สำหรับ UI ใหม่แบบค่อยเป็นค่อยไป ไม่แปลง `index.html` และ `app.js` ทั้งหมดใน commit เดียว

Tauri เหมาะกับทิศทางนี้เพราะเป็น native Rust binary ที่สื่อสารกับ WebView ผ่าน message passing และสามารถกำหนด capability/permission แยกเป็นรายฟังก์ชันได้ ([Tauri architecture](https://v2.tauri.app/concept/architecture/), [Tauri capabilities](https://v2.tauri.app/security/capabilities/))

## 2. ภาพรวมสถานะปัจจุบัน

### สิ่งที่มีอยู่แล้ว

- `server.js`: local HTTP server, upload, analysis jobs, model download, library, stem separation และ progress API
- `index.html` + `style.css` + `app.js`: UI สตูดิโอ, chord grid, beat grid, lyrics, looping, transpose, metronome และ stem mixer
- `.engine/crispasr/crispasr.exe`: local CLI runtime ที่ตรวจ GPU ผ่าน Vulkan diagnostics
- `.engine/models/`: BTC chord model, Beat This! model, HTDemucs model และ Whisper base model
- `rubberband-processor.js`: AudioWorklet bundle ที่กำลังถูกใช้เป็น pitch-shifting path ใน working tree
- `README.md`: ขั้นตอนติดตั้งและข้อจำกัดด้าน license/การใช้งานส่วนตัว

### สิ่งที่ยังไม่ใช่ตาม Blueprint

- ยังไม่มี Cargo/Rust workspace หรือ `src-tauri`
- ยังไม่มี Svelte/Vite/TypeScript build pipeline
- inference ยังผ่าน CrispASR CLI และไฟล์ชั่วคราว ไม่ใช่ TensorRT in-process zero-copy pipeline
- separation ปัจจุบันคือ HTDemucs ไม่ใช่ Mel-Band/BS-RoFormer
- ASR ปัจจุบันคือ Whisper base; ยังไม่มี WhisperX alignment pipeline
- chord output ปัจจุบันเป็นผลจาก BTC และ normalization ฝั่ง server; ยังไม่มี voicing/inversion model ที่เป็น contract แยก
- ยังไม่มี measurement harness ที่รายงาน latency, memory, GPU VRAM และ accuracy แบบทำซ้ำได้

ข้อสรุปสำคัญ: Blueprint เป็น target architecture ไม่ใช่คำยืนยันว่าทุกโมเดลหรือทุกตัวเลขพร้อมใช้ใน runtime ปัจจุบัน

## 3. Target architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Tauri v2 desktop shell                                                │
│  Svelte 5 + TypeScript                                                │
│  - Workspace / chord grid / lyrics / mixer / visualizer               │
│  - Tauri invoke + event subscriptions                                 │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ typed commands/events
┌──────────────────────────────▼───────────────────────────────────────┐
│ Rust application core                                                 │
│  app_state · job_queue · storage · diagnostics · security             │
│  - decode audio into canonical PCM                                     │
│  - schedule analysis jobs and cancellation                            │
│  - publish progress and results                                        │
└──────────────┬──────────────────────────┬────────────────────────────┘
               │                          │
┌──────────────▼─────────────┐  ┌─────────▼───────────────────────────┐
│ DSP / MIR pipeline          │  │ Inference backend adapters           │
│ symphonia · STFT · AVX2     │  │ TensorRT FP16/INT8 (primary)         │
│ key / beat / chord fusion   │  │ Vulkan/CLI (compatibility fallback)  │
│ RMVPE post-processing       │  │ ONNX/Python worker (model bring-up) │
└──────────────┬─────────────┘  └─────────┬───────────────────────────┘
               │                          │
               └──────────────┬───────────┘
                              ▼
                   Typed AnalysisResult
                              │
                 SQLite/library + frontend state
```

### หลักการแบ่งชั้น

| ชั้น | หน้าที่ | ห้ามทำ |
|---|---|---|
| UI | แสดงและแก้ไขผลลัพธ์, ควบคุม playback | เรียก subprocess หรืออ่าน path ของ engine โดยตรง |
| Tauri commands | ตรวจ input, เริ่ม/ยกเลิก job, ส่ง event | ฝัง logic ของโมเดลไว้ใน command handler |
| Application core | orchestration, state, persistence, telemetry | ผูกกับ DOM หรือชื่อ endpoint เดิม |
| DSP/MIR | decode, STFT, beat/chord/key/pitch post-processing | เขียนผลลงไฟล์ชั่วคราวเป็น default path |
| Inference adapter | โหลด model, prepare tensor, run inference | ตัดสินใจเรื่อง UI หรือ library |
| Storage | metadata, analysis result, model manifest | เก็บข้อมูลลับหรือไฟล์เสียงนอก scope ที่ผู้ใช้อนุญาต |

## 4. Canonical data contract

สัญญานี้ควรเป็น source of truth ร่วมกันระหว่าง Node compatibility mode, Rust core และ frontend ใหม่

```ts
type AnalysisRequest = {
  audioPath: string;
  mode: 'fast' | 'studio';
  language: 'auto' | 'th' | 'en' | 'ja' | 'ko' | 'zh';
  meter: 'auto' | 2 | 3 | 4 | 6;
  features: {
    stems: boolean;
    lyrics: boolean;
    vocalPitch: boolean;
    chordVoicing: boolean;
  };
};

type AnalysisProgress = {
  jobId: string;
  stage: 'decode' | 'separate' | 'beats' | 'chords' | 'lyrics' | 'pitch' | 'merge' | 'persist';
  percent: number;
  message: string;
  detail?: string;
  etaSeconds?: number;
};

type AnalysisResult = {
  schemaVersion: 1;
  source: { fileName: string; durationSeconds: number; sampleRate: number; channels: number };
  timing: { bpm?: number; meter?: string; beats: Beat[]; downbeats: number[] };
  harmony: { key?: string; chords: ChordEvent[]; confidence?: number };
  lyrics: { language: string; segments: LyricSegment[] };
  vocalPitch?: { points: PitchPoint[]; confidence: number[] };
  stems?: StemManifest[];
  provenance: { runtime: string; models: ModelProvenance[]; createdAt: string };
};
```

กติกา:

- เพิ่ม field ได้แบบ backward-compatible; การเปลี่ยนความหมายของ field ต้องเพิ่ม `schemaVersion`
- เวลาทั้งหมดเป็น seconds แบบ `number` และต้องเก็บ sample-accurate data เฉพาะในชั้น DSP เมื่อจำเป็น
- chord event ต้องแยก `root`, `quality`, `bass`, `start`, `end`, `confidence` ไม่ใช้ string อย่างเดียว
- model/runtime provenance ต้องติดไปกับผลลัพธ์ทุกครั้ง เพื่อย้อนตรวจได้ว่าเพลงถูกวิเคราะห์ด้วยอะไร
- job ที่ถูกยกเลิกต้องไม่ถูกบันทึกเป็นผลลัพธ์สมบูรณ์

## 5. Model and runtime strategy

### 5.1 Separation

| ระยะ | backend | บทบาท |
|---|---|---|
| Baseline | HTDemucs ผ่าน CrispASR | ใช้ต่อไปเพื่อไม่ทำลาย library เดิม |
| Bring-up | Mel-Band/BS-RoFormer ผ่าน isolated worker | ตรวจคุณภาพ, memory และ model export ก่อนผูกกับ Rust |
| Target | TensorRT FP16; INT8 เฉพาะ model ที่ผ่าน calibration | ใช้กับ GPU ที่รองรับและมี engine cache ที่ตรงกับ hardware |

Mel-Band/BS-RoFormer เป็น candidate ที่มีงานวิจัยและ implementation เปิดเผย แต่ไม่ควรเรียกว่า “ดีกว่าเสมอ” จนกว่าจะวัดบนชุดเพลงของโปรเจกต์เอง ([Mel-Band RoFormer paper](https://arxiv.org/abs/2310.01809), [reference implementation](https://github.com/lucidrains/BS-RoFormer))

### 5.2 ASR and word alignment

- Baseline: Whisper base ที่มีอยู่
- Target: Whisper large-v3-Turbo หรือรุ่นที่ผลทดสอบภาษาไทยผ่านเกณฑ์ แล้วต่อด้วย WhisperX-style alignment
- ต้องวัดทั้ง WER/CER ภาษาไทย, word boundary error และเวลาประมวลผล ไม่ใช่วัดแค่ความยาว segment
- การ align ต้องมี fallback เมื่อไม่มี alignment model ที่รองรับภาษา หรือเพลงมีเสียงร้องที่ไม่ชัด

WhisperX ใช้ VAD และ forced phoneme alignment เพื่อปรับ timestamp ระดับคำ จึงเหมาะเป็น adapter แยก ไม่ควรฝังลงใน chord pipeline ([WhisperX repository](https://github.com/m-bain/whisperX), [WhisperX paper](https://arxiv.org/abs/2303.00747))

### 5.3 Chords and voicing

- คง BTC เป็น baseline เพื่อเทียบ regression
- แยก chord recognition ออกจาก voicing recognition ใน data contract
- voicing model ต้องรายงานอย่างน้อย root, quality, bass/inversion และ confidence
- ห้ามใส่ชื่อ “Mel-Band Chord Transformer” เป็น dependency จนกว่าจะมี repository, weights, license, input/output spec และผลทดสอบที่ตรวจสอบได้
- หากยังไม่มี model ที่ครบ ให้ใช้ BTC + DSP/harmonic post-processing เป็น transitional path และแสดง confidence ต่ำเมื่อไม่แน่ใจ

### 5.4 Beat and downbeat

คง Beat This! เป็น candidate หลัก เพราะมี implementation และ model checkpoints เปิดเผย พร้อม license ระบุใน repository ([Beat This!](https://github.com/CPJKU/beat_this))

การวัดต้องครอบคลุม 4/4, 3/4, 6/8 และ odd meter ที่มีในชุดทดสอบ ไม่ใช้เฉพาะเพลงป๊อป 4/4

### 5.5 Vocal pitch

เพิ่ม RMVPE เป็น optional feature หลัง stem/lyrics path เสถียร เพราะเป็น pipeline ใหม่และต้องมี post-processing เรื่อง unvoiced frames, octave errors และ smoothing ([RMVPE paper](https://arxiv.org/abs/2306.15412))

## 6. GPU and zero-copy design

### หลักที่ใช้จริง

1. decode audio เป็น canonical PCM ครั้งเดียว
2. ทำ resample/channel layout ให้เสร็จก่อนสร้าง tensor
3. ใช้ pinned host buffer สำหรับ transfer ไป GPU
4. reuse allocation และ execution context ระหว่าง chunk
5. overlap H2D copy, inference และ post-processing เมื่อ dependency อนุญาต
6. หลีกเลี่ยงการ encode/decode WAV ระหว่าง stage
7. เก็บ temp file เป็น fallback/debug mode เท่านั้น

คำว่า “zero-copy” ต้องใช้ด้วยความหมายที่ถูกต้อง: บน discrete RTX GPU การส่งข้อมูลจาก RAM ไป VRAM ยังมี transfer cost; เป้าหมายระยะแรกคือ zero-copy ระหว่าง stage ใน process และลด disk round-trip ไม่ใช่สัญญาว่าไม่มี PCIe copy
ing CrispASR/Vulkan adapter
```

ทุก backend ต้องคืนผลใน `AnalysisResult` รูปแบบเดียวกัน และต้องรายงาน `backend`, `precision`, `engineVersion`, `fallbackReason` ใน provenance

### Engine cache

ใช้ cache key:

```text
modelSha256 + modelConfig + gpuComputeCapability + driverMajor + tensorrtMajor + precision
```

ห้าม reuse `.engine` ที่สร้างจาก GPU/driver/precision คนละชุดโดยไม่มี compatibility check การ build engine ครั้งแรกเป็น installation step ที่อาจใช้เวลานานกว่าการ inference ปกติ

ตัวเลข “เร็วขึ้น 2.5–4×” และ “แยกเพลง 4 นาทีเสร็จใน 6–8 วินาที” ให้ถือเป็น hypothesis เท่านั้นจนกว่าจะมี benchmark บนเครื่องจริงและชุดเพลงที่ระบุไว้

## 7. Native audio and DSP plan

ใช้ Rust core สำหรับ:

- decode/demux ผ่าน Symphonia
- canonical PCM conversion และ resampling
- STFT/iSTFT, windowing และ overlap-add
- beat/chord/key post-processing ที่ไม่ต้องใช้ neural inference
- job queue, cancellation, progress และ persistence

Symphonia เป็น pure-Rust decoder ที่รองรับ format สำคัญจำนวนมาก และมี SIMD feature flags ที่เปิดใช้ตาม target ได้ ([Symphonia](https://github.com/pdeljanov/Symphonia))

Pitch/time processing:

- ระยะแรกคง AudioWorklet/WASM path ที่มีอยู่เพื่อรักษา latency ของ playback
- แยก interface `TimePitchProcessor` ให้มี `WebAudioWasm` และ `NativeOffline` implementation
- ตรวจ license ของ Rubber Band ให้ชัดก่อน bundle/distribute: upstream ระบุว่า source อยู่ภายใต้ GPL และการใช้ใน proprietary commercial app ต้องมี commercial license ([Rubber Band](https://breakfastquay.com/rubberband/))
- ไม่ใช้คำว่า “R3 รุ่นล่าสุด” ในเอกสาร release จนกว่าจะยืนยันเวอร์ชันจริง เพราะ upstream ปัจจุบันอ้างถึง v4.0 และระบุว่า R3 มี technical differences

## 8. Frontend migration

Svelte 5 ใช้ runes เช่น `$state`, `$derived`, `$effect` เป็น syntax ของ compiler และรองรับการย้ายทีละ component ([Svelte runes](https://svelte.dev/docs/svelte/what-are-runes))

ลำดับการย้าย:

1. สร้าง typed `client/analysis-api.ts` ที่ห่อทั้ง `/api/*` เดิมและ Tauri `invoke`
2. ย้าย progress overlay และ status bar เป็น Svelte component แรก
3. ย้าย chord grid และ beat selection โดยรับ `AnalysisResult` เท่านั้น
4. ย้าย lyrics timeline และ stem mixer
5. ย้าย workspace shell และถอด DOM mutation จาก `app.js` ทีละกลุ่ม
6. ลบ legacy path เฉพาะเมื่อ browser compatibility mode และ Tauri mode ผ่าน parity tests

WebGPU:

- อย่าเริ่มด้วยการ rewrite SVG ทั้งหมด
- ใช้ virtualized DOM/Canvas2D เป็น baseline วัดจริงก่อน
- ใช้ WebGPU เฉพาะ waveform, piano-roll, fretboard ที่มีจำนวน primitive สูงและ profiler ชี้ว่าเป็น bottleneck
- fallback ต้องเป็น Canvas2D หรือ SVG เพื่อให้เครื่องที่ไม่มี WebGPU ยังใช้แอปได้
- target 120 FPS เป็น performance goal ของ visualizer ไม่ใช่ requirement ของ analysis engine หรือ audio clock

## 9. Storage, security and privacy

### Local data

โครงสร้างเป้าหมาย:

```text
app-data/
  library.sqlite
  audio/
  stems/
  analyses/
  models/
  engines/
  logs/
```

metadata และผลวิเคราะห์ควรอยู่ใน SQLite; ไฟล์เสียง/stems เก็บเป็น file artifact พร้อม hash และ reference จาก database

### Security rules

- default ไม่เปิด network service ที่ bind นอก `127.0.0.1`
- Tauri capability อนุญาตเฉพาะ file scope ที่ผู้ใช้เลือก และ command ที่จำเป็น
- ไม่ให้ frontend รับ arbitrary executable path
- validate file size, format, duration และ path traversal ทุก entry point
- model download ต้องแสดง source, license, checksum และสถานะการยอมรับ license
- log ต้องไม่ dump เนื้อเสียงหรือข้อมูลส่วนตัวโดยค่าเริ่มต้น

## 10. Phased roadmap

### Phase 0 — Baseline and observability

ผลลัพธ์:

- สร้าง golden audio set ที่ผู้ใช้มีสิทธิ์ใช้งาน
- เพิ่ม benchmark runner วัด wall time, per-stage time, peak RSS, VRAM, output schema และ failure reason
- เก็บ baseline ของ current CrispASR path
- เพิ่ม schema version และ model provenance ให้ผลวิเคราะห์
- ทำ regression tests สำหรับ library, stem mixer, chord edit, loop และ cancel job

Exit criteria: วิเคราะห์เพลงชุดเดิมซ้ำได้ผล schema เดียวกัน และมีตัวเลข baseline ที่ตรวจย้อนกลับได้

### Phase 1 — Core contract and adapter boundary

ผลลัพธ์:

- แยก `AnalysisRequest`, `AnalysisProgress`, `AnalysisResult`
- สร้าง adapter interface สำหรับ `Decoder`, `StemSeparator`, `BeatTracker`, `ChordRecognizer`, `LyricsAligner`, `PitchTracker`
- ให้ `server.js` เรียก adapter boundary โดยยังใช้ CrispASR เป็น implementation เดิม
- เพิ่ม cancellation และ bounded job queue

Exit criteria: เปลี่ยน implementation ของ stage หนึ่งโดยไม่แก้ UI และผลลัพธ์เดิมผ่าน parity tests

### Phase 2 — Tauri v2 shell and Rust core

ผลลัพธ์:

- เพิ่ม `src-tauri/` และ Rust workspace
- เปิด native file picker, local storage และ typed commands
- ฝัง/เรียก Node runtime เป็น compatibility sidecar ได้ชั่วคราวถ้าจำเป็น
- ทำ Tauri mode ที่เปิดเพลงและโหลดผลลัพธ์เดิมได้

Exit criteria: desktop build เปิดได้, ใช้ library เดิมได้, และมี fallback ไป browser mode เมื่อ native engine ไม่พร้อม

### Phase 3 — Svelte 5 migration

ผลลัพธ์:

- เพิ่ม Vite + Svelte 5 + TypeScript
- ย้าย overlay/status → chord grid → lyrics → mixer → workspace shell ตามลำดับ
- เพิ่ม typed frontend state และ event bridge

Exit criteria: UI feature parity กับโหมดเดิม และไม่มี direct DOM ownership ซ้อนกันใน component ที่ย้ายแล้ว

### Phase 4 — Model bring-up and inference backends

ผลลัพธ์:

- เพิ่ม isolated worker สำหรับ Mel/BS-RoFormer, WhisperX-style aligner และ RMVPE
- export/validate ONNX หรือ TensorRT ตาม model ที่ผ่านเกณฑ์
- เพิ่ม engine cache key และ checksum validation
- ทดสอบ FP16 ก่อน INT8

Exit criteria: แต่ละ model มี quality report, latency report, license record และ fallback path

### Phase 5 — Native DSP and zero-disk pipeline

ผลลัพธ์:

- ย้าย decode/STFT/resampling ที่เหมาะสมเข้า Rust
- ใช้ pinned buffers และ reusable GPU allocations
- ลด temp audio files ออกจาก happy path
- รัน stress test เพลงยาว, seek, cancel, loop และ concurrent jobs

Exit criteria: ไม่มี audio glitch ใน playback, cancel ไม่ทิ้ง orphan files และ peak memory อยู่ใน budget

### Phase 6 — Visualization and release hardening

ผลลัพธ์:

- profiler-driven WebGPU renderer พร้อม Canvas2D fallback
- crash recovery, model repair, log export และ diagnostics page
- signed Windows installer, reproducible model manifest และ license bundle

Exit criteria: release candidate ผ่าน functional, performance, offline, security และ license checklist

## 11. Performance budgets

ตัวเลขต่อไปนี้เป็น engineering targets สำหรับใช้ตัดสินใจ ไม่ใช่คำสัญญาผลิตภัณฑ์:

| เรื่อง | เป้าหมาย | วิธีวัด |
|---|---:|---|
| UI interaction | p95 < 50 ms | browser/WebView performance marks |
| Visualizer | 60 FPS minimum; 120 FPS target | frame-time histogram |
| Playback | ไม่มี underrun ในเพลง 4 นาที | audio callback/xrun counter |
| Analysis | รายงาน p50/p95 แยกตาม stage | benchmark runner |
| Memory | ไม่เพิ่มตามจำนวน seek/loop | 30 นาที soak test |
| Disk | ไม่มี temp WAV ใน happy path | filesystem trace |
| GPU | report VRAM peak และ transfer time | NVML/diagnostics adapter |
| Accuracy | chord/beat/lyrics/stem/pitch แยก metric | golden-set evaluator |

ต้องรายงานผลแยกตาม fast/studio, backend, precision, duration, sample rate และ GPU driver ไม่รวมทุกกรณีเป็นค่าเฉลี่ยเดียว

## 12. Evaluation protocol

### ชุดข้อมูล

แบ่งเป็น:

- `smoke/`: เสียงสั้นและ synthetic สำหรับ CI
- `golden/`: เพลงที่มี annotation ตรวจโดยมนุษย์และมีสิทธิ์ใช้งาน
- `stress/`: เพลงยาว, sample rate ต่างกัน, stereo/mono, silence, clipping, odd meter
- `adversarial/`: modulation, slash chord, dense mix, Thai/English code-switching, reverb และเสียงร้องเบา

### Metrics

- separation: SDR/SI-SDR, bleed estimate และ artifact review
- beats: beat/downbeat F-measure และ timing deviation
- chords: root accuracy, quality accuracy, segment overlap, inversion accuracy และ confidence calibration
- lyrics: WER/CER, word boundary error, dropped/duplicated token rate
- pitch: voiced/unvoiced accuracy, gross pitch error และ median cents error
- system: cold start, warm start, p50/p95/p99 latency, peak RAM/VRAM, failure/cancel rate

โมเดลใหม่จะถูก promote เป็น default ได้เมื่อผ่านทั้ง quality gate และ system gate; เร็วขึ้นแต่คุณภาพตก หรือแม่นขึ้นแต่ crash ง่าย ยังไม่ถือว่าผ่าน

## 13. Risk register

| ความเสี่ยง | ผลกระทบ | วิธีลดความเสี่ยง |
|---|---|---|
| model ไม่มี ONNX/TensorRT export ที่เทียบเท่า | แผน GPU ล่าช้า | ใช้ worker/CLI adapter เป็น bring-up path |
| INT8 ทำให้ chord/lyrics เพี้ยน | คุณภาพลดโดยตรวจไม่พบ | เริ่ม FP16, calibration set, per-stage golden tests |
| TensorRT/driver mismatch | เปิดเครื่องแล้ว inference ใช้ไม่ได้ | engine cache key, preflight diagnostics, fallback |
| Rust/Tauri migration ทำให้ playback regress | ผู้ใช้ใช้งานไม่ได้ | รักษา browser mode และทำ parity ก่อน cutover |
| WebGPU ไม่พร้อมบนบางเครื่อง | UI ว่างหรือกระตุก | Canvas2D fallback และ feature detection |
| Rubber Band license ไม่ตรงกับการแจกจ่าย | ความเสี่ยงด้านกฎหมาย/การ release | license review ก่อน bundle และมี fallback ที่สิทธิ์ชัดเจน |
| Thai alignment quality ไม่สม่ำเสมอ | lyrics sync ผิด | language-specific evaluation และ manual correction |
| คาดหวังตัวเลข benchmark สูงเกินจริง | roadmap ผิดทิศ | วัด baseline จริงก่อนตั้ง target |

## 14. Definition of done สำหรับ “Ultimate” release

- เปิดเป็น native desktop app ได้โดยไม่ต้องเปิด browser/server เอง
- ยังมี compatibility fallback ที่เปิดไฟล์และผลลัพธ์เดิมได้
- ทุก analysis job มี progress, cancellation, provenance และ error ที่อ่านได้
- model backend สลับได้โดยไม่เปลี่ยน frontend contract
- มีอย่างน้อยหนึ่ง SOTA candidate ที่ผ่าน evaluation จริงต่อหมวด separation, ASR alignment, beat และ pitch
- chord result แสดง confidence และแยก bass/inversion เมื่อ model รองรับ
- playback pitch/time processing ไม่ทำให้ timeline, lyrics, stems และ metronome หลุด sync
- no-cloud default, permission scope ชัด และตรวจ license ของ runtime/model ทุกตัว
- มี benchmark report ที่ทำซ้ำได้บน RTX 3070 Ti Laptop GPU และระบุ driver/runtime versions
- ตัวเลขความเร็วและความแม่นยำทั้งหมดอ้างอิงจาก benchmark ที่เก็บไว้ ไม่ใช่ค่าประมาณจากเอกสารการตลาด

## 15. Recommended first implementation slice

งานแรกที่ควรเริ่มหลังอนุมัติแผนนี้คือ Phase 0 + ส่วนต้นของ Phase 1:

1. เพิ่ม `schemaVersion` และ `provenance` ให้ผลจาก `server.js`
2. สร้าง golden-set manifest และ benchmark script โดยไม่เปลี่ยน model
3. ห่อ current CrispASR calls เป็น adapter interface
4. เพิ่ม cancellation/cleanup tests สำหรับ analysis และ stem sessions
5. ทำ report แรกเพื่อใช้เป็น baseline ก่อนตัดสินใจลงทุน TensorRT หรือเปลี่ยน separation model

วิธีนี้ทำให้ทุกการเปลี่ยนครั้งถัดไปตอบได้ด้วยหลักฐานว่า “แม่นขึ้นเร็วขึ้นหรือเสถียรขึ้นจริงหรือไม่” และยังไม่ทำลายแอปที่ใช้งานได้อยู่ในปัจจุบัน

## References

- [Tauri architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri capabilities and permissions](https://v2.tauri.app/security/capabilities/)
- [Svelte 5 runes](https://svelte.dev/docs/svelte/what-are-runes)
- [NVIDIA TensorRT performance optimization](https://docs.nvidia.com/deeplearning/tensorrt/latest/performance/optimization.html)
- [NVIDIA TensorRT quantized types](https://docs.nvidia.com/deeplearning/tensorrt/10.x.x/inference-library/work-quantized-types.html)
- [Beat This!](https://github.com/CPJKU/beat_this)
- [WhisperX](https://github.com/m-bain/whisperX) and [WhisperX paper](https://arxiv.org/abs/2303.00747)
- [Mel-Band RoFormer paper](https://arxiv.org/abs/2310.01809)
- [BS-RoFormer reference implementation](https://github.com/lucidrains/BS-RoFormer)
- [RMVPE paper](https://arxiv.org/abs/2306.15412)
- [Symphonia](https://github.com/pdeljanov/Symphonia)
- [Rubber Band Library](https://breakfastquay.com/rubberband/)
TensorRT รองรับ mixed precision รวมถึง FP16 และ INT8 แต่ INT8 ต้องมี calibration/validation และการเปลี่ยน precision อาจกระทบ accuracy ([TensorRT optimization](https://docs.nvidia.com/deeplearning/tensorrt/latest/performance/optimization.html), [TensorRT quantization](https://docs.nvidia.com/deeplearning/tensorrt/10.x.x/inference-library/work-quantized-types.html))

### Backend selection

```text
TensorRT engine available + matching GPU/driver
        ├─ yes → TensorRT adapter
        └─ no  → ONNX/Python bring-up adapter
                    └─ unavailable → exist
