/**
 * client/thai-tokenizer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thai Syllable & Word Tokenizer Engine for Teleprompter & Karaoke Highlighting
 *
 * Problem it solves:
 * Thai script has no spaces between words. Standard tokenizers lump entire
 * phrases into single unbreakable blocks. This engine combines `Intl.Segmenter`
 * with Thai vowel/tone mark cluster rules to break words into distinct syllables
 * and interpolates timestamp intervals smoothly across the word.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// Thai leading vowels (สระหน้า): เ, แ, โ, ใ, ไ
const LEADING_VOWELS = new Set(['\u0e40', '\u0e41', '\u0e42', '\u0e43', '\u0e44']);

// Thai consonants (พยัญชนะ): ก - ฮ
const isThaiConsonant = (ch) => ch >= '\u0e01' && ch <= '\u0e2e';

// Thai vowels & marks (สระบน/ล่าง, วรรณยุกต์, ทัณฑฆาต)
const isThaiMarkOrVowel = (ch) => (ch >= '\u0e30' && ch <= '\u0e3a') || (ch >= '\u0e47' && ch <= '\u0e4e');

class ThaiTokenizer {
  constructor() {
    this.hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
    if (this.hasSegmenter) {
      try {
        this.segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      } catch (_) {
        this.hasSegmenter = false;
      }
    }
  }

  /**
   * Split a Thai text sentence into words.
   * @param {string} text
   * @returns {string[]}
   */
  tokenize(text) {
    return this.tokenizeWords(text);
  }

  tokenizeWords(text) {
    if (!text) return [];
    if (this.hasSegmenter && this.segmenter) {
      return Array.from(this.segmenter.segment(text))
        .map(s => s.segment.trim())
        .filter(s => s.length > 0);
    }
    // Fallback: split on whitespace
    return text.split(/\s+/).filter(Boolean);
  }

  /**
   * Split a Thai word into distinct phoneme/syllable clusters.
   * @param {string} word
   * @returns {string[]}
   */
  tokenizeSyllables(word) {
    if (!word || word.length <= 1) return [word];

    const syllables = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const nextChar = word[i + 1] || '';

      // If we see a leading vowel (เ, แ, โ, ใ, ไ) and already have content, split previous syllable
      if (LEADING_VOWELS.has(char) && current.length > 0) {
        syllables.push(current);
        current = char;
        continue;
      }

      current += char;

      // End of word or syllable boundary heuristic:
      // A consonant followed by a leading vowel or vowel separator
      if (isThaiConsonant(char) && LEADING_VOWELS.has(nextChar)) {
        syllables.push(current);
        current = '';
      }
    }

    if (current.length > 0) {
      syllables.push(current);
    }

    return syllables.length > 0 ? syllables : [word];
  }

  /**
   * Align lyric segment with syllable-accurate timestamps.
   * @param {string} text - Full lyric line
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {Array<{ text: string, start: number, end: number, isWord: boolean }>}
   */
  createTimedSyllables(text, startTime, endTime) {
    const words = this.tokenizeWords(text);
    if (words.length === 0) return [];

    const totalDuration = Math.max(0.2, endTime - startTime);
    const totalChars = words.reduce((acc, w) => acc + w.length, 0) || 1;

    const result = [];
    let curTime = startTime;

    for (const w of words) {
      const syllables = this.tokenizeSyllables(w);
      const wordChars = w.length;
      const wordDuration = (wordChars / totalChars) * totalDuration;
      const sylDuration = wordDuration / syllables.length;

      for (let sIdx = 0; sIdx < syllables.length; sIdx++) {
        const sylText = syllables[sIdx];
        const sStart = curTime;
        const sEnd = curTime + sylDuration;
        curTime = sEnd;

        result.push({
          text: sylText,
          start: Math.round(sStart * 100) / 100,
          end: Math.round(sEnd * 100) / 100,
          isWord: sIdx === 0
        });
      }
    }

    return result;
  }
}

const thaiTokenizer = new ThaiTokenizer();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThaiTokenizer, thaiTokenizer };
} else if (typeof window !== 'undefined') {
  window.ThaiTokenizer = { ThaiTokenizer, thaiTokenizer };
  window.thaiTokenizer = thaiTokenizer;
}
