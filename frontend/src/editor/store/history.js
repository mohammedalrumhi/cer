/**
 * Command history over immutable documents.
 *
 * A command records the document before and after one user intent. Documents are immutable
 * and share structure (unchanged elements keep their object identity), so storing both ends of
 * every command is cheap even with hundreds of steps.
 *
 * @typedef {object} Command
 * @property {string} label           human-readable (Arabic) name, e.g. for a history panel
 * @property {object} before          document before the command
 * @property {object} after           document after the command
 * @property {string[]} selectionBefore
 * @property {string[]} selectionAfter
 * @property {string|null} coalesceKey consecutive commands with the same key merge into one
 * @property {number} time            ms timestamp of the latest merge
 *
 * @typedef {{ past: Command[], future: Command[], sealed: boolean }} History
 */

export const HISTORY_LIMIT = 200;

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
}

/** Value equality for documents one level into `elements` (what commands actually change). */
export function documentsEquivalent(a, b) {
  if (a === b) return true;
  const { elements: ea, ...restA } = a;
  const { elements: eb, ...restB } = b;
  if (!shallowEqual(restA, restB) || ea.length !== eb.length) return false;
  return ea.every((element, index) => shallowEqual(element, eb[index]));
}

export const COALESCE_WINDOW_MS = 1000;

/** @returns {History} */
export function createHistory() {
  return { past: [], future: [], sealed: false };
}

/**
 * Push a command, merging it into the previous one when it continues the same gesture
 * (same coalesceKey, within the window, and history not sealed since).
 * @param {History} history
 * @param {Command} command
 * @returns {History}
 */
export function pushCommand(history, command, { limit = HISTORY_LIMIT, windowMs = COALESCE_WINDOW_MS } = {}) {
  if (command.before === command.after) return history;

  const last = history.past[history.past.length - 1];
  const canMerge = last
    && !history.sealed
    && command.coalesceKey
    && last.coalesceKey === command.coalesceKey
    && command.time - last.time <= windowMs;

  if (canMerge) {
    const merged = { ...last, after: command.after, selectionAfter: command.selectionAfter, time: command.time };
    // A merge that returns to the starting point is a no-op; drop it entirely.
    const past = documentsEquivalent(merged.before, merged.after)
      ? history.past.slice(0, -1)
      : [...history.past.slice(0, -1), merged];
    return { past, future: [], sealed: false };
  }

  const past = [...history.past, command];
  return { past: past.length > limit ? past.slice(past.length - limit) : past, future: [], sealed: false };
}

/** Ends the current coalescing run (e.g. on input blur or pointer up). */
export function sealHistory(history) {
  return history.sealed ? history : { ...history, sealed: true };
}

/** @returns {{ history: History, command: Command } | null} */
export function undoCommand(history) {
  const command = history.past[history.past.length - 1];
  if (!command) return null;
  return {
    command,
    history: { past: history.past.slice(0, -1), future: [command, ...history.future], sealed: true },
  };
}

/** @returns {{ history: History, command: Command } | null} */
export function redoCommand(history) {
  const [command, ...future] = history.future;
  if (!command) return null;
  return {
    command,
    history: { past: [...history.past, command], future, sealed: true },
  };
}
