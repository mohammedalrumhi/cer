import { create } from 'zustand';

/**
 * Autosave (port of Lawha's): saves 1 s after the last edit, retries failures with back-off, and
 * stops on a 409 conflict until the user chooses. Status drives the top-bar pill.
 * @typedef {'saved'|'pending'|'saving'|'error'|'conflict'} SaveStatus
 */
export const useSaveStatus = create(() => ({ status: 'saved', lastSavedAt: null, conflictVersion: null }));

const setStatus = (status, extra = {}) => useSaveStatus.setState({ status, ...extra });

/**
 * @param {import('zustand').StoreApi<any>} store editor store
 * @param {{ save: (doc: object, baseVersion: number) => Promise<object>, delay?: number, retryDelay?: number }} options
 */
export function startAutosave(store, { save, delay = 1000, retryDelay = 5000 }) {
  let timer;
  let inFlight = null;
  let stopped = false;
  let retries = 0;
  setStatus('saved', { conflictVersion: null });

  const schedule = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => { run(); }, ms);
  };

  async function run() {
    clearTimeout(timer);
    while (inFlight) await inFlight;
    if (stopped || useSaveStatus.getState().status === 'conflict') return;
    const state = store.getState();
    if (state.transaction) {
      schedule(delay); // mid-gesture: wait for the drag to finish
      return;
    }
    const document = state.document;
    if (document === state.savedDocument) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    inFlight = save(document, state.serverVersion)
      .then((saved) => {
        retries = 0;
        store.getState().markSaved(document, Number(saved?.version) || state.serverVersion + 1);
        if (store.getState().document !== document) {
          setStatus('pending');
          schedule(delay);
        } else {
          setStatus('saved', { lastSavedAt: Date.now() });
        }
      })
      .catch((error) => {
        if (error?.conflict) {
          setStatus('conflict', { conflictVersion: error.currentVersion ?? null });
        } else {
          setStatus('error');
          retries += 1;
          if (!stopped) schedule(Math.min(60000, retryDelay * retries));
        }
      })
      .finally(() => { inFlight = null; });
    await inFlight;
  }

  const unsubscribe = store.subscribe((state, prev) => {
    if (stopped || state.document === prev.document) return;
    if (state.document === state.savedDocument) return;
    if (useSaveStatus.getState().status === 'conflict') return;
    if (useSaveStatus.getState().status !== 'saving') setStatus('pending');
    schedule(delay);
  });

  return {
    flush: run,
    /** Overwrite the server copy after a conflict ("keep my changes"). */
    async keepMine() {
      const { conflictVersion } = useSaveStatus.getState();
      if (conflictVersion) store.getState().setServerVersion(conflictVersion);
      setStatus('pending', { conflictVersion: null });
      await run();
    },
    isDirty: () => store.getState().document !== store.getState().savedDocument,
    stop() {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
    },
  };
}
