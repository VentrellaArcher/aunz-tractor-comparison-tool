import { getFilterOptions } from './filters.js';
import { RELATIONSHIP_PERCENTAGES } from './relationships.js';
import { MAX_COMPARISON_MACHINES, restoreComparisonIds } from './comparison.js';
import { RESULT_COLUMN_MODES, isKnownSort } from './results-model.js';
import { DEFAULT_RELATIONSHIP_PERCENTAGE, createInitialState } from './state.js';

export const SESSION_KEY = 'aunz-tcm:state:v1';
export const ONBOARDING_KEY = 'aunz-tcm:onboarding-dismissed';

const MAX_TEXT_LENGTH = 80;
const MAX_VALUES = 40;

const FILTER_PARAMS = [
  { key: 'manufacturer', param: 'mf', options: 'manufacturers' },
  { key: 'modelYear', param: 'yr', options: 'modelYears' },
  { key: 'transmission', param: 'tx', options: 'transmission' },
  { key: 'cylinders', param: 'cy', options: 'cylinders' },
  { key: 'rearPto', param: 'pto', options: 'rearPto' }
];

const KNOWN_PARAMS = ['m', 'c', 'band', 'q', 'ts', 'sort', 'brand', 'cols', 'diff', 'empty', ...FILTER_PARAMS.map((entry) => entry.param)];

// Serialises only what differs from the defaults, so a fresh session produces an empty string.
export function encodeState(state) {
  const params = new URLSearchParams();
  if (state.selectedMachineId) params.set('m', state.selectedMachineId);
  if (state.comparison.machineIds.length > 0) params.set('c', state.comparison.machineIds.join(','));
  if (state.relationshipPercentage !== DEFAULT_RELATIONSHIP_PERCENTAGE) params.set('band', String(state.relationshipPercentage));
  if (state.filters.search.trim()) params.set('q', state.filters.search.trim());
  for (const { key, param } of FILTER_PARAMS) {
    for (const value of state.filters[key]) params.append(param, value);
  }
  if (state.filters.topSpeed) params.set('ts', String(state.filters.topSpeed));
  if (state.results.sort !== 'closest') params.set('sort', state.results.sort);
  for (const brand of state.results.brands) params.append('brand', brand);
  if (state.results.columns !== 'key') params.set('cols', state.results.columns);
  if (state.view.differencesOnly) params.set('diff', '1');
  if (state.view.showEmpty) params.set('empty', '1');
  return params.toString().replace(/\+/g, '%20').replace(/%2C/gi, ',');
}

function cleanValues(values, allowed) {
  const wanted = values.slice(0, MAX_VALUES).filter((value) => value.length <= MAX_TEXT_LENGTH);
  const valid = [...new Set(wanted.filter((value) => allowed.includes(value)))];
  return { valid, dropped: values.length - valid.length };
}

// Validates everything against the live catalogue, so stale or hand-edited links degrade safely.
export function decodeState(query, machines) {
  const params = new URLSearchParams(String(query ?? '').replace(/^[?#]/, ''));
  const state = createInitialState();
  const notices = [];
  const hasState = KNOWN_PARAMS.some((name) => params.has(name));
  if (!hasState) return { state, notices, hasState };

  const options = getFilterOptions(machines);
  const known = new Set(machines.map((machine) => machine.machine_id));
  let droppedFilters = 0;

  const primary = params.get('m');
  if (primary) {
    if (known.has(primary)) state.selectedMachineId = primary;
    else notices.push('The primary machine in this link is no longer in the catalogue.');
  }

  const compared = params.get('c');
  if (compared !== null) {
    const restored = restoreComparisonIds(compared.split(',').filter(Boolean).slice(0, MAX_VALUES), machines);
    state.comparison = restored.state;
    if (restored.missing > 0) notices.push(`${restored.missing} compared machine${restored.missing === 1 ? ' is' : 's are'} no longer in the catalogue and ${restored.missing === 1 ? 'was' : 'were'} skipped.`);
    if (restored.overflow > 0) notices.push(`Comparison is limited to ${MAX_COMPARISON_MACHINES} machines, so ${restored.overflow} more ${restored.overflow === 1 ? 'was' : 'were'} not restored.`);
  }

  const band = Number(params.get('band'));
  if (params.has('band') && RELATIONSHIP_PERCENTAGES.includes(band)) state.relationshipPercentage = band;

  const search = params.get('q');
  if (search !== null) state.filters.search = search.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);

  for (const { key, param, options: optionKey } of FILTER_PARAMS) {
    const { valid, dropped } = cleanValues(params.getAll(param), options[optionKey]);
    state.filters[key] = valid;
    droppedFilters += dropped;
  }

  const topSpeed = params.get('ts');
  if (topSpeed !== null) {
    if (options.topSpeed.includes(topSpeed)) state.filters.topSpeed = topSpeed;
    else droppedFilters += 1;
  }
  if (droppedFilters > 0) notices.push('Some filters in this link no longer apply and were ignored.');

  const sort = params.get('sort');
  if (sort !== null && isKnownSort(sort)) state.results.sort = sort;
  state.results.brands = cleanValues(params.getAll('brand'), options.manufacturers).valid;
  const columns = params.get('cols');
  if (columns !== null && RESULT_COLUMN_MODES.includes(columns)) state.results.columns = columns;

  state.view.differencesOnly = params.get('diff') === '1';
  state.view.showEmpty = params.get('empty') === '1';
  return { state, notices, hasState };
}

// Canonical shareable address: same page, state in the query string, no in-page anchor.
export function buildShareUrl(currentHref, state) {
  const url = new URL(currentHref);
  url.search = encodeState(state);
  url.hash = '';
  return url.toString();
}

export function readSessionState(storage, machines) {
  try {
    const text = storage?.getItem(SESSION_KEY);
    if (!text) return null;
    const decoded = decodeState(text, machines);
    return decoded.hasState ? decoded : null;
  } catch {
    return null;
  }
}

export function writeSessionState(storage, state) {
  try {
    const text = encodeState(state);
    if (text) storage.setItem(SESSION_KEY, text);
    else storage.removeItem(SESSION_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked); the tool works without it.
  }
}

export function readPreference(storage, key) {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writePreference(storage, key, enabled) {
  try {
    if (enabled) storage.setItem(key, '1');
    else storage.removeItem(key);
  } catch {
    // Preference is optional.
  }
}
