# Zixel Chords — Golden Audio Set

ชุดเพลงทดสอบสำหรับ benchmark, regression test และ model evaluation

---

## โครงสร้าง

```
tools/golden-set/
  manifest.json         ← รายการ track ทั้งหมดพร้อม annotation
  audio/                ← ไฟล์เสียงจริง (ไม่ commit ไปใน git — เพิ่มใน .gitignore)
  annotations/          ← annotation JSON แต่ละ track
  README.md             ← ไฟล์นี้
```

## สิทธิ์การใช้งาน

**ทุกไฟล์ในโฟลเดอร์ `audio/` ต้องมีสิทธิ์ที่ใช้ได้กับวัตถุประสงค์นี้**:
- เป็นเสียงที่คุณสร้าง/บันทึกเอง, หรือ
- ได้รับอนุญาตจากเจ้าของ, หรือ
- ใช้ภายใต้ Creative Commons หรือ License ที่อนุญาตให้ใช้ทดสอบ

อย่าใส่เพลงที่มี copyright โดยไม่มีสิทธิ์ แม้ใช้ภายในเครื่องก็ตาม

---

## Format ของ `manifest.json`

```json
{
  "version": 1,
  "tracks": [
    {
      "id": "track_001",
      "filename": "audio/my_song.mp3",
      "title": "My Test Song",
      "durationSeconds": 212.5,
      "sampleRate": 44100,
      "license": "personal",
      "tags": ["pop", "4/4", "thai"],
      "annotation": "annotations/track_001.json"
    }
  ]
}
```

### Track fields

| Field | Type | คำอธิบาย |
|---|---|---|
| `id` | string | Unique ID สำหรับ track นี้ |
| `filename` | string | Path ไปยัง audio file (relative ถึง golden-set/) |
| `title` | string | ชื่อเพลง (ไม่ต้องเป็นชื่อจริงถ้ากังวลเรื่อง copyright) |
| `durationSeconds` | number | ความยาวเพลงในวินาที |
| `sampleRate` | number | Sample rate (Hz) |
| `license` | string | `personal`, `cc-by`, `cc-by-sa`, `cc0`, `permission-granted` |
| `tags` | string[] | Genre, meter, language, ลักษณะพิเศษ |
| `annotation` | string | Path ไปยัง annotation JSON |

---

## Format ของ annotation JSON

```json
{
  "trackId": "track_001",
  "annotator": "human",
  "annotatedAt": "2026-09-11T00:00:00Z",
  "key": "A Minor",
  "bpm": 120,
  "meter": 4,
  "chords": [
    { "start": 0.0,  "end": 2.0,  "chord": "Am" },
    { "start": 2.0,  "end": 4.0,  "chord": "F"  },
    { "start": 4.0,  "end": 6.0,  "chord": "C"  },
    { "start": 6.0,  "end": 8.0,  "chord": "G"  }
  ],
  "beats": [
    { "time": 0.0, "downbeat": true },
    { "time": 0.5, "downbeat": false }
  ],
  "lyrics": {
    "language": "th",
    "segments": []
  },
  "notes": "Verse 1 only; chorus starts at 32s"
}
```

---

## หมวดของชุดทดสอบ

| หมวด | โฟลเดอร์ | วัตถุประสงค์ |
|---|---|---|
| Smoke | `audio/smoke/` | เสียงสั้น <30s สำหรับ CI — ผ่านเร็ว |
| Golden | `audio/golden/` | เพลงมี annotation ตรวจโดยมนุษย์ — ใช้วัด accuracy |
| Stress | `audio/stress/` | เพลงยาว, sample rate หลากหลาย, odd meter |
| Adversarial | `audio/adversarial/` | Modulation, slash chord, reverb หนัก, ไทย-อังกฤษ code-switch |

---

## การเพิ่ม track ใหม่

1. วางไฟล์เสียงใน `audio/<หมวด>/`
2. สร้าง annotation JSON ใน `annotations/`
3. เพิ่ม entry ใน `manifest.json`
4. รัน `node tools/benchmark.js --dir tools/golden-set/audio/golden/ --validate-schema` เพื่อตรวจว่า schema ผ่าน

---

## การรัน benchmark

```bash
# Smoke test (เร็ว, ใช้ใน CI)
node tools/benchmark.js --dir tools/golden-set/audio/smoke/ --mode fast --validate-schema

# Baseline report — Fast mode
node tools/benchmark.js --dir tools/golden-set/audio/golden/ --mode fast --output reports/baseline-fast.json

# Baseline report — Studio mode
node tools/benchmark.js --dir tools/golden-set/audio/golden/ --mode studio --output reports/baseline-studio.json
```

Report จะถูกบันทึกใน `tools/reports/` — เก็บรายงาน baseline ไว้เพื่อเปรียบเทียบกับ phase ถัดไป

---

## Metrics เป้าหมาย (Phase 0 baseline)

ขั้นนี้วัดค่า baseline ก่อน — ตัวเลขใดๆ ที่ได้จาก run แรกจะกลายเป็น reference สำหรับการเปรียบเทียบ:

- `wallMs` per file (fast/studio mode แยกกัน)
- `peakRssBytes` peak memory
- `chordCount`, `beatCount`
- `schemaVersion` = 1 ✓
- `hasProvenance` = true ✓
- failure rate = 0%

เมื่อมี Phase ถัดไปที่เปลี่ยน model หรือ backend จะรัน benchmark อีกครั้งแล้วเปรียบเทียบกับ report นี้
