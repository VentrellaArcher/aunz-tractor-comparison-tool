import test from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARDING_KEY, SESSION_KEY, buildShareUrl, decodeState, encodeState, readPreference, readSessionState, writePreference, writeSessionState } from '../src/js/url-state.js';
import { createInitialState } from '../src/js/state.js';
import { fleet } from './fixtures/fleet.js';

function fullState() {
  const state = createInitialState();
  state.selectedMachineId = 'jd-8r-340-2025-au';
  state.relationshipPercentage = 20;
  state.filters = { search: '', manufacturer: ['John Deere', 'New Holland'], modelYear: ['2025'], transmission: ['CVT / IVT / EVT'], topSpeed: '40', cylinders: ['6'], rearPto: ['1000'] };
  state.results = { sort: 'max_hp-desc', brands: ['Fendt'], columns: 'all' };
  state.comparison = { machineIds: ['jd-8r-340-2025-au', 'nh-t8-410-2024-us', 'fendt-942-2025-au'], message: null };
  state.view = { differencesOnly: true, showEmpty: true };
  return state;
}

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => { store.set(key, String(value)); }, removeItem: (key) => { store.delete(key); }, store };
}

test('a fresh state encodes to nothing so the address stays clean', () => {
  assert.equal(encodeState(createInitialState()), '');
  assert.equal(decodeState('', fleet).hasState, false);
});

test('every part of the state survives an encode and decode round trip', () => {
  const state = fullState();
  const decoded = decodeState(encodeState(state), fleet);
  assert.equal(decoded.hasState, true);
  assert.deepEqual(decoded.notices, []);
  assert.deepEqual(decoded.state, state);
});

test('encoding is readable, deterministic and free of plus-encoded spaces', () => {
  const text = encodeState(fullState());
  assert.match(text, /^m=jd-8r-340-2025-au&c=jd-8r-340-2025-au,nh-t8-410-2024-us,fendt-942-2025-au&band=20&/);
  assert.match(text, /mf=John%20Deere&mf=New%20Holland/);
  assert.doesNotMatch(text, /\+/);
  assert.equal(text, encodeState(fullState()));
});

test('search text is preserved, trimmed and length limited', () => {
  const state = createInitialState();
  state.filters.search = '  8R 340  ';
  assert.equal(encodeState(state), 'q=8R%20340');
  assert.equal(decodeState('q=8R%20340', fleet).state.filters.search, '8R 340');
  assert.equal(decodeState(`q=${'x'.repeat(200)}`, fleet).state.filters.search.length, 80);
});

test('machines that left the catalogue are skipped with a clear notice', () => {
  const decoded = decodeState('m=gone-machine&c=jd-8r-340-2025-au,gone-machine,fendt-942-2025-au', fleet);
  assert.equal(decoded.state.selectedMachineId, '');
  assert.deepEqual(decoded.state.comparison.machineIds, ['jd-8r-340-2025-au', 'fendt-942-2025-au']);
  assert.equal(decoded.notices.length, 2);
  assert.match(decoded.notices.join(' '), /primary machine/);
  assert.match(decoded.notices.join(' '), /1 compared machine is no longer/);
});

test('comparison IDs are de-duplicated and capped at four', () => {
  const ids = ['jd-8r-340-2025-au', 'jd-8r-340-2025-au', 'jd-8rt-340-2025-au', 'nh-t8-410-2024-us', 'fendt-942-2025-au', 'mf-8s-265-2023-au'];
  const decoded = decodeState(`c=${ids.join(',')}`, fleet);
  assert.deepEqual(decoded.state.comparison.machineIds, ['jd-8r-340-2025-au', 'jd-8rt-340-2025-au', 'nh-t8-410-2024-us', 'fendt-942-2025-au']);
});

test('duplicates, the four-machine cap and retired machines are each explained accurately', () => {
  const duplicates = decodeState('c=jd-8r-340-2025-au,jd-8r-340-2025-au,jd-8rt-340-2025-au', fleet);
  assert.deepEqual(duplicates.notices, [], 'a repeated machine collapses quietly');

  const capped = decodeState('c=jd-8r-340-2025-au,jd-8rt-340-2025-au,nh-t8-410-2024-us,fendt-942-2025-au,mf-8s-265-2023-au', fleet);
  assert.equal(capped.notices.length, 1);
  assert.match(capped.notices[0], /limited to 4 machines, so 1 more was not restored/);
  assert.doesNotMatch(capped.notices[0], /no longer in the catalogue/, 'a valid machine is not called retired');

  const mixed = decodeState('c=gone-1,gone-2,jd-8r-340-2025-au', fleet);
  assert.match(mixed.notices[0], /^2 compared machines are no longer in the catalogue and were skipped\.$/);
});

test('an empty primary machine parameter means no machine rather than a retired one', () => {
  const decoded = decodeState('m=&c=jd-8r-340-2025-au', fleet);
  assert.deepEqual(decoded.notices, []);
  assert.equal(decoded.state.selectedMachineId, '');
});

test('control characters in search text become spaces instead of reaching the interface', () => {
  const decoded = decodeState('q=%008r%09340%0A&m=jd-8r-340-2025-au', fleet);
  assert.equal(decoded.state.filters.search, '8r 340');
  assert.doesNotMatch(decodeState('q=%00%00', fleet).state.filters.search, /[\u0000-\u001f]/);
});

test('unknown filter values, bands, sorts and columns fall back to safe defaults', () => {
  const decoded = decodeState('band=13&mf=Nobody&mf=Fendt&yr=1999&ts=45&sort=price-asc&cols=everything&brand=Nobody&diff=yes&empty=1', fleet);
  assert.equal(decoded.state.relationshipPercentage, 10);
  assert.deepEqual(decoded.state.filters.manufacturer, ['Fendt']);
  assert.deepEqual(decoded.state.filters.modelYear, []);
  assert.equal(decoded.state.filters.topSpeed, '');
  assert.equal(decoded.state.results.sort, 'closest');
  assert.equal(decoded.state.results.columns, 'key');
  assert.deepEqual(decoded.state.results.brands, []);
  assert.equal(decoded.state.view.differencesOnly, false);
  assert.equal(decoded.state.view.showEmpty, true);
  assert.match(decoded.notices.join(' '), /filters in this link no longer apply/);
});

test('unrelated query parameters and anchors are ignored', () => {
  const decoded = decodeState('?utm_source=mail&fbclid=1', fleet);
  assert.equal(decoded.hasState, false);
  assert.deepEqual(decoded.state, createInitialState());
  assert.equal(decodeState('#comparison-heading', fleet).hasState, false);
});

test('hostile values are treated as plain text and never widen what is applied', () => {
  const decoded = decodeState('m=<script>alert(1)</script>&mf=%3Cimg%20src%3Dx%3E&c=../../etc/passwd', fleet);
  assert.equal(decoded.state.selectedMachineId, '');
  assert.deepEqual(decoded.state.filters.manufacturer, []);
  assert.deepEqual(decoded.state.comparison.machineIds, []);
});

test('share links keep the page path, carry state in the query and drop in-page anchors', () => {
  const url = buildShareUrl('https://example.github.io/aunz-tractor-comparison-tool/?c=old#comparison-heading', fullState());
  assert.match(url, /^https:\/\/example\.github\.io\/aunz-tractor-comparison-tool\/\?m=jd-8r-340-2025-au/);
  assert.equal(new URL(url).hash, '');
  assert.equal(buildShareUrl('http://localhost:4173/', createInitialState()), 'http://localhost:4173/');
});

test('session storage restores a saved selection and clears itself when nothing is selected', () => {
  const storage = memoryStorage();
  writeSessionState(storage, fullState());
  assert.ok(storage.store.has(SESSION_KEY));
  const restored = readSessionState(storage, fleet);
  assert.deepEqual(restored.state, fullState());
  writeSessionState(storage, createInitialState());
  assert.equal(storage.store.has(SESSION_KEY), false);
  assert.equal(readSessionState(storage, fleet), null);
});

test('session restore validates against the current catalogue', () => {
  const storage = memoryStorage({ [SESSION_KEY]: 'c=jd-8r-340-2025-au,retired-model' });
  const restored = readSessionState(storage, fleet);
  assert.deepEqual(restored.state.comparison.machineIds, ['jd-8r-340-2025-au']);
  assert.equal(restored.notices.length, 1);
});

test('unavailable or throwing storage never breaks the tool', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(readSessionState(broken, fleet), null);
  assert.doesNotThrow(() => writeSessionState(broken, fullState()));
  assert.equal(readSessionState(undefined, fleet), null);
  assert.equal(readPreference(broken, ONBOARDING_KEY), false);
  assert.doesNotThrow(() => writePreference(broken, ONBOARDING_KEY, true));
});

test('preferences round trip through storage', () => {
  const storage = memoryStorage();
  assert.equal(readPreference(storage, ONBOARDING_KEY), false);
  writePreference(storage, ONBOARDING_KEY, true);
  assert.equal(readPreference(storage, ONBOARDING_KEY), true);
  writePreference(storage, ONBOARDING_KEY, false);
  assert.equal(readPreference(storage, ONBOARDING_KEY), false);
});
