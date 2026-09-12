/* ══════════════════════════════════════════════════════════════════════════
   ZIXEL CHORDS — MULTI-INSTRUMENT CHORD & RHYTHM CONTROLLER
   Supports: Guitar (guitar-chords.com 15-fret horizontal design) · Piano · Keyboard · Bass · Ukulele · Drums
   Landing Mode: Clean Minimalist Instrument Selection Stage
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ──────────────────────────────────────────────────────────────────────────
  // GUITAR-CHORDS.COM CONSTANTS & DEFINITIONS
  // ──────────────────────────────────────────────────────────────────────────

  const GC_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const GC_QUALITIES_50 = [
    // Row 1
    'Major', 'Minor', '7', '5', 'dim', 'dim7', 'aug', 'sus2', 'sus4', 'maj7',
    // Row 2
    'm7', '7sus4', 'maj9', 'maj11', 'maj13', 'maj9#11', 'maj13#11', 'add9', '6add9', 'maj7b5',
    // Row 3
    'maj7#5', 'm6', 'm9', 'm11', 'm13', 'madd9', 'm6add9', 'mmaj7', 'mmaj9', 'm7b5',
    // Row 4
    'm7#5', '6', '9', '11', '13', '7b5', '7#5', '7b9', '7#9', '7(b5,b9)',
    // Row 5
    '7(b5,#9)', '7(#5,b9)', '7(#5,#9)', '9b5', '9#5', '13#11', '13b9', '11b9', 'sus2sus4', '-5'
  ];

  const COMMON_QUALITIES = new Set([
    'Major', 'Minor', '7', 'maj7', 'm7', 'sus2', 'sus4', '5', 'add9', 'dim', 'aug', '6', '9'
  ]);

  const GC_ROOT_DB_MAP = {
    'C': 'C', 'Db': 'Csharp', 'D': 'D', 'Eb': 'Eb',
    'E': 'E', 'F': 'F', 'Gb': 'Fsharp', 'G': 'G',
    'Ab': 'Ab', 'A': 'A', 'Bb': 'Bb', 'B': 'B'
  };

  const GC_SUFFIX_MAP = {
    'Major': 'major', 'Minor': 'minor', '7': '7', '5': '5', 'dim': 'dim', 'dim7': 'dim7',
    'aug': 'aug', 'sus2': 'sus2', 'sus4': 'sus4', 'maj7': 'maj7', 'm7': 'm7', '7sus4': '7sus4',
    'maj9': 'maj9', 'maj11': 'maj11', 'maj13': 'maj13', 'maj9#11': '9#11', 'maj13#11': 'maj13',
    'add9': 'add9', '6add9': '69', 'maj7b5': 'maj7b5', 'maj7#5': 'maj7#5', 'm6': 'm6',
    'm9': 'm9', 'm11': 'm11', 'm13': 'm11', 'madd9': 'madd9', 'm6add9': 'm69', 'mmaj7': 'mmaj7',
    'mmaj9': 'mmaj9', 'm7b5': 'm7b5', 'm7#5': 'm7b5', '6': '6', '9': '9', '11': '11',
    '13': '13', '7b5': '7b5', '7#5': 'aug7', '7b9': '7b9', '7#9': '7#9', '7(b5,b9)': '7b9',
    '7(b5,#9)': '7#9', '7(#5,b9)': '7b9', '7(#5,#9)': '7#9', '9b5': '9b5', '9#5': 'aug9',
    '13#11': '13', '13b9': '13', '11b9': '11', 'sus2sus4': 'sus2sus4', '-5': 'dim'
  };

  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const GC_FORMULAS_50 = {
    'Major': { intervals: [0, 4, 7], formula: '1 · 3 · 5', label: 'Root · Major 3rd · 5th', tips: 'เปิดสาย 1, 3 กังวาน ปลายนิ้วตั้งฉากไม่ให้แตะสายข้างเคียง' },
    'Minor': { intervals: [0, 3, 7], formula: '1 · b3 · 5', label: 'Root · Minor 3rd · 5th', tips: 'เสียงหม่นเศร้า นิ้วชี้กดเฟรต 1 สาย 2 ให้สนิท' },
    '7': { intervals: [0, 4, 7, 10], formula: '1 · 3 · 5 · b7', label: 'Dominant 7th (บลูส์/แจ๊ส)', tips: 'คอร์ดยอดนิยมในเพลงบลูส์ นิ้วก้อยช่วยกดสาย 3 เฟรต 3' },
    '5': { intervals: [0, 7], formula: '1 · 5', label: 'Power Chord (ร็อก/เมทัล)', tips: 'พาวเวอร์คอร์ด ดีดเฉพาะสายต่ำ 2-3 เส้น ปิดเสียงสายที่เหลือ' },
    'dim': { intervals: [0, 3, 6], formula: '1 · b3 · b5', label: 'Diminished Triad', tips: 'คอร์ดส่งตึงเครียด ก่อนคลายเข้าคอร์ดถัดไป' },
    'dim7': { intervals: [0, 3, 6, 9], formula: '1 · b3 · b5 · bb7', label: 'Full Diminished 7th', tips: 'รูปทรงสมมาตร สามารถเลื่อนขึ้นลงได้ทุกๆ 3 เฟรต' },
    'aug': { intervals: [0, 4, 8], formula: '1 · 3 · #5', label: 'Augmented Triad', tips: 'เสียงลอยฟุ้ง เลื่อนรูปทรงได้ทุกๆ 4 เฟรต' },
    'sus2': { intervals: [0, 2, 7], formula: '1 · 2 · 5', label: 'Suspended 2nd', tips: 'เสียงกังวานเปิดโล่ง ละเว้นตัวที่ 3' },
    'sus4': { intervals: [0, 5, 7], formula: '1 · 4 · 5', label: 'Suspended 4th', tips: 'ใช้ส่งเข้า Major ในท่อนจบห้องอย่างลงตัว' },
    'maj7': { intervals: [0, 4, 7, 11], formula: '1 · 3 · 5 · 7', label: 'Major 7th (ป๊อป/บอสซ่า)', tips: 'เสียงนุ่มนวลโรแมนติก นิยมเล่นในเพลงแจ๊สและป๊อปหวาน' },
    'm7': { intervals: [0, 3, 7, 10], formula: '1 · b3 · 5 · b7', label: 'Minor 7th (นีโอโซล/อาร์แอนด์บี)', tips: 'จับง่าย เสียงพริ้ว นุ่มลึก ละมุนหู' },
    '7sus4': { intervals: [0, 5, 7, 10], formula: '1 · 4 · 5 · b7', label: 'Dominant 7th Sus 4', tips: 'สร้างความอยากคลายตัวเข้า Dominant 7' },
    'maj9': { intervals: [0, 4, 7, 11, 2], formula: '1 · 3 · 5 · 7 · 9', label: 'Major 9th (ฟิวชั่น/โมเดิร์น)', tips: 'คอร์ดสวยงามหรูหรา เสียงโปร่งกังวาน' },
    'maj11': { intervals: [0, 4, 7, 11, 2, 5], formula: '1 · 3 · 5 · 7 · 9 · 11', label: 'Major 11th', tips: 'มักละเว้นตัวที่ 3 หรือ 5 เพื่อความโปร่งใส' },
    'maj13': { intervals: [0, 4, 7, 11, 2, 9], formula: '1 · 3 · 5 · 7 · 9 · 13', label: 'Major 13th', tips: 'คอร์ดใหญ่ระดับบิ๊กแบนด์ เสียงแพรวพราว' },
    'maj9#11': { intervals: [0, 4, 7, 11, 2, 6], formula: '1 · 3 · 5 · 7 · 9 · #11', label: 'Lydian Major 9 (#11)', tips: 'สเกลไลเดียนสุดล้ำ ให้บรรยากาศแบบภาพยนตร์' },
    'maj13#11': { intervals: [0, 4, 7, 11, 2, 6, 9], formula: '1 · 3 · 5 · 7 · 9 · #11 · 13', label: 'Lydian 13th', tips: 'คอร์ดแจ๊สขั้นสูง นิยมใช้ในเพลงโมเดิร์นแจ๊ส' },
    'add9': { intervals: [0, 4, 7, 2], formula: '1 · 3 · 5 · 9', label: 'Major Add 9 (คอร์ดป๊อปอะคูสติก)', tips: 'ดีดสายเปิดกังวาน เพลงป๊อปอะคูสติกนิยมใช้มาก' },
    '6add9': { intervals: [0, 4, 7, 9, 2], formula: '1 · 3 · 5 · 6 · 9', label: '6/9 Chord (บอสซ่าโนวา)', tips: 'คอร์ดจบอันแสนหวานของเพลงแนว Bossa Nova' },
    'maj7b5': { intervals: [0, 4, 6, 11], formula: '1 · 3 · b5 · 7', label: 'Major 7th Flat 5', tips: 'ความรู้สึกเคว้งคว้างแต่มีความงดงามแปลกใหม่' },
    'maj7#5': { intervals: [0, 4, 8, 11], formula: '1 · 3 · #5 · 7', label: 'Major 7th Sharp 5', tips: 'ลูกผสมระหว่าง Augmented และ Major 7' },
    'm6': { intervals: [0, 3, 7, 9], formula: '1 · b3 · 5 · 6', label: 'Minor 6th (ยิปซีแจ๊ส)', tips: 'คอร์ดสไตล์ Gypsy Jazz อันเป็นเอกลักษณ์' },
    'm9': { intervals: [0, 3, 7, 10, 2], formula: '1 · b3 · 5 · b7 · 9', label: 'Minor 9th (อาร์แอนด์บี/ฟังก์)', tips: 'เสียงโมเดิร์นอบอุ่น เพลง Neo-Soul นิยมใช้เป็นคอร์ดหลัก' },
    'm11': { intervals: [0, 3, 7, 10, 2, 5], formula: '1 · b3 · 5 · b7 · 9 · 11', label: 'Minor 11th (ดอเรียน)', tips: 'โทนเสียงสไตล์ Dorian กีตาร์แจ๊สมักทาบนิ้วชี้' },
    'm13': { intervals: [0, 3, 7, 10, 2, 9], formula: '1 · b3 · 5 · b7 · 9 · 13', label: 'Minor 13th', tips: 'คอร์ดที่มีความซับซ้อนและมีสีสันของดนตรีแจ๊ส' },
    'madd9': { intervals: [0, 3, 7, 2], formula: '1 · b3 · 5 · 9', label: 'Minor Add 9', tips: 'ความเศร้าที่ละเมียดละไม นุ่มลึกกว่าคอร์ดไมเนอร์ธรรมดา' },
    'm6add9': { intervals: [0, 3, 7, 9, 2], formula: '1 · b3 · 5 · 6 · 9', label: 'Minor 6/9', tips: 'โทนลึกลับน่าค้นหา นิยมใช้ในเพลงประกอบภาพยนตร์' },
    'mmaj7': { intervals: [0, 3, 7, 11], formula: '1 · b3 · 5 · 7', label: 'Minor Major 7 (สายลับ 007)', tips: 'คอร์ดธีมสายลับ James Bond เจือความดุดันและลึกลับ' },
    'mmaj9': { intervals: [0, 3, 7, 11, 2], formula: '1 · b3 · 5 · 7 · 9', label: 'Minor Major 9th', tips: 'สีสันแจ๊สขั้นสูง มักใช้เป็นคอร์ดค้าง' },
    'm7b5': { intervals: [0, 3, 6, 10], formula: '1 · b3 · b5 · b7', label: 'Half-Diminished (ฮาล์ฟดิม)', tips: 'คอร์ด 2 ในทางเดินไมเนอร์ ii-V-i ขาดไม่ได้สำหรับนักดนตรีแจ๊ส' },
    'm7#5': { intervals: [0, 3, 8, 10], formula: '1 · b3 · #5 · b7', label: 'Minor 7th Sharp 5', tips: 'คอร์ดอัลเทอร์ดไมเนอร์สร้างความแปลกใหม่' },
    '6': { intervals: [0, 4, 7, 9], formula: '1 · 3 · 5 · 6', label: 'Major 6th (สวิง/คันทรี)', tips: 'คอร์ดย้อนยุคสไตล์ Swing 1940s และ Western Swing' },
    '9': { intervals: [0, 4, 7, 10, 2], formula: '1 · 3 · 5 · b7 · 9', label: 'Dominant 9th (ฟังก์/บลูส์)', tips: 'คอร์ดหากินสายฟังก์ กระแทกคอร์ดจังหวะยกสุดมัน' },
    '11': { intervals: [0, 4, 7, 10, 2, 5], formula: '1 · 3 · 5 · b7 · 9 · 11', label: 'Dominant 11th', tips: 'เสียงโมเดิร์นคล้าย 9sus4' },
    '13': { intervals: [0, 4, 7, 10, 2, 9], formula: '1 · 3 · 5 · b7 · 9 · 13', label: 'Dominant 13th', tips: 'คอร์ดโดมิแนนท์เสียงสมบูรณ์แบบในบิ๊กแบนด์' },
    '7b5': { intervals: [0, 4, 6, 10], formula: '1 · 3 · b5 · b7', label: '7 Flat 5 (คอร์ดอัลเทอร์ด)', tips: 'ส่งเข้าคอร์ดไมเนอร์หรือเมเจอร์ได้อย่างเฉียบขาด' },
    '7#5': { intervals: [0, 4, 8, 10], formula: '1 · 3 · #5 · b7', label: '7 Sharp 5 (Augmented 7th)', tips: 'แรงตึงสูง ดึงดูดเข้าหาคอร์ด 1 อย่างทรงพลัง' },
    '7b9': { intervals: [0, 4, 7, 10, 1], formula: '1 · 3 · 5 · b7 · b9', label: '7 Flat 9 (แจ๊ส/ละติน)', tips: 'คอร์ดส่งยอดนิยมในเพลงคีย์ไมเนอร์' },
    '7#9': { intervals: [0, 4, 7, 10, 3], formula: '1 · 3 · 5 · b7 · #9', label: 'Hendrix Chord (ร็อก/บลูส์)', tips: 'คอร์ดระดับตำนานของ Jimi Hendrix ผสมเสียงหวานและคม' },
    '7(b5,b9)': { intervals: [0, 4, 6, 10, 1], formula: '1 · 3 · b5 · b7 · b9', label: 'Altered 7 (b5, b9)', tips: 'อัลเทอร์ดโดมิแนนท์เต็มรูปแบบสำหรับโซโล่แจ๊ส' },
    '7(b5,#9)': { intervals: [0, 4, 6, 10, 3], formula: '1 · 3 · b5 · b7 · #9', label: 'Altered 7 (b5, #9)', tips: 'คอร์ดตึงเครียดสูง ใช้ในบีบ็อพและฟิวชั่น' },
    '7(#5,b9)': { intervals: [0, 4, 8, 10, 1], formula: '1 · 3 · #5 · b7 · b9', label: 'Altered 7 (#5, b9)', tips: 'ส่งเข้าคอร์ดไมเนอร์ปลายทางอย่างนุ่มนวล' },
    '7(#5,#9)': { intervals: [0, 4, 8, 10, 3], formula: '1 · 3 · #5 · b7 · #9', label: 'Full Altered Dominant', tips: 'รวมขั้นคู่ดัดแปลงทั้งหมด คอร์ดโปรดของคอแจ๊ส' },
    '9b5': { intervals: [0, 4, 6, 10, 2], formula: '1 · 3 · b5 · b7 · 9', label: '9 Flat 5', tips: 'เสียงโปร่งแต่มิติเสียงไม่ซ้ำใคร' },
    '9#5': { intervals: [0, 4, 8, 10, 2], formula: '1 · 3 · #5 · b7 · 9', label: '9 Sharp 5 (Augmented 9)', tips: 'ลูกเล่นคอร์ดส่งขั้นสูง' },
    '13#11': { intervals: [0, 4, 7, 10, 2, 6, 9], formula: '1 · 3 · 5 · b7 · 9 · #11 · 13', label: 'Dominant 13 (#11)', tips: 'คอร์ด Lydian Dominant ให้เสียงล้ำอนาคต' },
    '13b9': { intervals: [0, 4, 7, 10, 1, 9], formula: '1 · 3 · 5 · b7 · b9 · 13', label: 'Dominant 13 (b9)', tips: 'ใช้ในท่อนเทิร์นอะราวด์ของแจ๊สมาตรฐาน' },
    '11b9': { intervals: [0, 4, 7, 10, 1, 5], formula: '1 · 3 · 5 · b7 · b9 · 11', label: 'Dominant 11 (b9)', tips: 'คอร์ดฟิวชั่นโมเดิร์น' },
    'sus2sus4': { intervals: [0, 2, 5, 7], formula: '1 · 2 · 4 · 5', label: 'Sus 2 Sus 4 (คอร์ดเปิดลอย)', tips: 'เสียงคลุมเครือไม่ระบุเพศเมเจอร์หรือไมเนอร์' },
    '-5': { intervals: [0, 4, 6], formula: '1 · 3 · b5', label: 'Flat 5 Triad', tips: 'เมเจอร์ไตรแอดลดเสียงขั้น 5 ลงครึ่งเสียง' }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MULTI-INSTRUMENT (OTHER INSTRUMENTS) DATA
  // ──────────────────────────────────────────────────────────────────────────

  const OTHER_QUALITIES = [
    { id: 'major', label: 'major', display: '' },
    { id: 'maj7', label: 'maj7', display: 'maj7' },
    { id: 'maj9', label: 'maj9', display: 'maj9' },
    { id: '6', label: '6', display: '6' },
    { id: 'add9', label: 'add9', display: 'add9' },
    { id: 'm', label: 'm', display: 'm' },
    { id: 'm7', label: 'm7', display: 'm7' },
    { id: 'm9', label: 'm9', display: 'm9' },
    { id: 'm6', label: 'm6', display: 'm6' },
    { id: 'mM7', label: 'mM7', display: 'mM7' },
    { id: 'm7b5', label: 'm7b5', display: 'm7b5' },
    { id: '7', label: '7', display: '7' },
    { id: '9', label: '9', display: '9' },
    { id: '13', label: '13', display: '13' },
    { id: '7b5', label: '7b5', display: '7b5' },
    { id: '7#5', label: '7#5', display: '7#5' }
  ];

  const OTHER_FORMULAS = {
    'major': { notes: [0, 4, 7], label: 'Root · Major 3rd · Perfect 5th' },
    'maj7': { notes: [0, 4, 7, 11], label: 'Root · Major 3rd · 5th · Major 7th' },
    'maj9': { notes: [0, 4, 7, 11, 2], label: 'Root · Major 3rd · 5th · 7th · 9th' },
    '6': { notes: [0, 4, 7, 9], label: 'Root · Major 3rd · 5th · 6th' },
    'add9': { notes: [0, 4, 7, 2], label: 'Root · Major 3rd · 5th · 9th' },
    'm': { notes: [0, 3, 7], label: 'Root · Minor 3rd · Perfect 5th' },
    'm7': { notes: [0, 3, 7, 10], label: 'Root · Minor 3rd · 5th · Minor 7th' },
    'm9': { notes: [0, 3, 7, 10, 2], label: 'Root · Minor 3rd · 5th · b7th · 9th' },
    'm6': { notes: [0, 3, 7, 9], label: 'Root · Minor 3rd · 5th · 6th' },
    'mM7': { notes: [0, 3, 7, 11], label: 'Root · Minor 3rd · 5th · Major 7th' },
    'm7b5': { notes: [0, 3, 6, 10], label: 'Root · Minor 3rd · Diminished 5th · b7th' },
    '7': { notes: [0, 4, 7, 10], label: 'Root · Major 3rd · 5th · Dominant 7th' },
    '9': { notes: [0, 4, 7, 10, 2], label: 'Root · Major 3rd · 5th · b7th · 9th' },
    '13': { notes: [0, 4, 7, 10, 9], label: 'Root · 3rd · 5th · b7th · 13th' },
    '7b5': { notes: [0, 4, 6, 10], label: 'Root · 3rd · Flat 5th · b7th' },
    '7#5': { notes: [0, 4, 8, 10], label: 'Root · 3rd · Sharp 5th · b7th' }
  };

  // Ukulele Pro Roots & Formulas
  const UKE_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const UKE_FORMULAS = {
    'Major': { formula: '1 · 3 · 5', intervals: [0, 4, 7], label: 'เมเจอร์ (สดใส มั่นคง)' },
    'Minor': { formula: '1 · b3 · 5', intervals: [0, 3, 7], label: 'ไมเนอร์ (เศร้า อ่อนหวาน)' },
    '7':     { formula: '1 · 3 · 5 · b7', intervals: [0, 4, 7, 10], label: 'โดมิแนนท์ 7 (บลูส์ ป๊อป)' },
    'maj7':  { formula: '1 · 3 · 5 · 7', intervals: [0, 4, 7, 11], label: 'เมเจอร์ 7 (แจ๊ส ฟังสบาย)' },
    'm7':    { formula: '1 · b3 · 5 · b7', intervals: [0, 3, 7, 10], label: 'ไมเนอร์ 7 (ละมุน นุ่มลึก)' },
    'sus4':  { formula: '1 · 4 · 5', intervals: [0, 5, 7], label: 'ซัสโฟร์ (ลอย รอคลี่คลาย)' },
    'sus2':  { formula: '1 · 2 · 5', intervals: [0, 2, 7], label: 'ซัสทู (โปร่ง กว้าง)' },
    '6':     { formula: '1 · 3 · 5 · 6', intervals: [0, 4, 7, 9], label: 'ซิกซ์ (ฮาวายเอี้ยน สวิง)' },
    'm6':    { formula: '1 · b3 · 5 · 6', intervals: [0, 3, 7, 9], label: 'ไมเนอร์ 6 (ลึกลับ นัว)' },
    'dim':   { formula: '1 · b3 · b5', intervals: [0, 3, 6], label: 'ดิมินิช (ตึงเครียด)' },
    'dim7':  { formula: '1 · b3 · b5 · bb7', intervals: [0, 3, 6, 9], label: 'ดิมินิช 7 (เชื่อมคอร์ด)' },
    'aug':   { formula: '1 · 3 · #5', intervals: [0, 4, 8], label: 'อ็อกเมนเต็ด (ลอย เหนือจริง)' },
    '9':     { formula: '1 · 3 · 5 · b7 · 9', intervals: [0, 4, 7, 10, 14], label: 'ไนน์ (ฟังค์ แจ๊ส)' },
    'add9':  { formula: '1 · 3 · 5 · 9', intervals: [0, 4, 7, 14], label: 'แอดไนน์ (ใส ป๊อปสมัยใหม่)' }
  };

  // Drum Grooves Library
  const DRUM_GROOVES = {
    'rock': {
      title: 'Rock 4/4 Standard',
      bpm: 120,
      desc: 'Hi-Hat 8-Beat · Snare จังหวะ 2, 4 · Kick จังหวะ 1, 3',
      variations: [
        { name: 'Basic Rock Beat', desc: 'แพทเทิร์นร็อกมาตรฐาน 4/4', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] } },
        { name: 'Driving Kick', desc: 'เพิ่มกระเดื่องจังหวะ 3 และ 3+', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0] } },
        { name: 'Open Hi-Hat Offbeats', desc: 'เปิดแฉ Hi-Hat บนจังหวะยก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'Rock Fill-in Break', desc: 'ลูกส่งสแนร์รัวท้ายห้องก่อนเปลี่ยนท่อน', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 1,1,1,1, 1,1,1,1], kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,0,0] } }
      ]
    },
    'pop': {
      title: 'Pop Ballad 8-Beat',
      bpm: 86,
      desc: 'สแนร์นุ่มนวล · กรูฟ 8 บีทฟังสบาย เหมาะกับเพลงป๊อปและบัลลาด',
      variations: [
        { name: 'Standard Ballad', desc: 'จังหวะป๊อปมาตรฐานฟังสบาย', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0] } },
        { name: 'Syncopated Pop', desc: 'กระเดื่องซิงโคเพตเพิ่มไดนามิก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,1,0] } },
        { name: 'Ride Cymbal Groove', desc: 'เปลี่ยนไฮแฮทเป็นแฉไลด์เปิดมิติ', grid: { crash: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'Soft Build-up Fill', desc: 'ลูกส่งเบาๆ เข้าท่อนพรีฮุก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,1,1, 1,1,1,1], kick:  [1,0,0,0, 0,0,1,0, 1,0,1,0, 1,0,0,0] } }
      ]
    },
    'funk': {
      title: 'Funk 16th Note Groove',
      bpm: 104,
      desc: 'ไฮแฮท 16th เคลื่อนไหวตลอด · สแนร์โกสต์โน้ตหยอดจังหวะยก',
      variations: [
        { name: 'Standard 16th Funk', desc: 'ไฮแฮทรัว 16 โน้ต พร้อมสแนร์แบ็คบีตแน่น', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,1,0,0] } },
        { name: 'Ghost Note Funk', desc: 'เพิ่มโกสต์โน้ตบนสแนร์ให้กรูฟหนึบ', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [0,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,1,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'James Brown Groove', desc: 'The One! เน้นย้ำจังหวะแรกให้หนักแน่น', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0] } },
        { name: 'Funk Break', desc: 'ลูกส่งสแนร์ซิงโคเพตรองรับเบสสแล็ป', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 1,0,1,1, 0,1,1,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 1,0,0,0] } }
      ]
    },
    'bossa': {
      title: 'Bossa Nova Latin',
      bpm: 130,
      desc: 'ครอสสติ๊กเคาะขอบสแนร์ · กรูฟละตินสองจังหวะ นุ่มนวลพริ้วไหว',
      variations: [
        { name: 'Standard Bossa', desc: 'เคาะขอบสแนร์ Cross-Stick 3:2', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'Samba Bossa', desc: 'เพิ่มความพริ้วไหวของไฮแฮทสไตล์แซมบ้า', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'Smooth Jazz Latin', desc: 'เสียงเคาะขอบกลองนุ่มกับเสียงฉาบไลด์', grid: { crash: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], snare: [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0] } },
        { name: 'Latin Turnaround', desc: 'ลูกเคาะส่งเปลี่ยนคอร์ดท้ายท่อน', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 0,0,0,0, 0,0,0,0], snare: [1,0,0,1, 0,0,1,0, 1,1,0,1, 0,1,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 1,0,0,0] } }
      ]
    },
    'shuffle': {
      title: 'Blues / Half-Time Shuffle',
      bpm: 95,
      desc: 'จังหวะสะบัดชัฟเฟิลบลูส์ สวิงทริปเพลต โน้ตขากระตุก',
      variations: [
        { name: 'Standard Blues Shuffle', desc: 'สวิงไฮแฮท สแนร์แบ็คบีตแน่น', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0] } },
        { name: 'Purdie Half-Time Shuffle', desc: 'สแนร์ผี Ghost note อันเป็นเอกลักษณ์ระดับโลก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,1,0, 0,0,1,0, 1,0,0,0, 0,0,1,0], kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0] } },
        { name: 'Driving Blues Rock', desc: 'กระเดื่องและแฉจัดเต็มสำหรับเพลงบลูส์ร็อก', grid: { crash: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0] } },
        { name: 'Shuffle Fill-in', desc: 'ลูกส่งสามพยางค์เข้าท่อนโซโล่', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,0,0, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,1,0, 1,0,1,0, 1,1,1,0], kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0] } }
      ]
    },
    'disco': {
      title: 'Four-on-the-Floor Disco',
      bpm: 124,
      desc: 'กระเดื่อง 4 จังหวะเต็ม · Hi-Hat ยกเปิด-ปิด สไตล์ดิสโก้/แดนซ์',
      variations: [
        { name: 'Classic Disco Beat', desc: 'Kick เหยียบทุกจังหวะ ไฮแฮทเปิดยก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] } },
        { name: 'Euro Dance Groove', desc: 'ไฮแฮทถี่ 16th สไตล์แดนซ์คลับ', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] } },
        { name: 'Clap & Snare Combo', desc: 'เสียงแคลปผสมสแนร์เพิ่มความสนุก', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] } },
        { name: 'Club Break Fill', desc: 'ลูกส่งหยุดจังหวะก่อนดรอปบีท', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 1,1,1,1, 0,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,0,0] } }
      ]
    },
    'slowrock': {
      title: 'Slow Rock 6/8',
      bpm: 66,
      desc: 'จังหวะ 6/8 สามพยางค์สุดคลาสสิก อารมณ์เพลงร็อกบัลลาดช้าซึ้ง',
      variations: [
        { name: 'Classic 6/8 Ballad', desc: 'ไฮแฮทเคาะ 6 พยางค์ สแนร์จังหวะ 4', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 0,0,0,0], snare: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0], kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0] } },
        { name: 'Heavy 6/8 Rock', desc: 'เพิ่มความหนักแน่นของกระเดื่อง', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 0,0,0,0], snare: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0] } },
        { name: 'Ride Cymbal 6/8', desc: 'แฉไลด์เปิดกว้างสำหรับท่อนโซโล่', grid: { crash: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0], hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0], kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0] } },
        { name: '6/8 Rolling Fill', desc: 'ลูกส่งทอมสามพยางค์ม้วนเข้าท่อนฮุก', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 0,0,1,0, 1,0,1,0, 1,1,1,0], kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0] } }
      ]
    },
    'reggae': {
      title: 'Reggae One-Drop',
      bpm: 78,
      desc: 'วันดรอป ทิ้งจังหวะ 3 ด้วยกระเดื่อง+สแนร์คู่กัน ไฮแฮทกระตุกยก',
      variations: [
        { name: 'Classic One-Drop', desc: 'ทิ้งจังหวะ 1 กระเดื่อง+สแนร์ตกที่จังหวะ 3', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], kick:  [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] } },
        { name: 'Steppers Reggae', desc: 'กระเดื่องเหยียบ 4 จังหวะ ไฮแฮทยก', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] } },
        { name: 'Rockers Reggae', desc: 'สแนร์จังหวะ 2 และ 4 ร่วมกับกระเดื่องวันดรอป', grid: { crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0] } },
        { name: 'Dub Delay Fill', desc: 'ลูกส่งริมช็อตดับเรกเก้', grid: { crash: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], hihat: [0,1,0,1, 0,1,0,1, 0,0,0,0, 0,0,0,0], snare: [0,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,0,0], kick:  [0,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0] } }
      ]
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VR PIANO (vrpiano.co.jp) CONSTANTS & CHORD DEFINITIONS
  // ──────────────────────────────────────────────────────────────────────────

  const VRP_LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const VRP_NAT = [0, 2, 4, 5, 7, 9, 11];
  const VRP_ACC = { 0: '', 1: '♯', '-1': '♭', 2: '♯♯', '-2': '♭♭' };

  const VRP_ROOTS = [
    { n: 'C',  pc: 0,  li: 0 }, { n: 'C♯', pc: 1,  li: 0 }, { n: 'D',  pc: 2,  li: 1 },
    { n: 'E♭', pc: 3,  li: 2 }, { n: 'E',  pc: 4,  li: 2 }, { n: 'F',  pc: 5,  li: 3 },
    { n: 'F♯', pc: 6,  li: 3 }, { n: 'G',  pc: 7,  li: 4 }, { n: 'A♭', pc: 8,  li: 5 },
    { n: 'A',  pc: 9,  li: 5 }, { n: 'B♭', pc: 10, li: 6 }, { n: 'B',  pc: 11, li: 6 }
  ];

  const VRP_TYPES = [
    { id: '',     lab: 'เมเจอร์', th: 'เมเจอร์',              iv: [0, 4, 7],     st: [0, 2, 4] },
    { id: 'm',    lab: 'm',       th: 'ไมเนอร์',              iv: [0, 3, 7],     st: [0, 2, 4] },
    { id: '7',    lab: '7',       th: 'เซเวนธ์',              iv: [0, 4, 7, 10], st: [0, 2, 4, 6] },
    { id: 'm7',   lab: 'm7',      th: 'ไมเนอร์เซเวนธ์',       iv: [0, 3, 7, 10], st: [0, 2, 4, 6] },
    { id: 'M7',   lab: 'M7',      th: 'เมเจอร์เซเวนธ์',       iv: [0, 4, 7, 11], st: [0, 2, 4, 6] },
    { id: 'mM7',  lab: 'mM7',     th: 'ไมเนอร์เมเจอร์เซเวนธ์', iv: [0, 3, 7, 11], st: [0, 2, 4, 6] },
    { id: '6',    lab: '6',       th: 'ซิกซ์',                iv: [0, 4, 7, 9],  st: [0, 2, 4, 5] },
    { id: 'm6',   lab: 'm6',      th: 'ไมเนอร์ซิกซ์',         iv: [0, 3, 7, 9],  st: [0, 2, 4, 5] },
    { id: 'dim',  lab: 'dim',     th: 'ดิมินิชท์',            iv: [0, 3, 6],     st: [0, 2, 4] },
    { id: 'dim7', lab: 'dim7',    th: 'ดิมินิชท์เซเวนธ์',     iv: [0, 3, 6, 9],  st: [0, 2, 4, 6] },
    { id: 'm7b5', lab: 'm7♭5',    th: 'ไมเนอร์เซเวนธ์แฟลต5', iv: [0, 3, 6, 10], st: [0, 2, 4, 6] },
    { id: 'aug',  lab: 'aug',     th: 'ออกเมนเต็ด',           iv: [0, 4, 8],     st: [0, 2, 4] },
    { id: 'sus4', lab: 'sus4',    th: 'ซัสโฟร์',              iv: [0, 5, 7],     st: [0, 3, 4] },
    { id: 'sus2', lab: 'sus2',    th: 'ซัสทู',                iv: [0, 2, 7],     st: [0, 1, 4] },
    { id: 'add9', lab: 'add9',    th: 'แอดไนน์',              iv: [0, 2, 4, 7],  st: [0, 1, 2, 4] }
  ];

  const VRP_KANA = ['โด', 'โด♯', 'เร', 'มี♭', 'มี', 'ฟา', 'ฟา♯', 'ซอล', 'ลา♭', 'ลา', 'ที♭', 'ที'];
  const VRP_INVNAME = ['ราก', 'กลับที่ 1', 'กลับที่ 2', 'กลับที่ 3'];
  const VRP_KB_LO = 48; // C3
  const VRP_KB_HI = 72; // C5
  const VRP_DIA = { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 };
  const VRP_BLACK_AFTER = { 0: 1, 2: 1, 5: 1, 7: 1, 9: 1 };

  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  let chordsDatabase = null;
  let selectedInstrument = 'guitar';

  // Guitar-Chords.com State
  let gcRoot = 'C';
  let gcQuality = 'Major';
  let gcPosIndex = 0;
  let gcCurrentPositions = [];
  let gcCommonOnly = false;
  let gcSettings = {
    hand: 'right',          // 'right' | 'left'
    labels: 'fingers',      // 'fingers' | 'notes'
    strum: 'normal',        // 'normal' | 'fast' | 'arpeggio'
    stringOrder: 'ebgdae'   // 'ebgdae' | 'eadgbe'
  };

  // Load saved settings if present
  try {
    const saved = localStorage.getItem('zc_gc_settings');
    if (saved) {
      gcSettings = Object.assign(gcSettings, JSON.parse(saved));
    }
  } catch (_) {}

  // VR Piano (vrpiano.co.jp) State
  let vrpMode = 'find'; // 'find' | 'id'
  let vrpRi = 0; // Root index (0 = C)
  let vrpTi = 0; // Type index (0 = Major)
  let vrpInv = 0; // Inversion index
  let vrpSelMidis = []; // Keys selected in ID mode
  let vrpVolume = 0.8;
  let vrpTimbre = 'acoustic'; // 'acoustic' | 'electric'
  let vrpDirFilter = 'ALL';
  let vrpKeyElements = {};

  // Ukulele Pro State
  let ukeDatabase = null;
  let ukeRoot = 'C';
  let ukeQuality = 'Major';
  let ukePosIndex = 0;
  let ukeCurrentPositions = [];
  let ukeVolume = 0.8;
  let ukeStrumStyle = 'normal'; // 'normal' | 'fast' | 'arpeggio'
  let ukeDirFilter = 'ALL';

  // Other Instruments State
  let otherRoot = 'C';
  let otherQuality = 'major';
  let otherGroove = 'rock';
  let otherPatternIndex = 0;
  let otherCurrentPositions = [];

  // Audio Engine State
  let audioCtx = null;
  let drumIsPlaying = false;
  let drumIntervalId = null;
  let drumCurrentStep = 0;
  let drumBpm = 120;

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUDIO SYNTHESIS
  // ──────────────────────────────────────────────────────────────────────────

  function playGuitarSound(pos, strumStyle = 'normal') {
    const ctx = getAudioCtx();
    if (!ctx || !pos || !pos.frets) return;

    const stringOpenMidis = [64, 59, 55, 50, 45, 40]; // High E (0), B (1), G (2), D (3), A (4), Low E (5)
    let delay = 0;
    const delayStep = strumStyle === 'fast' ? 0.016 : (strumStyle === 'arpeggio' ? 0.12 : 0.034);

    // Strum from low string (5) up to high string (0)
    for (let s = 5; s >= 0; s--) {
      const fret = pos.frets[s];
      if (fret === -1 || fret === null || fret === undefined) continue;
      const midi = stringOpenMidis[s] + fret;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + delay;
      delay += delayStep;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 5.5, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 1.2);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.1);
      osc2.stop(now + 2.1);
    }
  }

  function playSingleGuitarNote(stringIdx, fret) {
    const ctx = getAudioCtx();
    if (!ctx || fret === -1 || fret === null || fret === undefined) return;
    const stringOpenMidis = [64, 59, 55, 50, 45, 40]; // High E (0) to Low E (5)
    const midi = stringOpenMidis[stringIdx] + fret;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 1.2);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.9);
    osc2.stop(now + 1.9);
  }

  function playPianoSound(midis) {
    const ctx = getAudioCtx();
    if (!ctx || !midis || midis.length === 0) return;

    midis.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + (idx * 0.015);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 6, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 2.2);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.5);
      osc2.stop(now + 2.5);
    });
  }

  function playKeyboardSound(midis) {
    const ctx = getAudioCtx();
    if (!ctx || !midis || midis.length === 0) return;

    midis.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + (idx * 0.02);

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.8, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 1.8);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.3);
    });
  }

  function playBassSound(midis) {
    const ctx = getAudioCtx();
    if (!ctx || !midis || midis.length === 0) return;

    let delay = 0;
    midis.forEach((midi) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + delay;
      delay += 0.18;

      const subOsc = ctx.createOscillator();
      const plkOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq, now);
      plkOsc.type = 'triangle';
      plkOsc.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.5, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.8);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      subOsc.connect(filter);
      plkOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      subOsc.start(now);
      plkOsc.start(now);
      subOsc.stop(now + 1.5);
      plkOsc.stop(now + 1.5);
    });
  }

  function playUkuleleSound(pos, style = ukeStrumStyle, volume = ukeVolume) {
    const ctx = getAudioCtx();
    if (!ctx || !pos) return;

    // Ukulele standard re-entrant tuning open string MIDIs:
    // String 4 (G4): 67 · String 3 (C4): 60 · String 2 (E4): 64 · String 1 (A4): 69
    const openMidis = [67, 60, 64, 69];
    let delay = 0;
    const delayStep = style === 'fast' ? 0.014 : (style === 'arpeggio' ? 0.09 : 0.028);

    // Strum string 4 (G4) down to string 1 (A4)
    for (let s = 0; s < 4; s++) {
      let fret = pos.frets ? pos.frets[s] : (pos.midis ? pos.midis[s] - openMidis[s] : 0);
      if (fret === -1 || fret === null || fret === undefined) continue;
      const midi = openMidis[s] + fret;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + delay;
      delay += delayStep;

      // Authentic Hawaiian nylon-string acoustic timbre
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 5.2, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.8);

      const peakGain = 0.28 * volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.7);
      osc2.stop(now + 1.7);
    }
  }

  function playSingleUkuleleNote(stringIdx, fret) {
    const ctx = getAudioCtx();
    if (!ctx || fret === -1 || fret === null || fret === undefined) return;
    const openMidis = [67, 60, 64, 69];
    const midi = openMidis[stringIdx] + fret;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.9);

    gain.gain.setValueAtTime(0.32 * ukeVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);
  }

  function playSingleDrumHit(type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.11);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'snare') {
      const bufferSize = ctx.sampleRate * 0.16;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'hihat') {
      const bufferSize = ctx.sampleRate * 0.045;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'crash') {
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5200;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  }

  function toggleDrumSequencer(grid) {
    if (drumIsPlaying) {
      stopDrumSequencer();
      return;
    }
    startDrumSequencer(grid);
  }

  function startDrumSequencer(grid) {
    stopDrumSequencer();
    drumIsPlaying = true;
    drumCurrentStep = 0;

    const playBtn = $('#chordPlaySoundBtn');
    if (playBtn) {
      $('#chordPlaySoundIcon').textContent = '■';
      $('#chordPlaySoundLabel').textContent = 'หยุดเล่น';
    }

    const stepMs = (60 / drumBpm / 4) * 1000;
    drumIntervalId = setInterval(() => {
      const step = drumCurrentStep % 16;
      if (grid.crash && grid.crash[step]) playSingleDrumHit('crash');
      if (grid.hihat && grid.hihat[step]) playSingleDrumHit('hihat');
      if (grid.snare && grid.snare[step]) playSingleDrumHit('snare');
      if (grid.kick  && grid.kick[step])  playSingleDrumHit('kick');

      $$('.drum-step-cell').forEach((cell) => {
        const cStep = parseInt(cell.dataset.step, 10);
        cell.classList.toggle('playing', cStep === step);
      });

      drumCurrentStep++;
    }, stepMs);
  }

  function stopDrumSequencer() {
    drumIsPlaying = false;
    if (drumIntervalId) {
      clearInterval(drumIntervalId);
      drumIntervalId = null;
    }
    const playBtn = $('#chordPlaySoundBtn');
    if (playBtn) {
      $('#chordPlaySoundIcon').textContent = '▶';
      $('#chordPlaySoundLabel').textContent = 'เล่นจังหวะ';
    }
    $$('.drum-step-cell').forEach((cell) => cell.classList.remove('playing'));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GUITAR-CHORDS.COM POSITIONS & SVG RENDERER
  // ──────────────────────────────────────────────────────────────────────────

  function getGuitarChordsComPositions(root, quality) {
    if (!chordsDatabase) return [];
    const chordsForKey = chordsDatabase[root] || {};
    let positions = chordsForKey[quality];

    if (!positions || positions.length === 0) {
      positions = chordsForKey['Major'] || Object.values(chordsForKey)[0] || [];
    }
    return positions || [];
  }

  function renderGuitarHorizontalFretboardSVG(pos, chordName, settings = {}) {
    if (!pos || !pos.frets) return '';
    const isLeftHanded = settings.hand === 'left';
    const showNotes = settings.labels === 'notes';
    const isEadgbe = settings.stringOrder === 'eadgbe';

    const width = 1040;
    const height = 236;
    const numFrets = 15;
    const fretWidth = 60;
    const startX = 85;

    // String Y coordinates for the 6 visual rows from top (row 0) to bottom (row 5)
    const stringY = [44, 74, 104, 134, 164, 194];

    // String base definitions (index 0 = High E, 1 = B, 2 = G, 3 = D, 4 = A, 5 = Low E)
    const stringBaseLabels = ['E', 'B', 'G', 'D', 'A', 'E'];
    const stringBaseColors = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#d4af37', '#ca8a04', '#b45309'];
    const stringBaseThickness = [1.3, 1.8, 2.3, 2.9, 3.6, 4.4];
    const stringOpenPcs = [4, 11, 7, 2, 9, 4]; // E4, B3, G3, D3, A2, E2

    // Helper functions to map between physical string index (0..5) and visual row (0..5)
    // In EBGDAE: High E (0) is at top row 0, Low E (5) is at bottom row 5.
    // In EADGBE: Low E (5) is at top row 0, High E (0) is at bottom row 5.
    const getRowForString = (s) => (isEadgbe ? (5 - s) : s);
    const getStringForRow = (r) => (isEadgbe ? (5 - r) : r);

    // Helper to calculate X for a given fret (accounts for left-handed)
    const getFretCenterX = (fret) => {
      if (isLeftHanded) {
        return (width - startX) - (fret - 0.5) * fretWidth;
      }
      return startX + (fret - 0.5) * fretWidth;
    };

    const getFretWireX = (fret) => {
      if (isLeftHanded) {
        return (width - startX) - fret * fretWidth;
      }
      return startX + fret * fretWidth;
    };

    const nutX = isLeftHanded ? (width - startX) : startX;
    const fretZeroX = isLeftHanded ? (width - 45) : 55;
    const labelX = isLeftHanded ? (width - 20) : 28;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:1040px;height:auto;display:block;user-select:none;">`;

    // SVG Defs: Gradients and Glows matching Zixel Chords Cuberto Luxury System
    svg += `<defs>
      <radialGradient id="gcVoltBadge" cx="35%" cy="32%" r="68%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="30%" stop-color="#f2ff66"/>
        <stop offset="75%" stop-color="#d4ff00"/>
        <stop offset="100%" stop-color="#84cc16"/>
      </radialGradient>
      <linearGradient id="gcVoltBarreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#f2ff66"/>
        <stop offset="70%" stop-color="#d4ff00"/>
        <stop offset="100%" stop-color="#84cc16"/>
      </linearGradient>
      <filter id="gcVoltGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#d4ff00" flood-opacity="0.6"/>
      </filter>
      <filter id="gcRoseGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#f43f5e" flood-opacity="0.75"/>
      </filter>
      <linearGradient id="gcNeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#141722"/>
        <stop offset="50%" stop-color="#0c0e15"/>
        <stop offset="100%" stop-color="#141722"/>
      </linearGradient>
      <linearGradient id="gcFretWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="45%" stop-color="#94a3b8"/>
        <stop offset="70%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <linearGradient id="gcNutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d6cfbe"/>
        <stop offset="50%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#b8ad96"/>
      </linearGradient>
      <radialGradient id="gcInlayGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
        <stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#475569" stop-opacity="0.08"/>
      </radialGradient>
    </defs>`;

    // 1. Fret Numbers on top
    svg += `<text x="${fretZeroX}" y="22" text-anchor="middle" fill="#64748b" font-size="12" font-weight="600" font-family="'DM Mono', monospace">0</text>`;
    for (let f = 1; f <= numFrets; f++) {
      const cx = getFretCenterX(f);
      const isInlay = [3, 5, 7, 9, 12, 15].includes(f);
      const color = isInlay ? '#cbd5e1' : '#64748b';
      const weight = isInlay ? '700' : '500';
      svg += `<text x="${cx}" y="22" text-anchor="middle" fill="${color}" font-size="12" font-weight="${weight}" font-family="'DM Mono', monospace">${f}</text>`;
    }

    // 2. Fretboard surface (frets 1 to 15)
    const fbX = isLeftHanded ? (width - startX - numFrets * fretWidth) : startX;
    svg += `<rect x="${fbX}" y="32" width="${numFrets * fretWidth}" height="174" fill="url(#gcNeckGrad)" stroke="rgba(212, 175, 55, 0.28)" stroke-width="1.5" rx="3"/>`;

    // 3. Fret Inlays (single dots at 3, 5, 7, 9, 15, double at 12)
    const inlays = [3, 5, 7, 9, 12, 15];
    inlays.forEach((f) => {
      const cx = getFretCenterX(f);
      if (f === 12) {
        svg += `<circle cx="${cx}" cy="82" r="5.5" fill="url(#gcInlayGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
        svg += `<circle cx="${cx}" cy="156" r="5.5" fill="url(#gcInlayGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
      } else {
        svg += `<circle cx="${cx}" cy="119" r="6" fill="url(#gcInlayGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
      }
    });

    // 4. Fret Wires
    for (let f = 1; f <= numFrets; f++) {
      const x = getFretWireX(f);
      svg += `<line x1="${x}" y1="32" x2="${x}" y2="206" stroke="url(#gcFretWireGrad)" stroke-width="2.4"/>`;
    }

    // 5. Nut (thick ivory bone bar)
    const nutDrawX = isLeftHanded ? (nutX - 1) : (nutX - 6);
    svg += `<rect x="${nutDrawX}" y="30" width="7" height="178" fill="url(#gcNutGrad)" stroke="#64748b" stroke-width="0.8" rx="2" filter="drop-shadow(0 0 4px rgba(255,255,255,0.2))"/>`;

    // 6. Strings & String Labels (Row by row from top to bottom)
    for (let r = 0; r < 6; r++) {
      const s = getStringForRow(r);
      const y = stringY[r];
      svg += `<text x="${labelX}" y="${y + 5}" text-anchor="middle" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'DM Mono', monospace">${stringBaseLabels[s]}</text>`;
      const lineX1 = isLeftHanded ? (width - startX - numFrets * fretWidth) : 48;
      const lineX2 = isLeftHanded ? (width - 48) : (startX + numFrets * fretWidth);

      // String drop shadow
      svg += `<line x1="${lineX1}" y1="${y + 1.2}" x2="${lineX2}" y2="${y + 1.2}" stroke="#000000" stroke-width="${stringBaseThickness[s]}" stroke-opacity="0.5"/>`;
      // String metallic core
      svg += `<line x1="${lineX1}" y1="${y}" x2="${lineX2}" y2="${y}" stroke="${stringBaseColors[s]}" stroke-width="${stringBaseThickness[s]}" stroke-opacity="0.95"/>`;
    }

    // 7. Barre Pill Rendering (Long rounded pill spanning across barred strings)
    const hasBarre = pos.barre && typeof pos.barre.startStr === 'number' && typeof pos.barre.endStr === 'number' && pos.barre.fret > 0;
    if (hasBarre) {
      const b = pos.barre;
      const cx = getFretCenterX(b.fret);
      const row1 = getRowForString(b.startStr);
      const row2 = getRowForString(b.endStr);
      const topRow = Math.min(row1, row2);
      const bottomRow = Math.max(row1, row2);
      const topY = stringY[topRow];
      const bottomY = stringY[bottomRow];
      const pillW = 26;
      const pillH = (bottomY - topY) + 26;
      const pillX = cx - 13;
      const pillY = topY - 13;

      // Long rounded barre pill
      svg += `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="13" ry="13" fill="url(#gcVoltBarreGrad)" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.85" filter="url(#gcVoltGlow)" pointer-events="none"/>`;

      // Labels on strings that sound the barre fret
      for (let s = b.startStr; s <= b.endStr; s++) {
        if (pos.frets[s] === b.fret) {
          const row = getRowForString(s);
          const y = stringY[row];
          let labelText = '';
          if (showNotes) {
            const notePc = (stringOpenPcs[s] + b.fret) % 12;
            labelText = NOTE_NAMES[notePc];
          } else {
            labelText = b.finger > 0 ? String(b.finger) : '1';
          }
          const fontSize = labelText.length > 1 ? '11.5' : '13.5';
          svg += `<text x="${cx}" y="${y + 4.5}" text-anchor="middle" fill="#08080a" font-size="${fontSize}" font-weight="900" font-family="'Space Grotesk', 'DM Mono', monospace" pointer-events="none">${labelText}</text>`;

          // Interactive click target over barre string
          svg += `<circle cx="${cx}" cy="${y}" r="13" fill="transparent" style="cursor:pointer;" data-string="${s}" data-fret="${b.fret}"/>`;
        }
      }
    }

    // 8. Other Markers on Strings (Open, Muted, and higher frets)
    for (let s = 0; s < 6; s++) {
      const f = pos.frets[s];
      const finger = (pos.fingers && pos.fingers[s]) ? pos.fingers[s] : 0;
      const row = getRowForString(s);
      const y = stringY[row];

      if (f === -1) {
        // Muted string (Glowing Neon Rose Cross at fret 0)
        svg += `<text x="${fretZeroX}" y="${y + 5.5}" text-anchor="middle" fill="#f43f5e" font-size="20" font-weight="900" font-family="system-ui, sans-serif" filter="url(#gcRoseGlow)" style="cursor:pointer;" data-string="${s}" data-fret="-1">✕</text>`;
      } else if (f === 0) {
        // Open string (Glowing Volt Green Ring at fret 0)
        svg += `<circle cx="${fretZeroX}" cy="${y}" r="9" fill="rgba(212, 255, 0, 0.14)" stroke="#d4ff00" stroke-width="2.2" filter="url(#gcVoltGlow)" style="cursor:pointer;" data-string="${s}" data-fret="0"/>`;
        svg += `<circle cx="${fretZeroX}" cy="${y}" r="3" fill="#d4ff00" pointer-events="none"/>`;
      } else if (f > 0 && f <= numFrets) {
        // Only draw individual badge if NOT already rendered as part of the barre at that fret
        const isCoveredByBarre = hasBarre && s >= pos.barre.startStr && s <= pos.barre.endStr && f === pos.barre.fret;
        if (!isCoveredByBarre) {
          // Fretted note (Signature Volt Radial Badge with Volt Glow)
          const cx = getFretCenterX(f);
          svg += `<circle cx="${cx}" cy="${y}" r="13" fill="url(#gcVoltBadge)" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.65" filter="url(#gcVoltGlow)" style="cursor:pointer;" data-string="${s}" data-fret="${f}"/>`;

          let labelText = '';
          if (showNotes) {
            const notePc = (stringOpenPcs[s] + f) % 12;
            labelText = NOTE_NAMES[notePc];
          } else {
            labelText = finger > 0 ? String(finger) : '';
          }

          const fontSize = labelText.length > 1 ? '11.5' : '13.5';
          svg += `<text x="${cx}" y="${y + 4.5}" text-anchor="middle" fill="#08080a" font-size="${fontSize}" font-weight="900" font-family="'Space Grotesk', 'DM Mono', monospace" pointer-events="none">${labelText}</text>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GUITAR-CHORDS.COM VIEW CONTROLLER
  // ──────────────────────────────────────────────────────────────────────────

  function renderGuitarView() {
    gcCurrentPositions = getGuitarChordsComPositions(gcRoot, gcQuality);
    if (gcPosIndex >= gcCurrentPositions.length) gcPosIndex = 0;
    const activePos = gcCurrentPositions[gcPosIndex] || gcCurrentPositions[0];

    // 1. Update Title & Badges
    const titleEl = $('#gcChordTitle');
    if (titleEl) {
      titleEl.innerHTML = `<span class="gc-chord-title-prefix">คอร์ด</span> <span class="gc-chord-title-val">${gcRoot} ${gcQuality}</span>`;
    }

    const formulaInfo = GC_FORMULAS_50[gcQuality] || { intervals: [0, 4, 7], formula: '1 · 3 · 5', label: '', tips: '' };
    const rootIdx = NOTE_NAMES.indexOf(gcRoot);
    const chordNotesStr = formulaInfo.intervals.map((st) => NOTE_NAMES[(rootIdx + st) % 12]).join(' · ');

    const formulaTextEl = $('#gcFormulaText');
    if (formulaTextEl) {
      formulaTextEl.innerHTML = `<span style="color:var(--text-muted,#94a3b8);font-size:0.8rem;letter-spacing:0.04em;">โน้ต:</span> <strong style="color:var(--cb-volt,#d4ff00);font-weight:700;">${chordNotesStr}</strong> &nbsp;·&nbsp; <span style="color:var(--text-muted,#94a3b8);font-size:0.8rem;letter-spacing:0.04em;">สูตร:</span> <strong style="color:#ffffff;font-weight:600;">${formulaInfo.formula}</strong>${formulaInfo.label ? ` <span style="color:var(--text-muted,#64748b);font-size:0.75rem;">(${formulaInfo.label})</span>` : ''}`;
    }

    // 2. Render 15-Fret Horizontal SVG
    const fretboardWrap = $('#gcFretboardWrap');
    if (fretboardWrap && activePos) {
      fretboardWrap.innerHTML = renderGuitarHorizontalFretboardSVG(activePos, `${gcRoot} ${gcQuality}`, gcSettings);

      // Bind string note click
      fretboardWrap.querySelectorAll('[data-string]').forEach((el) => {
        el.addEventListener('click', () => {
          const strIdx = parseInt(el.dataset.string, 10);
          const fret = parseInt(el.dataset.fret, 10);
          if (fret >= 0) playSingleGuitarNote(strIdx, fret);
        });
      });
    }

    // 3. Render Position Buttons (1 to 5)
    const posBar = $('#gcPosBar');
    if (posBar) {
      const posCount = Math.max(gcCurrentPositions.length, 1);
      let posBtnsHtml = '';
      for (let i = 0; i < posCount; i++) {
        const isActive = i === gcPosIndex;
        posBtnsHtml += `<button type="button" class="gc-pos-btn ${isActive ? 'active' : ''}" data-pos="${i}">${i + 1}</button>`;
      }
      posBar.innerHTML = posBtnsHtml;

      posBar.querySelectorAll('.gc-pos-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          gcPosIndex = parseInt(btn.dataset.pos, 10);
          renderGuitarView();
          playGuitarVoicingSound();
        });
      });
    }

    // 4. Update Root Dock Buttons
    $$('#gcRootBar .gc-root-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.root === gcRoot);
    });

    // 5. Update Quality Grid Buttons
    $$('#gcQualitiesGrid .gc-q-btn').forEach((btn) => {
      const q = btn.dataset.q;
      btn.classList.toggle('active', q === gcQuality);

      if (gcCommonOnly) {
        const isCommon = COMMON_QUALITIES.has(q);
        btn.classList.toggle('is-dimmed', !isCommon);
        btn.classList.toggle('common-highlight', isCommon);
      } else {
        btn.classList.remove('is-dimmed', 'common-highlight');
      }
    });

    // 6. Update Common Filter Button
    const commonBtn = $('#gcCommonBtn');
    if (commonBtn) {
      commonBtn.classList.toggle('active', gcCommonOnly);
    }
  }

  function playGuitarVoicingSound() {
    const btn = $('#gcSoundBtn');
    if (btn) {
      btn.classList.add('strumming');
      setTimeout(() => btn.classList.remove('strumming'), 650);
    }
    const activePos = gcCurrentPositions[gcPosIndex] || gcCurrentPositions[0];
    if (activePos) {
      playGuitarSound(activePos, gcSettings.strum);
    }
  }

  function openGuitarInfoModal() {
    const modal = $('#gcInfoModal');
    if (!modal) return;
    const formulaInfo = GC_FORMULAS_50[gcQuality] || { intervals: [0, 4, 7], formula: '1 · 3 · 5', label: '', tips: '' };
    const rootIdx = NOTE_NAMES.indexOf(gcRoot);
    const chordNotesStr = formulaInfo.intervals.map((st) => NOTE_NAMES[(rootIdx + st) % 12]).join(' · ');

    const activePos = gcCurrentPositions[gcPosIndex] || gcCurrentPositions[0];
    let voicingText = `Position ${gcPosIndex + 1}`;
    if (activePos && activePos.barre) {
      voicingText += ` (ทาบเฟรต ${activePos.barre.fret} · สาย ${activePos.barre.startStr + 1}-${activePos.barre.endStr + 1})`;
    } else if (activePos && activePos.frets) {
      const nonZero = activePos.frets.filter((f) => f > 0);
      const minF = nonZero.length ? Math.min(...nonZero) : 0;
      voicingText += ` (${minF > 0 ? 'Fret ' + minF : 'Open Position'})`;
    }

    $('#gcInfoChordTitle').innerHTML = `<span style="color:var(--text-muted,#94a3b8);font-size:0.88em;font-weight:500;">ข้อมูลคอร์ด</span> <span style="color:var(--cb-volt,#d4ff00);font-family:var(--mono,monospace);font-weight:800;">${gcRoot} ${gcQuality}</span>`;
    $('#gcInfoFormula').textContent = `${formulaInfo.formula} (${formulaInfo.label})`;
    $('#gcInfoNotes').textContent = chordNotesStr;
    $('#gcInfoVoicing').textContent = voicingText;
    $('#gcInfoTips').textContent = formulaInfo.tips || 'จับสายให้แน่นด้วยปลายนิ้ว ตั้งนิ้วให้ตั้งฉากกับเฟรตบอร์ดเพื่อไม่ให้บอดสายข้างเคียง';

    modal.classList.remove('hidden');
  }

  function openGuitarSettingsModal() {
    const modal = $('#gcSettingsModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $$('#gcSettingsModal .gc-opt-btn').forEach((btn) => {
      const setting = btn.dataset.setting;
      const val = btn.dataset.val;
      btn.classList.toggle('active', gcSettings[setting] === val);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OTHER INSTRUMENTS SVG RENDERERS (PIANO, BASS, UKULELE, DRUMS)
  // ──────────────────────────────────────────────────────────────────────────

  function getUkulelePositions(rootName, quality) {
    if (ukeDatabase && ukeDatabase[rootName] && ukeDatabase[rootName][quality]) {
      return ukeDatabase[rootName][quality];
    }
    return [
      {
        frets: [0, 0, 0, 3],
        fingers: [0, 0, 0, 3],
        baseFret: 1,
        name: 'Open (ตำแหน่งเปิด)',
        tips: 'ใช้นิ้วนางกดสาย 1 เฟรต 3 ปล่อยสายที่เหลือเปิด',
        midis: [67, 60, 64, 72]
      }
    ];
  }

  function getPianoVoicings(rootName, quality, isSynth) {
    const rootIdx = NOTE_NAMES.indexOf(rootName);
    const formula = OTHER_FORMULAS[quality] || { notes: [0, 4, 7] };
    const rootMidi = 60 + rootIdx;

    const p1Notes = formula.notes.map((st) => rootMidi + st);
    const p2Notes = formula.notes.map((st, i) => (i === 0 ? rootMidi + st + 12 : rootMidi + st)).sort((a,b)=>a-b);
    const p3Notes = formula.notes.map((st, i) => (i <= 1 ? rootMidi + st + 12 : rootMidi + st)).sort((a,b)=>a-b);
    const lhBass = rootMidi - 12;
    const p4Notes = [lhBass, ...formula.notes.slice(1).map((st) => rootMidi + st)];

    return [
      { name: isSynth ? 'Standard Comping' : 'Root Position', midis: p1Notes },
      { name: isSynth ? 'Spread Pop Voicing' : '1st Inversion', midis: p2Notes },
      { name: isSynth ? 'Lead & Color Stack' : '2nd Inversion', midis: p3Notes },
      { name: isSynth ? 'Full Synth Stack' : '2-Handed Spread', midis: p4Notes }
    ];
  }

  function getBassVoicings(rootName, quality) {
    const rootIdx = NOTE_NAMES.indexOf(rootName);
    const isMinor = quality.includes('m') && !quality.includes('maj');
    const thirdInterval = isMinor ? 3 : 4;
    const fifthInterval = quality.includes('b5') ? 6 : (quality.includes('#5') ? 8 : 7);
    const seventhInterval = quality.includes('maj7') ? 11 : 10;

    let rootStr = 1; // A string (MIDI 33)
    let rootFret = (rootIdx - 9 + 12) % 12;
    if (rootFret > 6) {
      rootStr = 0; // E string (MIDI 28)
      rootFret = (rootIdx - 4 + 12) % 12;
    }
    const openMidis = [28, 33, 38, 43];
    const rootMidi = openMidis[rootStr] + rootFret;

    return [
      {
        name: 'Root - 5th Groove',
        midis: [rootMidi, rootMidi + fifthInterval],
        dots: [
          { str: rootStr, fret: rootFret, label: 'R', root: true },
          { str: rootStr + 1 > 3 ? rootStr - 1 : rootStr + 1, fret: (rootFret + 2) % 12, label: '5' }
        ],
        baseFret: Math.max(1, rootFret - 1)
      },
      {
        name: 'Triad Arpeggio Box',
        midis: [rootMidi, rootMidi + thirdInterval, rootMidi + fifthInterval],
        dots: [
          { str: rootStr, fret: rootFret, label: 'R', root: true },
          { str: rootStr + 1 <= 3 ? rootStr + 1 : rootStr, fret: (rootFret + (thirdInterval === 4 ? 4 : 3)) % 12, label: '3' },
          { str: rootStr + 1 <= 3 ? rootStr + 1 : rootStr, fret: (rootFret + 2) % 12, label: '5' }
        ],
        baseFret: Math.max(1, rootFret - 1)
      },
      {
        name: '7th Full Arpeggio',
        midis: [rootMidi, rootMidi + thirdInterval, rootMidi + fifthInterval, rootMidi + seventhInterval],
        dots: [
          { str: rootStr, fret: rootFret, label: 'R', root: true },
          { str: rootStr + 1 <= 3 ? rootStr + 1 : rootStr, fret: (rootFret + (thirdInterval === 4 ? 4 : 3)) % 12, label: '3' },
          { str: rootStr + 1 <= 3 ? rootStr + 1 : rootStr, fret: (rootFret + 2) % 12, label: '5' },
          { str: Math.min(3, rootStr + 2), fret: (rootFret + 3) % 12, label: '7' }
        ],
        baseFret: Math.max(1, rootFret - 1)
      },
      {
        name: 'Octave & Slap Box',
        midis: [rootMidi, rootMidi + fifthInterval, rootMidi + 12],
        dots: [
          { str: rootStr, fret: rootFret, label: 'R', root: true },
          { str: rootStr + 1 <= 3 ? rootStr + 1 : rootStr, fret: (rootFret + 2) % 12, label: '5' },
          { str: Math.min(3, rootStr + 2), fret: (rootFret + 2) % 12, label: '8' }
        ],
        baseFret: Math.max(1, rootFret - 1)
      }
    ];
  }

  function renderUkuleleDiagramSVG(pos, chordName = '') {
    const baseFret = pos.baseFret || 1;
    const numFrets = 5;
    const startX = 55;
    const stringSpacing = 50;
    const startY = 52;
    const fretSpacing = 48;
    const totalWidth = 260;
    const totalHeight = 325;

    const stringGauges = [2.2, 2.8, 2.4, 1.8]; // 4=G, 3=C, 2=E, 1=A
    const stringNames = ['G', 'C', 'E', 'A'];

    let svg = `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="325" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <linearGradient id="ukeNutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
      <linearGradient id="ukeVoltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="60%" stop-color="#d4ff00"/>
        <stop offset="100%" stop-color="#a3e635"/>
      </linearGradient>
      <filter id="ukeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#d4ff00" flood-opacity="0.6"/>
      </filter>
    </defs>`;

    // Fretboard Wood Background
    svg += `<rect x="${startX - 14}" y="${startY - 4}" width="${3 * stringSpacing + 28}" height="${numFrets * fretSpacing + 8}" rx="8" fill="#12141f" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;

    // Nut or Fret Number indicator
    if (baseFret === 1) {
      // Ivory Bone Nut
      svg += `<rect x="${startX - 8}" y="${startY - 8}" width="${3 * stringSpacing + 16}" height="8" rx="2" fill="url(#ukeNutGrad)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>`;
    } else {
      // Thin zero line
      svg += `<line x1="${startX - 6}" y1="${startY}" x2="${startX + 3 * stringSpacing + 6}" y2="${startY}" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>`;
      // Fret number badge on the left
      svg += `<rect x="6" y="${startY + 8}" width="34" height="26" rx="6" fill="#1e293b" stroke="#d4ff00" stroke-width="1.2"/>`;
      svg += `<text x="23" y="${startY + 26}" text-anchor="middle" fill="#d4ff00" font-family="'DM Mono', monospace" font-size="13" font-weight="800">${baseFret}fr</text>`;
    }

    // Fret Wires
    for (let f = 1; f <= numFrets; f++) {
      const y = startY + f * fretSpacing;
      svg += `<line x1="${startX - 6}" y1="${y}" x2="${startX + 3 * stringSpacing + 6}" y2="${y}" stroke="rgba(203,213,225,0.3)" stroke-width="2"/>`;
    }

    // Strings (4 strings: G, C, E, A)
    for (let s = 0; s < 4; s++) {
      const x = startX + s * stringSpacing;
      svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + numFrets * fretSpacing}" stroke="rgba(255,255,255,0.75)" stroke-width="${stringGauges[s]}" stroke-linecap="round"/>`;
    }

    // Barre rendering if present
    if (pos.barre && typeof pos.barre.fret === 'number') {
      const b = pos.barre;
      const relFret = b.fret - baseFret + 1;
      if (relFret >= 1 && relFret <= numFrets) {
        const cy = startY + (relFret - 0.5) * fretSpacing;
        const x1 = startX + b.startStr * stringSpacing;
        const x2 = startX + b.endStr * stringSpacing;
        const pillLeft = Math.min(x1, x2) - 13;
        const pillW = Math.abs(x2 - x1) + 26;
        svg += `<rect x="${pillLeft}" y="${cy - 12}" width="${pillW}" height="24" rx="12" fill="url(#ukeVoltGrad)" filter="url(#ukeGlow)"/>`;
      }
    }

    // String head indicators (Open / Muted) & String name label
    for (let s = 0; s < 4; s++) {
      const x = startX + s * stringSpacing;
      const fret = pos.frets[s];
      const finger = (pos.fingers && pos.fingers[s]) || 0;

      // String name at top
      svg += `<text x="${x}" y="16" text-anchor="middle" fill="#94a3b8" font-family="'DM Mono', monospace" font-size="11" font-weight="700">${stringNames[s]}</text>`;

      if (fret === -1) {
        svg += `<text x="${x}" y="36" text-anchor="middle" fill="#ef4444" font-family="'DM Mono', monospace" font-size="16" font-weight="900">×</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="31" r="7" fill="none" stroke="#22c55e" stroke-width="2" style="cursor:pointer;" data-uke-str="${s}" data-uke-fret="0"/>`;
      } else {
        const relFret = fret - baseFret + 1;
        if (relFret >= 1 && relFret <= numFrets) {
          const cy = startY + (relFret - 0.5) * fretSpacing;
          svg += `<circle cx="${x}" cy="${cy}" r="13" fill="url(#ukeVoltGrad)" stroke="#ffffff" stroke-width="1.2" filter="url(#ukeGlow)" style="cursor:pointer;" data-uke-str="${s}" data-uke-fret="${fret}"/>`;
          const label = finger > 0 ? String(finger) : '•';
          svg += `<text x="${x}" y="${cy + 4.5}" text-anchor="middle" fill="#08080a" font-family="'Space Grotesk', 'DM Mono', monospace" font-size="12.5" font-weight="900" pointer-events="none">${label}</text>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  function renderMiniUkuleleSVG(pos) {
    const baseFret = pos.baseFret || 1;
    const numFrets = 4;
    const startX = 20;
    const stringSpacing = 16;
    const startY = 16;
    const fretSpacing = 16;
    const totalWidth = 90;
    const totalHeight = 90;

    let svg = `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="86" xmlns="http://www.w3.org/2000/svg">`;

    // Nut or Fret indicator
    if (baseFret === 1) {
      svg += `<rect x="${startX - 2}" y="${startY - 3}" width="${3 * stringSpacing + 4}" height="4" rx="1" fill="#cbd5e1"/>`;
    } else {
      svg += `<line x1="${startX}" y1="${startY}" x2="${startX + 3 * stringSpacing}" y2="${startY}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>`;
      svg += `<text x="9" y="${startY + 12}" text-anchor="middle" fill="#d4ff00" font-family="'DM Mono', monospace" font-size="9" font-weight="700">${baseFret}fr</text>`;
    }

    // Frets
    for (let f = 1; f <= numFrets; f++) {
      const y = startY + f * fretSpacing;
      svg += `<line x1="${startX}" y1="${y}" x2="${startX + 3 * stringSpacing}" y2="${y}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    }

    // Strings
    for (let s = 0; s < 4; s++) {
      const x = startX + s * stringSpacing;
      svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + numFrets * fretSpacing}" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>`;
    }

    // Dots & Mute/Open markers
    for (let s = 0; s < 4; s++) {
      const x = startX + s * stringSpacing;
      const fret = pos.frets[s];
      if (fret === -1) {
        svg += `<text x="${x}" y="10" text-anchor="middle" fill="#ef4444" font-family="'DM Mono', monospace" font-size="9" font-weight="bold">×</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="8" r="2.5" fill="none" stroke="#22c55e" stroke-width="1"/>`;
      } else {
        const relFret = fret - baseFret + 1;
        if (relFret >= 1 && relFret <= numFrets) {
          const cy = startY + (relFret - 0.5) * fretSpacing;
          svg += `<circle cx="${x}" cy="${cy}" r="4.5" fill="#d4ff00"/>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  function renderUkuleleSVG(pos, isMini = false) {
    return isMini ? renderMiniUkuleleSVG(pos) : renderUkuleleDiagramSVG(pos);
  }

  function renderPianoSVG(voicing, isMini = false, isSynth = false) {
    const whiteKeysCount = 14;
    const wWidth = isMini ? 7.5 : 18;
    const wHeight = isMini ? 56 : 130;
    const bWidth = isMini ? 4.5 : 11;
    const bHeight = isMini ? 36 : 82;
    const totalWidth = whiteKeysCount * wWidth;
    const totalHeight = wHeight + (isMini ? 14 : 26);

    const whitePitchClasses = [0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7, 9, 11];
    const blackKeysDef = [
      { pc: 1, afterIdx: 0, name: 'Db' },
      { pc: 3, afterIdx: 1, name: 'Eb' },
      { pc: 6, afterIdx: 3, name: 'Gb' },
      { pc: 8, afterIdx: 4, name: 'Ab' },
      { pc: 10, afterIdx: 5, name: 'Bb' },
      { pc: 1, afterIdx: 7, name: 'Db' },
      { pc: 3, afterIdx: 8, name: 'Eb' },
      { pc: 6, afterIdx: 10, name: 'Gb' },
      { pc: 8, afterIdx: 11, name: 'Ab' },
      { pc: 10, afterIdx: 12, name: 'Bb' }
    ];

    const activePcs = (voicing.midis || []).map((m) => m % 12);
    let svg = `<svg viewBox="0 0 ${totalWidth + 10} ${totalHeight}" style="width:100%;max-width:${isMini ? 115 : 290}px;height:auto;display:block;">`;

    for (let i = 0; i < whiteKeysCount; i++) {
      const x = 5 + i * wWidth;
      const pc = whitePitchClasses[i];
      const isActive = activePcs.includes(pc);
      const fill = isActive ? (isSynth ? '#a855f7' : '#d4ff00') : '#ffffff';
      const stroke = '#222222';
      svg += `<rect x="${x}" y="5" width="${wWidth}" height="${wHeight}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    }

    blackKeysDef.forEach((bk) => {
      const x = 5 + (bk.afterIdx + 1) * wWidth - bWidth / 2;
      const isActive = activePcs.includes(bk.pc);
      const fill = isActive ? (isSynth ? '#c084fc' : '#84cc16') : '#18181b';
      const stroke = '#000000';
      svg += `<rect x="${x}" y="5" width="${bWidth}" height="${bHeight}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>`;
    });

    svg += `</svg>`;
    return svg;
  }

  function renderBassSVG(voicing, isMini = false) {
    const bf = voicing.baseFret || 1;
    const startX = isMini ? 26 : 56;
    const stringSpacing = isMini ? 18 : 42;
    const startY = isMini ? 24 : 46;
    const fretSpacing = isMini ? 20 : 42;
    const dotRadius = isMini ? 5.5 : 13;

    let svg = `<svg viewBox="0 0 ${isMini ? 110 : 240} ${isMini ? 135 : 280}" style="width:100%;max-width:${isMini ? 110 : 260}px;height:auto;display:block;">`;

    for (let j = 0; j <= 5; j++) {
      const y = startY + j * fretSpacing;
      if (j === 0 && bf === 1) {
        svg += `<line x1="${startX}" y1="${y}" x2="${startX + 3 * stringSpacing}" y2="${y}" stroke="#ffffff" stroke-width="${isMini ? 2.5 : 4.5}" stroke-linecap="round"/>`;
      } else {
        svg += `<line x1="${startX}" y1="${y}" x2="${startX + 3 * stringSpacing}" y2="${y}" stroke="rgba(234,179,8,0.4)" stroke-width="${isMini ? 1.2 : 1.6}"/>`;
      }
    }

    const bassGauge = [3.2, 2.5, 1.8, 1.2];
    for (let i = 0; i < 4; i++) {
      const x = startX + i * stringSpacing;
      svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + 5 * fretSpacing}" stroke="rgba(255,255,255,0.4)" stroke-width="${isMini ? 1.2 : bassGauge[i]}"/>`;
    }

    if (bf > 1) {
      const labelY = startY + fretSpacing / 2 + (isMini ? 4 : 6);
      svg += `<text x="${isMini ? 12 : 28}" y="${labelY}" text-anchor="middle" font-family="DM Mono, monospace" font-size="${isMini ? 9.5 : 15}" font-weight="700" fill="#eab308">${bf}</text>`;
    }

    (voicing.dots || []).forEach((dot) => {
      const x = startX + dot.str * stringSpacing;
      const relFret = (bf > 1 && dot.fret > 0) ? (dot.fret - bf + 1) : dot.fret;
      if (relFret >= 1 && relFret <= 5) {
        const cy = startY + (relFret - 0.5) * fretSpacing;
        const color = dot.root ? '#eab308' : '#38bdf8';
        svg += `<circle cx="${x}" cy="${cy}" r="${dotRadius}" fill="${color}"/>`;
        if (!isMini) {
          svg += `<text x="${x}" y="${cy + 4.5}" text-anchor="middle" font-family="DM Mono, monospace" font-size="12" font-weight="700" fill="#000000">${dot.label}</text>`;
        }
      }
    });

    svg += `</svg>`;
    return svg;
  }

  function renderDrumSVG(variation, isMini = false) {
    const rows = ['crash', 'hihat', 'snare', 'kick'];
    const rowColors = ['#f43f5e', '#38bdf8', '#eab308', '#d4ff00'];
    const rowNames = ['Crash', 'Hi-Hat', 'Snare', 'Kick'];

    const cellW = isMini ? 4.8 : 13;
    const cellH = isMini ? 10 : 22;
    const startX = isMini ? 26 : 56;
    const startY = isMini ? 12 : 22;

    const totalWidth = startX + 16 * (cellW + 2) + (isMini ? 8 : 16);
    const totalHeight = startY + 4 * (cellH + 4) + (isMini ? 8 : 14);

    let svg = `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" style="width:100%;max-width:${isMini ? 120 : 320}px;height:auto;display:block;">`;

    rows.forEach((rowKey, rIdx) => {
      const y = startY + rIdx * (cellH + 4);
      const pattern = (variation.grid && variation.grid[rowKey]) ? variation.grid[rowKey] : [];

      if (!isMini) {
        svg += `<text x="${startX - 8}" y="${y + cellH / 2 + 4}" text-anchor="end" font-family="DM Mono, monospace" font-size="11" font-weight="600" fill="${rowColors[rIdx]}">${rowNames[rIdx]}</text>`;
      }

      for (let c = 0; c < 16; c++) {
        const x = startX + c * (cellW + 2);
        const isActive = pattern[c] === 1;
        const isBeatStart = c % 4 === 0;
        const fill = isActive ? rowColors[rIdx] : (isBeatStart ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)');
        const stroke = isBeatStart ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)';

        svg += `<rect class="drum-step-cell" data-step="${c}" x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="${isMini ? 1 : 3}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VR PIANO (vrpiano.co.jp) WORKSPACE CONTROLLER
  // ──────────────────────────────────────────────────────────────────────────

  function vrpSpell(li, pc) {
    let d = (pc - VRP_NAT[li % 7] + 12) % 12;
    if (d > 6) d -= 12;
    return VRP_LET[li % 7] + (VRP_ACC[d] !== undefined ? VRP_ACC[d] : '?');
  }

  function vrpChordName(ri, ti) {
    return VRP_ROOTS[ri].n + VRP_TYPES[ti].id;
  }

  function vrpChordNotes(ri, ti) {
    const r = VRP_ROOTS[ri], t = VRP_TYPES[ti];
    return t.iv.map((iv, i) => vrpSpell(r.li + t.st[i], (r.pc + iv) % 12));
  }

  function vrpChordMidi(ri, ti, inv = 0) {
    const r = VRP_ROOTS[ri], iv = VRP_TYPES[ti].iv, n = iv.length;
    inv = ((inv % n) + n) % n;
    const rel = [];
    for (let i = 0; i < n; i++) {
      let d = iv[(inv + i) % n] - iv[inv];
      if (d < 0) d += 12;
      rel.push(d);
    }
    const span = rel[n - 1];
    const bassPc = (r.pc + iv[inv]) % 12;
    const ideal = VRP_KB_LO + (VRP_KB_HI - VRP_KB_LO - span) / 2;
    const lo = VRP_KB_LO + (((bassPc - VRP_KB_LO) % 12) + 12) % 12;
    let best = lo;
    for (let m = lo; m <= VRP_KB_HI - span; m += 12) {
      if (Math.abs(m - ideal) < Math.abs(best - ideal)) best = m;
    }
    if (best + span > VRP_KB_HI) best = lo;
    return rel.map(x => best + x);
  }

  function vrpChordNotesOrd(ri, ti, inv = 0) {
    const ns = vrpChordNotes(ri, ti), n = ns.length, out = [];
    inv = ((inv % n) + n) % n;
    for (let i = 0; i < n; i++) out.push(ns[(inv + i) % n]);
    return out;
  }

  function vrpChordPcs(ri, ti) {
    const r = VRP_ROOTS[ri], t = VRP_TYPES[ti], s = {};
    t.iv.forEach(x => { s[(r.pc + x) % 12] = 1; });
    return Object.keys(s).map(Number).sort((a, b) => a - b);
  }

  function vrpSame(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function vrpIdentify(midis) {
    const s = {};
    midis.forEach(m => { s[m % 12] = 1; });
    const pcs = Object.keys(s).map(Number).sort((a, b) => a - b);
    if (!pcs.length) return { pcs, hits: [] };
    const bassPc = midis.length ? midis[0] % 12 : -1;
    const hits = [];
    for (let r = 0; r < VRP_ROOTS.length; r++) {
      for (let t = 0; t < VRP_TYPES.length; t++) {
        if (vrpSame(vrpChordPcs(r, t), pcs)) hits.push({ r, t });
      }
    }
    hits.sort((a, b) => {
      return (VRP_ROOTS[b.r].pc === bassPc ? 1 : 0) - (VRP_ROOTS[a.r].pc === bassPc ? 1 : 0);
    });
    return { pcs, hits, bassPc };
  }

  function vrpInversionIndex(ri, ti, bassPc) {
    const ivs = VRP_TYPES[ti].iv, r = VRP_ROOTS[ri].pc;
    for (let i = 0; i < ivs.length; i++) {
      if ((r + ivs[i]) % 12 === bassPc) return i;
    }
    return -1;
  }

  function playVrpAudio(midis, isArp = false) {
    const ctx = getAudioCtx();
    if (!ctx || !midis || midis.length === 0) return;

    const isElectric = (vrpTimbre === 'electric');
    const vol = Math.max(0.01, Math.min(1.0, vrpVolume));
    const delayStep = isArp ? 0.07 : 0.012;

    midis.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime + (idx * delayStep);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      if (isElectric) {
        // Electric Piano (Rhodes Style)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4.5, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.8);

        gain.gain.exponentialRampToValueAtTime(0.36 * vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.18 * vol, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.6);
        osc2.stop(now + 2.6);
      } else {
        // Acoustic Concert Grand Piano
        const oscFundamental = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const oscBody = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        oscFundamental.type = 'sine';
        oscFundamental.frequency.setValueAtTime(freq, now);

        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(freq * 2, now);

        oscBody.type = 'sine';
        oscBody.frequency.setValueAtTime(freq * 3, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(freq * 7, 8500), now);
        filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 2.2, 3600), now + 0.8);

        gain.gain.exponentialRampToValueAtTime(0.44 * vol, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.24 * vol, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        oscFundamental.connect(filter);
        oscHarmonic.connect(filter);
        oscBody.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        oscFundamental.start(now);
        oscHarmonic.start(now);
        oscBody.start(now);
        oscFundamental.stop(now + 2.9);
        oscHarmonic.stop(now + 2.9);
        oscBody.stop(now + 2.9);
      }
    });
  }

  function buildVrpKeyboard() {
    const elKb = $('#vrpKeyboard');
    if (!elKb) return;
    elKb.innerHTML = '';
    vrpKeyElements = {};

    const avail = Math.min(window.innerWidth - 48, 760);
    let kw = Math.floor(avail / 15);
    if (kw > 44) kw = 44;
    if (kw < 24) kw = 24;
    const pitch = kw;
    const bw = Math.round(kw * 0.62);
    let wi = 0;

    for (let m = VRP_KB_LO; m <= VRP_KB_HI; m++) {
      if (!VRP_DIA[m % 12]) continue;
      const w = document.createElement('div');
      w.className = 'vrp-wk';
      w.setAttribute('data-m', m);
      w.style.width = kw + 'px';
      if (m % 12 === 0) {
        w.textContent = (m === 48 ? 'โด 3' : (m === 60 ? 'โด 4' : 'โด 5'));
      }
      elKb.appendChild(w);
      vrpKeyElements[m] = w;

      if (VRP_BLACK_AFTER[m % 12] && m + 1 <= VRP_KB_HI) {
        const b = document.createElement('div');
        b.className = 'vrp-bk';
        b.setAttribute('data-m', m + 1);
        b.style.width = bw + 'px';
        b.style.left = (14 + (wi + 1) * pitch - bw / 2) + 'px';
        elKb.appendChild(b);
        vrpKeyElements[m + 1] = b;
      }
      wi++;
    }
  }

  function vrpPaint(midis, rootMidi) {
    for (const m in vrpKeyElements) {
      vrpKeyElements[m].classList.remove('on', 'root');
    }
    midis.forEach((m) => {
      if (vrpKeyElements[m]) {
        vrpKeyElements[m].classList.add(m === rootMidi ? 'root' : 'on');
      }
    });
  }

  function renderVrpFind(doPlay = false) {
    $$('#vrpRootsBar .vrp-root-btn').forEach((b, idx) => {
      b.classList.toggle('active', idx === vrpRi);
    });
    $$('#vrpTypesGrid .vrp-type-btn').forEach((b, idx) => {
      b.classList.toggle('active', idx === vrpTi);
    });

    const ms = vrpChordMidi(vrpRi, vrpTi, vrpInv);
    const ns = vrpChordNotesOrd(vrpRi, vrpTi, vrpInv);
    const rootPc = VRP_ROOTS[vrpRi].pc;
    let rootMidi = -1;
    for (let i = 0; i < ms.length; i++) {
      if (ms[i] % 12 === rootPc) {
        rootMidi = ms[i];
        break;
      }
    }
    const kana = ms.map((m) => VRP_KANA[m % 12]);

    const cNameEl = $('#vrpChordName');
    const cTypeEl = $('#vrpChordTypeTh');
    const notesValEl = $('#vrpNotesVal');
    const solfegeValEl = $('#vrpSolfegeVal');

    const baseName = vrpChordName(vrpRi, vrpTi);
    const slash = vrpInv > 0 ? `<span class="vrp-slash-note"> / ${ns[0]}</span>` : '';
    if (cNameEl) cNameEl.innerHTML = `${baseName}${slash}`;

    const invLabel = vrpInv > 0 ? ` <i>${VRP_INVNAME[vrpInv]}</i>` : '';
    if (cTypeEl) cTypeEl.innerHTML = `${VRP_TYPES[vrpTi].th}${invLabel}`;

    if (notesValEl) notesValEl.textContent = ns.join(' - ');
    if (solfegeValEl) solfegeValEl.textContent = kana.join(' - ');

    vrpPaint(ms, rootMidi);

    if (doPlay) {
      playVrpAudio(ms, false);
    }
  }

  function renderVrpId() {
    const r = vrpIdentify(vrpSelMidis);
    const cNameEl = $('#vrpChordName');
    const cTypeEl = $('#vrpChordTypeTh');
    const notesValEl = $('#vrpNotesVal');
    const solfegeValEl = $('#vrpSolfegeVal');

    if (vrpSelMidis.length === 0) {
      vrpPaint([], -1);
      if (cNameEl) cNameEl.innerHTML = '<span style="font-size:24px;color:#94a3b8">กดคีย์บนเปียโนเพื่อค้นหา</span>';
      if (cTypeEl) cTypeEl.innerHTML = 'ระบบจะระบุชื่อคอร์ดและคอร์ดกลับให้อัตโนมัติ';
      if (notesValEl) notesValEl.textContent = '-';
      if (solfegeValEl) solfegeValEl.textContent = '-';
      return;
    }

    const kana = vrpSelMidis.map((m) => VRP_KANA[m % 12]).join(' - ');
    const noteNames = vrpSelMidis.map((m) => NOTE_NAMES[m % 12]).join(' - ');

    if (!r.hits || r.hits.length === 0) {
      vrpPaint(vrpSelMidis, -1);
      if (cNameEl) cNameEl.innerHTML = '<span style="font-size:24px;color:#f87171">ไม่พบคอร์ดที่ตรงกัน</span>';
      if (cTypeEl) cTypeEl.innerHTML = 'ไม่พบชื่อคอร์ดมาตรฐานสำหรับการผสมโน้ตนี้';
      if (notesValEl) notesValEl.textContent = noteNames;
      if (solfegeValEl) solfegeValEl.textContent = kana;
      return;
    }

    const h = r.hits[0];
    const ivi = vrpInversionIndex(h.r, h.t, r.bassPc);
    const invName = (ivi > 0 && VRP_INVNAME[ivi]) ? VRP_INVNAME[ivi] : '';
    const ns = vrpChordNotes(h.r, h.t);

    let rootMidi = -1;
    for (let i = 0; i < vrpSelMidis.length; i++) {
      if (vrpSelMidis[i] % 12 === VRP_ROOTS[h.r].pc) {
        rootMidi = vrpSelMidis[i];
        break;
      }
    }
    vrpPaint(vrpSelMidis, rootMidi);

    const bass = ivi > 0 ? `<span class="vrp-slash-note"> / ${ns[ivi]}</span>` : '';
    const others = r.hits.slice(1).map((x) => vrpChordName(x.r, x.t));
    const altText = others.length ? ` <span style="font-size:12px;color:#cbd5e1;">(หรือ ${others.join(', ')})</span>` : '';

    if (cNameEl) cNameEl.innerHTML = `${vrpChordName(h.r, h.t)}${bass}${altText}`;
    if (cTypeEl) cTypeEl.innerHTML = `${VRP_TYPES[h.t].th}${invName ? ` <i>${invName}</i>` : ''}`;
    if (notesValEl) notesValEl.textContent = ns.join(' - ');
    if (solfegeValEl) solfegeValEl.textContent = kana;
  }

  function setVrpMode(m) {
    vrpMode = m;
    const isFind = (m === 'find');
    const pickEl = $('#vrpPickersSection');
    const clearBtn = $('#vrpClearBtn');
    const invertBtn = $('#vrpInvertBtn');
    const modeFindBtn = $('#vrpModeFind');
    const modeIdBtn = $('#vrpModeId');
    const playText = $('#vrpPlayBtnText');

    if (pickEl) pickEl.style.display = isFind ? 'block' : 'none';
    if (clearBtn) clearBtn.style.display = isFind ? 'none' : 'inline-flex';
    if (invertBtn) invertBtn.style.display = isFind ? 'inline-flex' : 'none';
    if (modeFindBtn) modeFindBtn.classList.toggle('active', isFind);
    if (modeIdBtn) modeIdBtn.classList.toggle('active', !isFind);
    if (playText) playText.textContent = isFind ? 'เล่นคอร์ด' : 'เล่นโน้ตที่เลือก';

    if (isFind) {
      renderVrpFind(false);
    } else {
      vrpSelMidis = [];
      renderVrpId();
    }
  }

  function renderMiniPianoSvg(midis, rootMidi) {
    const kw = 11;
    const kh = 44;
    const bw = 6.8;
    const bh = 27;
    const midiSet = new Set(midis);
    let whiteKeysSvg = '';
    let blackKeysSvg = '';
    let wi = 0;

    for (let m = VRP_KB_LO; m <= VRP_KB_HI; m++) {
      if (!VRP_DIA[m % 12]) continue;
      const isRoot = (m === rootMidi);
      const isOn = midiSet.has(m);
      const fill = isRoot ? '#d4ff00' : (isOn ? '#4ade80' : '#f8fafc');
      const x = wi * kw;
      whiteKeysSvg += `<rect x="${x}" y="0" width="${kw - 1}" height="${kh}" rx="1.5" fill="${fill}" stroke="#334155" stroke-width="0.8" />`;

      if (VRP_BLACK_AFTER[m % 12] && m + 1 <= VRP_KB_HI) {
        const bm = m + 1;
        const bIsRoot = (bm === rootMidi);
        const bIsOn = midiSet.has(bm);
        const bFill = bIsRoot ? '#d4ff00' : (bIsOn ? '#22c55e' : '#0f172a');
        const bx = (wi + 1) * kw - bw / 2 - 0.5;
        blackKeysSvg += `<rect x="${bx.toFixed(1)}" y="0" width="${bw}" height="${bh}" rx="1" fill="${bFill}" stroke="#475569" stroke-width="0.7" />`;
      }
      wi++;
    }

    const totalWidth = wi * kw;
    return `<svg viewBox="0 0 ${totalWidth} ${kh}" width="100%" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">${whiteKeysSvg}${blackKeysSvg}</svg>`;
  }

  function renderVrpDirectory(filterRoot = 'ALL') {
    vrpDirFilter = filterRoot;
    const gridEl = $('#vrpDirGrid');
    if (!gridEl) return;

    $$('#vrpDirFilterBar .vrp-dir-filter-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.filter === filterRoot);
    });

    let cardsHtml = '';
    // 12 Roots x 9 Core Standard Chord Types (Major, m, 7, m7, M7, mM7, 6, m6, dim)
    for (let r = 0; r < 12; r++) {
      if (filterRoot !== 'ALL' && parseInt(filterRoot, 10) !== r) continue;
      for (let t = 0; t < 9; t++) {
        const ms = vrpChordMidi(r, t, 0);
        const rootPc = VRP_ROOTS[r].pc;
        let rootMidi = -1;
        for (let i = 0; i < ms.length; i++) {
          if (ms[i] % 12 === rootPc) { rootMidi = ms[i]; break; }
        }
        const name = vrpChordName(r, t);
        const label = VRP_TYPES[t].th;
        const ns = vrpChordNotesOrd(r, t, 0);
        const kana = ms.map((m) => VRP_KANA[m % 12]);
        const svg = renderMiniPianoSvg(ms, rootMidi);

        cardsHtml += `
          <div class="vrp-chord-card" data-ri="${r}" data-ti="${t}">
            <div class="vrp-card-top">
              <span class="vrp-card-sym">${name}</span>
              <span class="vrp-card-label">${label}</span>
              <button type="button" class="vrp-card-play-btn" data-ri="${r}" data-ti="${t}" title="ฟังเสียงคอร์ด">▶</button>
            </div>
            <div class="vrp-card-kb-svg">${svg}</div>
            <div class="vrp-card-notes">
              <span>${ns.join(' · ')}</span>
              <span class="vrp-card-solfege">${kana.join(' · ')}</span>
            </div>
          </div>
        `;
      }
    }

    gridEl.innerHTML = cardsHtml;

    gridEl.querySelectorAll('.vrp-chord-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.vrp-card-play-btn');
        const r = parseInt(card.dataset.ri, 10);
        const t = parseInt(card.dataset.ti, 10);
        if (playBtn) {
          e.stopPropagation();
          const ms = vrpChordMidi(r, t, 0);
          playVrpAudio(ms, false);
          return;
        }
        vrpRi = r;
        vrpTi = t;
        vrpInv = 0;
        setVrpMode('find');
        renderVrpFind(true);
        const cardDisplay = $('#vrpChordDisplayCard');
        if (cardDisplay) {
          cardDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  function renderVrPianoView() {
    buildVrpKeyboard();
    if (vrpMode === 'find') {
      renderVrpFind(false);
    } else {
      renderVrpId();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UKULELE PRO WORKSPACE CONTROLLER
  // ──────────────────────────────────────────────────────────────────────────

  function renderUkuleleView() {
    ukeCurrentPositions = getUkulelePositions(ukeRoot, ukeQuality);
    if (!ukeCurrentPositions || ukeCurrentPositions.length === 0) {
      ukeCurrentPositions = [
        { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 1, name: 'Open (ตำแหน่งเปิด)', tips: '', midis: [67, 60, 64, 72] }
      ];
    }
    if (ukePosIndex >= ukeCurrentPositions.length) ukePosIndex = 0;
    const activePos = ukeCurrentPositions[ukePosIndex] || ukeCurrentPositions[0];

    const formulaInfo = UKE_FORMULAS[ukeQuality] || { formula: '1 · 3 · 5', intervals: [0, 4, 7], label: '' };
    const rootIdx = NOTE_NAMES.indexOf(ukeRoot);
    const notesStr = formulaInfo.intervals.map((st) => NOTE_NAMES[(rootIdx + st) % 12]).join(' · ');

    // 1. Update Hero Card
    const nameEl = $('#ukeChordName');
    if (nameEl) nameEl.textContent = `${ukeRoot} ${ukeQuality}`;

    const formulaEl = $('#ukeFormulaPill');
    if (formulaEl) {
      formulaEl.innerHTML = `<span style="color:var(--text-muted,#94a3b8);">โน้ต:</span> <strong style="color:#ffffff;">${notesStr}</strong> <span style="opacity:0.4;margin:0 4px;">|</span> <span style="color:var(--text-muted,#94a3b8);">สูตร:</span> <strong style="color:var(--cb-volt,#d4ff00);">${formulaInfo.formula}</strong> <span style="color:#a3e635;font-size:0.9em;">(${formulaInfo.label})</span>`;
    }

    // 2. Position Switcher Pills
    const switcherEl = $('#ukePosSwitcher');
    if (switcherEl) {
      switcherEl.innerHTML = ukeCurrentPositions.map((p, idx) => `
        <button type="button" class="uke-pos-pill ${idx === ukePosIndex ? 'active' : ''}" data-idx="${idx}">
          ฟอร์ม ${idx + 1}: ${p.name || ('Position ' + (idx + 1))}
        </button>
      `).join('');

      switcherEl.querySelectorAll('.uke-pos-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          ukePosIndex = parseInt(btn.dataset.idx, 10);
          renderUkuleleView();
          playUkuleleSound(ukeCurrentPositions[ukePosIndex]);
        });
      });
    }

    // 3. Render Hero SVG
    const fretboardEl = $('#ukeFretboardWrap');
    if (fretboardEl && activePos) {
      fretboardEl.innerHTML = renderUkuleleDiagramSVG(activePos, `${ukeRoot} ${ukeQuality}`);
    }

    // 4. Update Fingering Tip
    const tipEl = $('#ukeTipText');
    if (tipEl) {
      tipEl.textContent = activePos.tips || 'วางนิ้วตามตัวเลขบนจุดกลมสีเขียว Volt และดีดทุกสายให้เสียงใสกังวาน';
    }

    // 5. Render Voicings Sidebar
    const voicingsGridEl = $('#ukeVoicingsGrid');
    if (voicingsGridEl) {
      voicingsGridEl.innerHTML = ukeCurrentPositions.map((pos, idx) => {
        const isActive = idx === ukePosIndex;
        const miniSvg = renderMiniUkuleleSVG(pos);
        const fretArrStr = pos.frets.map(f => (f === -1 ? 'X' : f)).join(' ');
        const fingerArrStr = (pos.fingers || []).map(f => (f <= 0 ? '-' : f)).join(' ');
        return `
          <div class="uke-voicing-card ${isActive ? 'active' : ''}" data-idx="${idx}">
            <div class="uke-vc-header">
              <span class="uke-vc-badge">ฟอร์ม ${idx + 1}</span>
              <span class="uke-vc-name">${pos.name || ''}</span>
            </div>
            <div class="uke-vc-body">
              <div class="uke-vc-svg">${miniSvg}</div>
              <div class="uke-vc-info">
                <div class="uke-vc-stat">
                  <span class="uke-vc-lbl">สาย 4-1 (G-C-E-A):</span>
                  <span class="uke-vc-val">[ ${fretArrStr} ]</span>
                </div>
                <div class="uke-vc-stat">
                  <span class="uke-vc-lbl">นิ้วที่ใช้:</span>
                  <span class="uke-vc-val">${fingerArrStr}</span>
                </div>
                ${pos.baseFret > 1 ? `<div class="uke-vc-stat"><span class="uke-vc-lbl">ตำแหน่ง:</span><span class="uke-vc-val">เฟรต ${pos.baseFret}</span></div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      voicingsGridEl.querySelectorAll('.uke-voicing-card').forEach((card) => {
        card.addEventListener('click', () => {
          ukePosIndex = parseInt(card.dataset.idx, 10);
          renderUkuleleView();
          playUkuleleSound(ukeCurrentPositions[ukePosIndex]);
        });
      });
    }

    // 6. Sync Root Bar & Quality Grid Buttons
    $$('#ukeRootBar .uke-root-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.root === ukeRoot);
    });
    $$('#ukeQualitiesGrid .uke-q-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.q === ukeQuality);
    });
  }

  function renderUkuleleDirectory(filterRoot = 'ALL') {
    ukeDirFilter = filterRoot;
    const gridEl = $('#ukeDirGrid');
    if (!gridEl) return;

    $$('#ukeDirFilterBar .uke-dir-filter-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.filter === filterRoot);
    });

    let cardsHtml = '';
    const rootsToRender = filterRoot === 'ALL' ? UKE_ROOTS : [filterRoot];
    const qualitiesToRender = filterRoot === 'ALL'
      ? ['Major', 'Minor', '7', 'maj7']
      : ['Major', 'Minor', '7', 'maj7', 'm7', 'sus4', 'sus2', '6', 'm6', 'dim', 'dim7', 'aug', '9', 'add9'];

    rootsToRender.forEach((r) => {
      qualitiesToRender.forEach((q) => {
        const positions = (ukeDatabase && ukeDatabase[r] && ukeDatabase[r][q]) ? ukeDatabase[r][q] : getUkulelePositions(r, q);
        const pos = positions[0];
        if (!pos) return;

        const chordTitle = `${r}${q === 'Major' ? '' : (q === 'Minor' ? 'm' : q)}`;
        const formInfo = UKE_FORMULAS[q] || { label: '', intervals: [0, 4, 7] };
        const rootIdx = NOTE_NAMES.indexOf(r);
        const notes = formInfo.intervals.map(st => NOTE_NAMES[(rootIdx + st) % 12]);
        const fretStr = pos.frets.map(f => (f === -1 ? 'X' : f)).join(' ');
        const miniSvg = renderMiniUkuleleSVG(pos);

        cardsHtml += `
          <div class="uke-chord-card" data-root="${r}" data-q="${q}">
            <div class="uke-card-top">
              <span class="uke-card-sym">${chordTitle}</span>
              <span class="uke-card-label">${formInfo.label.split(' ')[0]}</span>
              <button type="button" class="uke-card-play-btn" data-root="${r}" data-q="${q}" title="ฟังเสียงคอร์ด">▶</button>
            </div>
            <div class="uke-card-svg">${miniSvg}</div>
            <div class="uke-card-footer">
              <span class="uke-card-notes">${notes.join(' · ')}</span>
              <span class="uke-card-frets">[ ${fretStr} ]</span>
            </div>
          </div>
        `;
      });
    });

    gridEl.innerHTML = cardsHtml;

    gridEl.querySelectorAll('.uke-chord-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.uke-card-play-btn');
        const r = card.dataset.root;
        const q = card.dataset.q;
        if (playBtn) {
          e.stopPropagation();
          const poss = (ukeDatabase && ukeDatabase[r] && ukeDatabase[r][q]) ? ukeDatabase[r][q] : getUkulelePositions(r, q);
          if (poss && poss[0]) playUkuleleSound(poss[0]);
          return;
        }

        ukeRoot = r;
        ukeQuality = q;
        ukePosIndex = 0;
        renderUkuleleView();
        playUkuleleSound(ukeCurrentPositions[0]);

        const heroCard = $('#ukeDiagramCard');
        if (heroCard) {
          heroCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OTHER INSTRUMENTS WORKSPACE CONTROLLER
  // ──────────────────────────────────────────────────────────────────────────

  function renderOtherInstrumentsView() {
    const pageTitleEl = $('#chordPageTitle');
    const pageSubEl = $('#chordPageSubtitle');
    const patTitleEl = $('#patternsColumnTitle');
    const qualObj = OTHER_QUALITIES.find((q) => q.id === otherQuality);
    const qualLabel = qualObj && qualObj.display ? qualObj.display : '';
    const fullChordName = `${otherRoot}${qualLabel}`;

    const playIcon = $('#chordPlaySoundIcon');
    const playLabel = $('#chordPlaySoundLabel');

    if (selectedInstrument === 'drums') {
      $('#harmonicChordsDocks').style.display = 'none';
      $('#drumGrooveDockWrap').style.display = 'block';
      $('#drumTempoBar').style.display = 'inline-flex';

      const grooveObj = DRUM_GROOVES[otherGroove] || DRUM_GROOVES.rock;
      drumBpm = grooveObj.bpm || 120;
      $('#drumBpmSlider').value = drumBpm;
      $('#drumBpmDisplay').textContent = `${drumBpm} BPM`;

      if (pageTitleEl) pageTitleEl.textContent = `ตารางจังหวะและกรูฟกลองสากล`;
      if (pageSubEl) pageSubEl.textContent = `แพทเทิร์นกลองชุด 16-Step Sequencer ฝึกซ้อมและฟังบีท`;
      if (patTitleEl) patTitleEl.textContent = `รูปแบบจังหวะ & ลูกส่ง`;

      $('#chordHighlightTitle').textContent = grooveObj.title;
      $('#chordNotesBadge').textContent = grooveObj.desc;

      if (playIcon && playLabel && !drumIsPlaying) {
        playIcon.textContent = '▶';
        playLabel.textContent = 'เล่นจังหวะ';
      }

      otherCurrentPositions = grooveObj.variations || [];
      if (otherPatternIndex >= otherCurrentPositions.length) otherPatternIndex = 0;
      const activeVar = otherCurrentPositions[otherPatternIndex] || otherCurrentPositions[0];

      const bigCardEl = $('#chordBigCard');
      if (bigCardEl) {
        bigCardEl.innerHTML = renderDrumSVG(activeVar, false);
      }

      const patternsGridEl = $('#patternsGridRow');
      if (patternsGridEl) {
        patternsGridEl.innerHTML = otherCurrentPositions.map((variation, idx) => {
          const isActive = idx === otherPatternIndex;
          return `
            <div class="pattern-card ${isActive ? 'active' : ''}" data-index="${idx}">
              <div class="pattern-card-title">PATTERN ${idx + 1}</div>
              <div class="pattern-card-svg-wrap">${renderDrumSVG(variation, true)}</div>
              <div class="pattern-card-label">${variation.name}</div>
            </div>
          `;
        }).join('');

        patternsGridEl.querySelectorAll('.pattern-card').forEach((card) => {
          card.addEventListener('click', () => {
            otherPatternIndex = parseInt(card.dataset.index, 10);
            renderOtherInstrumentsView();
            if (drumIsPlaying) {
              startDrumSequencer(otherCurrentPositions[otherPatternIndex].grid);
            }
          });
        });
      }

      $$('.groove-dock-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.groove === otherGroove);
      });
      return;
    }

    // Harmonic instruments (Piano, Keyboard, Bass, Ukulele)
    $('#harmonicChordsDocks').style.display = 'block';
    $('#drumGrooveDockWrap').style.display = 'none';
    $('#drumTempoBar').style.display = 'none';
    stopDrumSequencer();

    if (playIcon && playLabel) {
      playIcon.textContent = '▶';
      playLabel.textContent = 'เล่นเสียง';
    }

    if (patTitleEl) patTitleEl.textContent = `รูปแบบการจับคอร์ด`;

    if (selectedInstrument === 'piano') {
      if (pageTitleEl) pageTitleEl.textContent = `🎹 ตารางคอร์ดเปียโน`;
      if (pageSubEl) pageSubEl.textContent = `คีย์บอร์ด 88 คีย์ แสดงตำแหน่งโน้ตในคอร์ด คอร์ดรูปพลิก (Inversions) และเสียงแกรนด์เปียโน`;
    } else if (selectedInstrument === 'keyboard') {
      if (pageTitleEl) pageTitleEl.textContent = `🎛️ ตารางคอร์ดคีย์บอร์ด & ซินธ์`;
      if (pageSubEl) pageSubEl.textContent = `Voicings แยกมือซ้าย-ขวา สำหรับคีย์บอร์ดไฟฟ้า คอร์ดป๊อป/แจ๊ส และเสียงซินธ์`;
    } else if (selectedInstrument === 'bass') {
      if (pageTitleEl) pageTitleEl.textContent = `🎸 ตารางทางเดินคอร์ดเบส (4 สาย E-A-D-G)`;
      if (pageSubEl) pageSubEl.textContent = `ตำแหน่ง Root, ทางเดิน Arpeggios, Root-5th Box และเสียงเบสทุ้มลึก`;
    } else if (selectedInstrument === 'ukulele') {
      if (pageTitleEl) pageTitleEl.textContent = `🪕 ตารางคอร์ดอูคูเลเล่ (4 สาย G-C-E-A)`;
      if (pageSubEl) pageSubEl.textContent = `คอร์ดฮาวายเอี้ยนมาตรฐาน 192 คอร์ด ตำแหน่งเปิดและทาบ พร้อมเสียงดีดไนลอน`;
    }

    $('#chordHighlightTitle').textContent = fullChordName;

    const formula = OTHER_FORMULAS[otherQuality] || { notes: [0, 4, 7], label: '' };
    const rootIdx = NOTE_NAMES.indexOf(otherRoot);
    const notesStr = formula.notes.map((st) => NOTE_NAMES[(rootIdx + st) % 12]).join(' · ');
    $('#chordNotesBadge').textContent = `โน้ตในคอร์ด: ${notesStr} (${formula.label})`;

    if (selectedInstrument === 'ukulele') {
      otherCurrentPositions = getUkulelePositions(otherRoot, otherQuality);
    } else if (selectedInstrument === 'piano') {
      otherCurrentPositions = getPianoVoicings(otherRoot, otherQuality, false);
    } else if (selectedInstrument === 'keyboard') {
      otherCurrentPositions = getPianoVoicings(otherRoot, otherQuality, true);
    } else if (selectedInstrument === 'bass') {
      otherCurrentPositions = getBassVoicings(otherRoot, otherQuality);
    }

    if (otherPatternIndex >= otherCurrentPositions.length) otherPatternIndex = 0;
    const activePos = otherCurrentPositions[otherPatternIndex] || otherCurrentPositions[0];

    const bigCardEl = $('#chordBigCard');
    if (bigCardEl && activePos) {
      if (selectedInstrument === 'ukulele') {
        bigCardEl.innerHTML = renderUkuleleSVG(activePos, false);
      } else if (selectedInstrument === 'piano') {
        bigCardEl.innerHTML = renderPianoSVG(activePos, false, false);
      } else if (selectedInstrument === 'keyboard') {
        bigCardEl.innerHTML = renderPianoSVG(activePos, false, true);
      } else if (selectedInstrument === 'bass') {
        bigCardEl.innerHTML = renderBassSVG(activePos, false);
      }
    }

    const patternsGridEl = $('#patternsGridRow');
    if (patternsGridEl) {
      patternsGridEl.innerHTML = otherCurrentPositions.map((pos, idx) => {
        let label = `Pattern ${idx + 1}`;
        let svg = '';

        if (selectedInstrument === 'ukulele') {
          const bf = pos.baseFret || 1;
          label = bf === 1 ? 'Open Hawaiian' : `Barre · Fret ${bf}`;
          svg = renderUkuleleSVG(pos, true);
        } else if (selectedInstrument === 'piano') {
          label = pos.name;
          svg = renderPianoSVG(pos, true, false);
        } else if (selectedInstrument === 'keyboard') {
          label = pos.name;
          svg = renderPianoSVG(pos, true, true);
        } else if (selectedInstrument === 'bass') {
          label = pos.name;
          svg = renderBassSVG(pos, true);
        }

        const isActive = idx === otherPatternIndex;
        return `
          <div class="pattern-card ${isActive ? 'active' : ''}" data-index="${idx}">
            <div class="pattern-card-title">PATTERN ${idx + 1}</div>
            <div class="pattern-card-svg-wrap">${svg}</div>
            <div class="pattern-card-label">${label}</div>
          </div>
        `;
      }).join('');

      patternsGridEl.querySelectorAll('.pattern-card').forEach((card) => {
        card.addEventListener('click', () => {
          otherPatternIndex = parseInt(card.dataset.index, 10);
          renderOtherInstrumentsView();
          playOtherInstrumentSound();
        });
      });
    }

    $$('.root-dock-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.root === otherRoot);
    });
    $$('.quality-dock-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.quality === otherQuality);
    });
  }

  function playOtherInstrumentSound() {
    if (selectedInstrument === 'drums') {
      const grooveObj = DRUM_GROOVES[otherGroove] || DRUM_GROOVES.rock;
      const variation = grooveObj.variations[otherPatternIndex] || grooveObj.variations[0];
      toggleDrumSequencer(variation.grid);
      return;
    }

    const pos = otherCurrentPositions[otherPatternIndex] || otherCurrentPositions[0];
    if (!pos) return;

    if (selectedInstrument === 'ukulele') {
      playUkuleleSound(pos);
    } else if (selectedInstrument === 'piano') {
      playPianoSound(pos.midis);
    } else if (selectedInstrument === 'keyboard') {
      playKeyboardSound(pos.midis);
    } else if (selectedInstrument === 'bass') {
      playBassSound(pos.midis);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW RENDERER & STAGE TRANSITIONS
  // ──────────────────────────────────────────────────────────────────────────

  function showLandingView() {
    stopDrumSequencer();
    const landingEl = $('#instLandingView');
    const workspaceEl = $('#chordWorkspaceView');
    if (landingEl) landingEl.style.display = 'flex';
    if (workspaceEl) workspaceEl.style.display = 'none';
  }

  function showWorkspaceView(instrument) {
    if (instrument) selectedInstrument = instrument;
    const landingEl = $('#instLandingView');
    const workspaceEl = $('#chordWorkspaceView');
    if (landingEl) landingEl.style.display = 'none';
    if (workspaceEl) workspaceEl.style.display = 'block';

    syncInstrumentButtonsUI();

    const guitarWrap = $('#guitarWorkspaceWrap');
    const pianoWrap = $('#pianoWorkspaceWrap');
    const ukeWrap = $('#ukuleleWorkspaceWrap');
    const otherWrap = $('#otherInstrumentsWrap');

    if (selectedInstrument === 'guitar') {
      if (guitarWrap) guitarWrap.style.display = 'block';
      if (pianoWrap) pianoWrap.style.display = 'none';
      if (ukeWrap) ukeWrap.style.display = 'none';
      if (otherWrap) otherWrap.style.display = 'none';
      renderGuitarView();
    } else if (selectedInstrument === 'piano' || selectedInstrument === 'keyboard') {
      if (guitarWrap) guitarWrap.style.display = 'none';
      if (pianoWrap) pianoWrap.style.display = 'block';
      if (ukeWrap) ukeWrap.style.display = 'none';
      if (otherWrap) otherWrap.style.display = 'none';
      stopDrumSequencer();
      if (selectedInstrument === 'keyboard') {
        vrpTimbre = 'electric';
        const titleEl = $('#vrpMainTitle');
        if (titleEl) titleEl.textContent = '🎛️ ค้นหาคอร์ดคีย์บอร์ด & ซินธ์';
        const timbreSel = $('#vrpTimbreSelect');
        if (timbreSel) timbreSel.value = 'electric';
      } else {
        vrpTimbre = 'acoustic';
        const titleEl = $('#vrpMainTitle');
        if (titleEl) titleEl.textContent = '🎹 ค้นหาคอร์ดเปียโน';
        const timbreSel = $('#vrpTimbreSelect');
        if (timbreSel) timbreSel.value = 'acoustic';
      }
      renderVrPianoView();
    } else if (selectedInstrument === 'ukulele') {
      if (guitarWrap) guitarWrap.style.display = 'none';
      if (pianoWrap) pianoWrap.style.display = 'none';
      if (ukeWrap) ukeWrap.style.display = 'block';
      if (otherWrap) otherWrap.style.display = 'none';
      stopDrumSequencer();
      renderUkuleleView();
    } else {
      if (guitarWrap) guitarWrap.style.display = 'none';
      if (pianoWrap) pianoWrap.style.display = 'none';
      if (ukeWrap) ukeWrap.style.display = 'none';
      if (otherWrap) otherWrap.style.display = 'block';
      otherPatternIndex = 0;
      renderOtherInstrumentsView();
    }
  }

  function syncInstrumentButtonsUI() {
    $$('.instrument-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.inst === selectedInstrument);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION & EVENT BINDINGS
  // ──────────────────────────────────────────────────────────────────────────

  async function init() {
    // 1. Fetch Guitar Chords DB and Ukulele Chords DB in background
    try {
      const [gcRes, ukeRes] = await Promise.all([
        fetch('./client/guitar-chords-complete.json'),
        fetch('./client/ukulele-chords-complete.json')
      ]);
      if (gcRes && gcRes.ok) chordsDatabase = await gcRes.json();
      if (ukeRes && ukeRes.ok) ukeDatabase = await ukeRes.json();
    } catch (_) {}

    // 2. Start at Clean Landing View by default (หน้าโล่งๆ มีแค่กล่องให้เลือก)
    showLandingView();

    // 3. Bind Instrument Selection Cards on Landing View
    $$('.inst-landing-grid .inst-select-card').forEach((card) => {
      card.addEventListener('click', () => {
        const inst = card.dataset.inst;
        showWorkspaceView(inst);
      });
    });

    // 4. Bind Back Button (returns to Clean Landing View)
    const backBtn = $('#backToInstrumentsBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        showLandingView();
      });
    }

    // 5. Bind Instrument Dock Buttons on Workspace View
    $$('.instrument-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        showWorkspaceView(btn.dataset.inst);
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // GUITAR-CHORDS.COM EVENT BINDINGS
    // ────────────────────────────────────────────────────────────────────────

    // Guitar Root Bar Buttons
    $$('#gcRootBar .gc-root-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        gcRoot = btn.dataset.root;
        gcPosIndex = 0;
        renderGuitarView();
        playGuitarVoicingSound();
      });
    });

    // Guitar 50-Qualities Buttons
    $$('#gcQualitiesGrid .gc-q-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        gcQuality = btn.dataset.q;
        gcPosIndex = 0;
        renderGuitarView();
        playGuitarVoicingSound();
      });
    });

    // Guitar Sound Button in Header
    const gcSoundBtn = $('#gcSoundBtn');
    if (gcSoundBtn) {
      gcSoundBtn.addEventListener('click', playGuitarVoicingSound);
    }

    // Guitar Info Modal Trigger & Close
    const gcInfoBtn = $('#gcInfoBtn');
    if (gcInfoBtn) {
      gcInfoBtn.addEventListener('click', openGuitarInfoModal);
    }
    const gcInfoClose = $('#gcInfoClose');
    if (gcInfoClose) {
      gcInfoClose.addEventListener('click', () => {
        $('#gcInfoModal').classList.add('hidden');
      });
    }
    const gcInfoModal = $('#gcInfoModal');
    if (gcInfoModal) {
      gcInfoModal.addEventListener('click', (e) => {
        if (e.target === gcInfoModal) gcInfoModal.classList.add('hidden');
      });
    }

    // Guitar Settings Modal Trigger & Close
    const gcSettingsBtn = $('#gcSettingsBtn');
    if (gcSettingsBtn) {
      gcSettingsBtn.addEventListener('click', openGuitarSettingsModal);
    }
    const gcSettingsClose = $('#gcSettingsClose');
    if (gcSettingsClose) {
      gcSettingsClose.addEventListener('click', () => {
        $('#gcSettingsModal').classList.add('hidden');
      });
    }
    const gcSettingsModal = $('#gcSettingsModal');
    if (gcSettingsModal) {
      gcSettingsModal.addEventListener('click', (e) => {
        if (e.target === gcSettingsModal) gcSettingsModal.classList.add('hidden');
      });
    }

    // Guitar Settings Options Buttons
    $$('#gcSettingsModal .gc-opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const setting = btn.dataset.setting;
        const val = btn.dataset.val;
        gcSettings[setting] = val;
        try {
          localStorage.setItem('zc_gc_settings', JSON.stringify(gcSettings));
        } catch (_) {}

        $$(`#gcSettingsModal .gc-opt-btn[data-setting="${setting}"]`).forEach((b) => {
          b.classList.toggle('active', b === btn);
        });

        renderGuitarView();
      });
    });

    // Guitar Common Filter Button
    const gcCommonBtn = $('#gcCommonBtn');
    if (gcCommonBtn) {
      gcCommonBtn.addEventListener('click', () => {
        gcCommonOnly = !gcCommonOnly;
        renderGuitarView();
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // OTHER INSTRUMENTS EVENT BINDINGS
    // ────────────────────────────────────────────────────────────────────────

    // Root Dock Buttons
    $$('#harmonicChordsDocks .root-dock-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        otherRoot = btn.dataset.root;
        renderOtherInstrumentsView();
        playOtherInstrumentSound();
      });
    });

    // Quality Dock Pills
    $$('#harmonicChordsDocks .quality-dock-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        otherQuality = pill.dataset.quality;
        renderOtherInstrumentsView();
        playOtherInstrumentSound();
      });
    });

    // Drum Groove Buttons
    $$('.groove-dock-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        otherGroove = btn.dataset.groove;
        otherPatternIndex = 0;
        renderOtherInstrumentsView();
        if (drumIsPlaying) {
          const grooveObj = DRUM_GROOVES[otherGroove];
          startDrumSequencer(grooveObj.variations[0].grid);
        }
      });
    });

    // Play Sound Button
    const playBtn = $('#chordPlaySoundBtn');
    if (playBtn) {
      playBtn.addEventListener('click', playOtherInstrumentSound);
    }

    // Drum Tempo Slider
    const bpmSlider = $('#drumBpmSlider');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        drumBpm = parseInt(e.target.value, 10);
        $('#drumBpmDisplay').textContent = `${drumBpm} BPM`;
        if (drumIsPlaying) {
          const grooveObj = DRUM_GROOVES[otherGroove] || DRUM_GROOVES.rock;
          const variation = grooveObj.variations[otherPatternIndex] || grooveObj.variations[0];
          startDrumSequencer(variation.grid);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // VR PIANO (vrpiano.co.jp) EVENT BINDINGS
    // ────────────────────────────────────────────────────────────────────────

    // 1. Build Roots Bar (12)
    const vrpRootsContainer = $('#vrpRootsBar');
    if (vrpRootsContainer) {
      vrpRootsContainer.innerHTML = VRP_ROOTS.map((r, idx) => `
        <button type="button" class="vrp-root-btn ${idx === vrpRi ? 'active' : ''}" data-ri="${idx}">
          ${r.n}
        </button>
      `).join('');

      vrpRootsContainer.querySelectorAll('.vrp-root-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          vrpRi = parseInt(btn.dataset.ri, 10);
          vrpInv = 0;
          renderVrpFind(true);
        });
      });
    }

    // 2. Build Types Grid (15)
    const vrpTypesContainer = $('#vrpTypesGrid');
    if (vrpTypesContainer) {
      vrpTypesContainer.innerHTML = VRP_TYPES.map((t, idx) => `
        <button type="button" class="vrp-type-btn ${idx === vrpTi ? 'active' : ''}" data-ti="${idx}">
          ${t.lab}
        </button>
      `).join('');

      vrpTypesContainer.querySelectorAll('.vrp-type-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          vrpTi = parseInt(btn.dataset.ti, 10);
          vrpInv = 0;
          renderVrpFind(true);
        });
      });
    }

    // 3. Build Directory Filter Bar (ALL + 12 roots)
    const vrpFilterContainer = $('#vrpDirFilterBar');
    if (vrpFilterContainer) {
      let filterHtml = `<button type="button" class="vrp-dir-filter-pill active" data-filter="ALL">ทั้งหมด (108)</button>`;
      VRP_ROOTS.forEach((r, idx) => {
        filterHtml += `<button type="button" class="vrp-dir-filter-pill" data-filter="${idx}">${r.n}</button>`;
      });
      vrpFilterContainer.innerHTML = filterHtml;

      vrpFilterContainer.querySelectorAll('.vrp-dir-filter-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          renderVrpDirectory(pill.dataset.filter);
        });
      });
    }

    // 4. Initial Render of 108 Chord Directory
    renderVrpDirectory('ALL');

    // 5. Interactive 25-Key Piano Keyboard Click Event
    const vrpKbEl = $('#vrpKeyboard');
    if (vrpKbEl) {
      vrpKbEl.addEventListener('click', (e) => {
        const key = e.target.closest('[data-m]');
        if (!key) return;
        const midi = parseInt(key.getAttribute('data-m'), 10);
        if (isNaN(midi)) return;

        if (vrpMode === 'find') {
          playVrpAudio([midi], false);
        } else {
          const idx = vrpSelMidis.indexOf(midi);
          if (idx >= 0) {
            vrpSelMidis.splice(idx, 1);
          } else {
            vrpSelMidis.push(midi);
          }
          vrpSelMidis.sort((a, b) => a - b);
          playVrpAudio([midi], false);
          renderVrpId();
        }
      });
    }

    // 6. Mode Switcher (Find vs ID)
    const vrpFindBtn = $('#vrpModeFind');
    const vrpIdBtn = $('#vrpModeId');
    if (vrpFindBtn) vrpFindBtn.addEventListener('click', () => setVrpMode('find'));
    if (vrpIdBtn) vrpIdBtn.addEventListener('click', () => setVrpMode('id'));

    // 7. Action Bar Buttons (Play, Invert, Clear)
    const vrpPlayBtn = $('#vrpPlayBtn');
    if (vrpPlayBtn) {
      vrpPlayBtn.addEventListener('click', () => {
        if (vrpMode === 'find') {
          const ms = vrpChordMidi(vrpRi, vrpTi, vrpInv);
          playVrpAudio(ms, false);
        } else if (vrpSelMidis.length > 0) {
          playVrpAudio(vrpSelMidis.slice(), false);
        }
      });
    }

    const vrpInvertBtn = $('#vrpInvertBtn');
    if (vrpInvertBtn) {
      vrpInvertBtn.addEventListener('click', () => {
        if (vrpMode !== 'find') return;
        vrpInv = (vrpInv + 1) % VRP_TYPES[vrpTi].iv.length;
        renderVrpFind(true);
      });
    }

    const vrpClearBtn = $('#vrpClearBtn');
    if (vrpClearBtn) {
      vrpClearBtn.addEventListener('click', () => {
        vrpSelMidis = [];
        renderVrpId();
      });
    }

    // 8. Sound Controls (Volume Slider & Timbre Select)
    const vrpVol = $('#vrpVolSlider');
    if (vrpVol) {
      vrpVol.addEventListener('input', (e) => {
        vrpVolume = parseInt(e.target.value, 10) / 100;
      });
    }

    const vrpTimbreSelect = $('#vrpTimbreSelect');
    if (vrpTimbreSelect) {
      vrpTimbreSelect.addEventListener('change', (e) => {
        vrpTimbre = e.target.value;
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // UKULELE PRO EVENT BINDINGS
    // ────────────────────────────────────────────────────────────────────────

    // 1. Ukulele Root Bar Buttons (12 roots)
    $$('#ukeRootBar .uke-root-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ukeRoot = btn.dataset.root;
        ukePosIndex = 0;
        renderUkuleleView();
        playUkuleleSound(ukeCurrentPositions[0]);
      });
    });

    // 2. Ukulele Qualities Buttons (14 qualities)
    $$('#ukeQualitiesGrid .uke-q-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ukeQuality = btn.dataset.q;
        ukePosIndex = 0;
        renderUkuleleView();
        playUkuleleSound(ukeCurrentPositions[0]);
      });
    });

    // 3. Ukulele Sound Play Button
    const ukePlayBtn = $('#ukePlaySoundBtn');
    if (ukePlayBtn) {
      ukePlayBtn.addEventListener('click', () => {
        const activePos = ukeCurrentPositions[ukePosIndex] || ukeCurrentPositions[0];
        if (activePos) playUkuleleSound(activePos);
      });
    }

    // 4. Ukulele Volume Slider
    const ukeVol = $('#ukeVolSlider');
    if (ukeVol) {
      ukeVol.addEventListener('input', (e) => {
        ukeVolume = parseInt(e.target.value, 10) / 100;
      });
    }

    // 5. Ukulele Strum Style Select
    const ukeStrumSel = $('#ukeStrumSelect');
    if (ukeStrumSel) {
      ukeStrumSel.addEventListener('change', (e) => {
        ukeStrumStyle = e.target.value;
      });
    }

    // 6. Ukulele Interactive Fretboard Note Plucking
    const ukeFretboardEl = $('#ukeFretboardWrap');
    if (ukeFretboardEl) {
      ukeFretboardEl.addEventListener('click', (e) => {
        const target = e.target.closest('[data-uke-str]');
        if (!target) return;
        const strIdx = parseInt(target.getAttribute('data-uke-str'), 10);
        const fret = parseInt(target.getAttribute('data-uke-fret'), 10);
        if (!isNaN(strIdx) && !isNaN(fret)) {
          playSingleUkuleleNote(strIdx, fret);
        }
      });
    }

    // 7. Build Ukulele Directory Filter Bar (ALL + 12 roots)
    const ukeFilterContainer = $('#ukeDirFilterBar');
    if (ukeFilterContainer) {
      let filterHtml = `<button type="button" class="uke-dir-filter-pill active" data-filter="ALL">ทั้งหมด (48 คอร์ดยอดนิยม)</button>`;
      UKE_ROOTS.forEach((r) => {
        filterHtml += `<button type="button" class="uke-dir-filter-pill" data-filter="${r}">${r}</button>`;
      });
      ukeFilterContainer.innerHTML = filterHtml;

      ukeFilterContainer.querySelectorAll('.uke-dir-filter-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          renderUkuleleDirectory(pill.dataset.filter);
        });
      });
    }

    // 8. Initial Render of Ukulele Directory & View
    renderUkuleleDirectory('ALL');
    renderUkuleleView();

    // 9. Window Resize: Adjust Keyboard Key Dimensions
    window.addEventListener('resize', () => {
      if (selectedInstrument === 'piano' || selectedInstrument === 'keyboard') {
        renderVrPianoView();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
