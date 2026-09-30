import { encodeState, writeSessionState } from './url-state.js';

// Keeps the address bar and session copy in step with the state. Only the newest state may reach the
// address bar, so every call drops any older write that is still waiting on the debounce timer.
export function createHistorySync({ win = globalThis.window, storage, delay = 300 } = {}) {
  let timer = 0;
  const cancelPending = () => {
    win.clearTimeout(timer);
    timer = 0;
  };

  return {
    cancelPending,
    // mode: "push" adds a history entry, "replace" updates the current one after a short pause, "none" only saves the session copy.
    persist(state, mode) {
      writeSessionState(storage, state);
      cancelPending();
      if (mode === 'none') return;
      const query = encodeState(state);
      if (query === win.location.search.replace(/^\?/, '')) return;
      const write = () => {
        const url = `${win.location.pathname}${query ? `?${query}` : ''}`;
        try {
          win.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
        } catch {
          // Some browsers rate-limit or block history updates; the tool keeps working without them.
        }
      };
      if (mode === 'push') write();
      else timer = win.setTimeout(write, delay);
    }
  };
}
