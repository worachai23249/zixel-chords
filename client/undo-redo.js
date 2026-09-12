/**
 * client/undo-redo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command Pattern Undo/Redo Transaction Manager for Chord Review & Studio Edit
 *
 * Capabilities:
 * - Full multi-level Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
 * - Atomic Command Pattern: Every edit is encapsulated in an executable Command
 * - Auto-caps stack depth (default 50 steps) to preserve memory
 * - Dispatches state changes for UI button activation
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

class Command {
  execute() { throw new Error('execute() must be implemented'); }
  undo() { throw new Error('undo() must be implemented'); }
}

/**
 * Command for changing a chord at a single beat index.
 */
class ChangeChordCommand extends Command {
  constructor(target, p2, p3, p4, p5) {
    super();
    if (typeof p2 === 'number') {
      // (songState, beatIndex, oldChord, newChord, onUpdate)
      this.songState = target;
      this.beatIndex = p2;
      this.targetBeat = (target.beats && target.beats[p2]) ? target.beats[p2] : null;
      this.oldChord = p3;
      this.newChord = p4;
      this.onUpdate = p5;
    } else {
      // (beat, oldChord, newChord, onUpdate)
      this.songState = null;
      this.beatIndex = -1;
      this.targetBeat = target;
      this.oldChord = p2;
      this.newChord = p3;
      this.onUpdate = p4;
    }
  }

  execute() {
    if (this.targetBeat) {
      this.targetBeat.chord = this.newChord;
      if (typeof this.onUpdate === 'function') {
        this.onUpdate(this.newChord, this.beatIndex);
      }
    }
  }

  undo() {
    if (this.targetBeat) {
      this.targetBeat.chord = this.oldChord;
      if (typeof this.onUpdate === 'function') {
        this.onUpdate(this.oldChord, this.beatIndex);
      }
    }
  }
}

/**
 * Transaction Stack Manager
 */
class UndoManager {
  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
    this._notify();
  }

  undo() {
    if (!this.canUndo()) return false;
    const cmd = this.undoStack.pop();
    cmd.undo();
    this.redoStack.push(cmd);
    this._notify();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    const cmd = this.redoStack.pop();
    cmd.execute();
    this.undoStack.push(cmd);
    this._notify();
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this._notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const fn of this.listeners) {
      try { fn({ canUndo: this.canUndo(), canRedo: this.canRedo() }); } catch (_) {}
    }
  }

  /**
   * Bind global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
   */
  bindKeyboardShortcuts(target = window) {
    if (!target || typeof target.addEventListener !== 'function') return;

    target.addEventListener('keydown', (e) => {
      // Ignore if user is typing inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        this.redo();
      }
    });
  }
}

const undoManager = new UndoManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Command, ChangeChordCommand, UndoManager, undoManager };
} else if (typeof window !== 'undefined') {
  window.ZixelUndo = { Command, ChangeChordCommand, UndoManager, undoManager };
  window.undoManager = undoManager;
  window.ChangeChordCommand = ChangeChordCommand;
}
