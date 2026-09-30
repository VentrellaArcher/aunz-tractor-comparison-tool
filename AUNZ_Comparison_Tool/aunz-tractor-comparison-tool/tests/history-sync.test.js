import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistorySync } from '../src/js/history-sync.js';
import { createInitialState } from '../src/js/state.js';

const PATH = '/aunz-tractor-comparison-tool/';

function stateWith(patch = {}) {
  const state = createInitialState();
  return { ...state, ...patch, results: { ...state.results, ...(patch.results ?? {}) } };
}

// A window whose timers only run when the test says so, so the debounce window can be reproduced exactly.
function fakeWindow(search = '') {
  const writes = [];
  const timers = new Map();
  let next = 1;
  const win = {
    writes,
    location: { pathname: PATH, search },
    history: {
      pushState: (_state, _title, url) => { writes.push(['push', url]); win.location.search = url.includes('?') ? url.slice(url.indexOf('?')) : ''; },
      replaceState: (_state, _title, url) => { writes.push(['replace', url]); win.location.search = url.includes('?') ? url.slice(url.indexOf('?')) : ''; }
    },
    setTimeout: (callback) => { const id = next; next += 1; timers.set(id, callback); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    pendingTimers: () => timers.size,
    runTimers: () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } }
  };
  return win;
}

function memoryStorage() {
  const store = new Map();
  return { store, getItem: (key) => store.get(key) ?? null, setItem: (key, value) => { store.set(key, String(value)); }, removeItem: (key) => { store.delete(key); } };
}

test('a replace is held back briefly, then written once to the current history entry', () => {
  const win = fakeWindow('?m=a');
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a', results: { columns: 'all' } }), 'replace');
  assert.deepEqual(win.writes, []);
  win.runTimers();
  assert.deepEqual(win.writes, [['replace', `${PATH}?m=a&cols=all`]]);
});

test('a newer state supersedes an older write that is still waiting', () => {
  const win = fakeWindow();
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'replace');
  sync.persist(stateWith({ selectedMachineId: 'b' }), 'replace');
  assert.equal(win.pendingTimers(), 1);
  win.runTimers();
  assert.deepEqual(win.writes, [['replace', `${PATH}?m=b`]]);
});

test('going back within the pause cannot let a stale write overwrite the address the browser restored', () => {
  const win = fakeWindow('?m=a&band=15');
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a', relationshipPercentage: 15, results: { columns: 'all' } }), 'replace');
  // The browser restores the previous entry, and the app applies it without writing to history.
  win.location.search = '?m=a';
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'none');
  win.runTimers();
  assert.deepEqual(win.writes, [], 'nothing is written after the restore');
  assert.equal(win.location.search, '?m=a');
});

test('undoing a change inside the pause leaves the address alone', () => {
  const win = fakeWindow('?m=a');
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a', results: { columns: 'all' } }), 'replace');
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'replace');
  assert.equal(win.pendingTimers(), 0, 'the earlier write was dropped because the address already matches');
  win.runTimers();
  assert.deepEqual(win.writes, []);
});

test('a push is written immediately and replaces anything still waiting', () => {
  const win = fakeWindow();
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'replace');
  sync.persist(stateWith({ selectedMachineId: 'a', relationshipPercentage: 20 }), 'push');
  win.runTimers();
  assert.deepEqual(win.writes, [['push', `${PATH}?m=a&band=20`]]);
});

test('an empty state returns to the bare page address and a repeat of the same address writes nothing', () => {
  const win = fakeWindow('?m=a');
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(createInitialState(), 'push');
  assert.deepEqual(win.writes, [['push', PATH]]);
  sync.persist(createInitialState(), 'push');
  assert.equal(win.writes.length, 1);
});

test('the session copy follows every state, even when the address is left alone', () => {
  const win = fakeWindow();
  const storage = memoryStorage();
  const sync = createHistorySync({ win, storage });
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'none');
  assert.match([...storage.store.values()][0], /m=a/);
  sync.persist(createInitialState(), 'none');
  assert.equal(storage.store.size, 0, 'an empty state clears the session copy');
});

test('a browser that refuses history updates does not break the tool', () => {
  const win = fakeWindow();
  win.history.pushState = () => { throw new DOMException('rate limited', 'SecurityError'); };
  const sync = createHistorySync({ win, storage: memoryStorage() });
  assert.doesNotThrow(() => sync.persist(stateWith({ selectedMachineId: 'a' }), 'push'));
});

test('pending writes can be cancelled explicitly', () => {
  const win = fakeWindow();
  const sync = createHistorySync({ win, storage: memoryStorage() });
  sync.persist(stateWith({ selectedMachineId: 'a' }), 'replace');
  sync.cancelPending();
  win.runTimers();
  assert.deepEqual(win.writes, []);
});
