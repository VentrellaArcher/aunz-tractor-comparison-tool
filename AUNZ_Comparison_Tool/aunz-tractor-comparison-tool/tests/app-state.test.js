import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reconcile, withBaseline, withComparisonAdded, withComparisonCleared, withComparisonRemoved, withComparisonToggled, withFilterChange, withFiltersReset, withMachineSelected, withRelationshipPercentage, withResultsChange, withSearch, withSelectionCleared, withStartOver, withViewChange } from '../src/js/state.js';
import { filterMachines, resetFilters } from '../src/js/filters.js';
import { MAX_COMPARISON_MACHINES, makeBaseline, restoreComparisonIds } from '../src/js/comparison.js';
import { fleet, makeMachine } from './fixtures/fleet.js';

const JD = 'jd-8r-340-2025-au';
const JD_RT = 'jd-8rt-340-2025-au';
const NH = 'nh-t8-410-2024-us';
const FENDT = 'fendt-942-2025-au';

test('the initial state is empty, ready and independent between calls', () => {
  const first = createInitialState();
  first.filters.manufacturer.push('Fendt');
  assert.deepEqual(createInitialState(), { filters: resetFilters(), selectedMachineId: '', relationshipPercentage: 10, results: { sort: 'closest', brands: [], columns: 'key' }, comparison: { machineIds: [], message: null }, view: { differencesOnly: false, showEmpty: false } });
});

test('selecting a machine clears the search text and keeps it selected while eligible', () => {
  let state = withSearch(createInitialState(), fleet, '8r');
  assert.equal(state.filters.search, '8r');
  state = withMachineSelected(state, fleet, JD);
  assert.equal(state.selectedMachineId, JD);
  assert.equal(state.filters.search, '');
});

test('typing a new search releases the previous primary machine', () => {
  const state = withSearch(withMachineSelected(createInitialState(), fleet, JD), fleet, 'fen');
  assert.equal(state.selectedMachineId, '');
});

test('a filter that excludes the primary machine clears it, and one that keeps it does not', () => {
  const selected = withMachineSelected(createInitialState(), fleet, JD);
  const keeps = withFilterChange(selected, fleet, 'manufacturer', 'John Deere', true);
  assert.equal(keeps.selectedMachineId, JD);
  const drops = withFilterChange(selected, fleet, 'manufacturer', 'Fendt', true);
  assert.equal(drops.selectedMachineId, '');
  assert.deepEqual(drops.filters.manufacturer, ['Fendt']);
});

test('filter changes add, remove and replace values with the documented AND/OR logic', () => {
  let state = createInitialState();
  state = withFilterChange(state, fleet, 'manufacturer', 'Fendt', true);
  state = withFilterChange(state, fleet, 'manufacturer', 'John Deere', true);
  state = withFilterChange(state, fleet, 'manufacturer', 'John Deere', true);
  assert.deepEqual(state.filters.manufacturer, ['Fendt', 'John Deere']);
  state = withFilterChange(state, fleet, 'manufacturer', 'Fendt', false);
  assert.deepEqual(state.filters.manufacturer, ['John Deere']);
  state = withFilterChange(state, fleet, 'topSpeed', '40', true);
  state = withFilterChange(state, fleet, 'topSpeed', '50', true);
  assert.equal(state.filters.topSpeed, '50', 'top speed is a single choice');
  state = withFilterChange(state, fleet, 'topSpeed', '', false);
  assert.equal(state.filters.topSpeed, '');
  assert.deepEqual(filterMachines(fleet, state.filters).map((machine) => machine.manufacturer), ['John Deere', 'John Deere']);
});

test('reset restores every eligible machine and keeps a primary machine that is still valid', () => {
  let state = withMachineSelected(createInitialState(), fleet, JD);
  state = withFilterChange(state, fleet, 'manufacturer', 'John Deere', true);
  state = withFiltersReset(state, fleet);
  assert.deepEqual(state.filters, resetFilters());
  assert.equal(state.selectedMachineId, JD);
  assert.equal(filterMachines(fleet, state.filters).length, fleet.length);
});

test('clearing the selection also clears the search text', () => {
  const state = withSelectionCleared({ ...createInitialState(), selectedMachineId: JD, filters: { ...resetFilters(), search: 'x' } });
  assert.equal(state.selectedMachineId, '');
  assert.equal(state.filters.search, '');
});

test('the first candidate added also adds the selected machine as Machine A', () => {
  let state = withMachineSelected(createInitialState(), fleet, JD);
  state = withComparisonToggled(state, fleet, NH);
  assert.deepEqual(state.comparison.machineIds, [JD, NH]);
  state = withComparisonToggled(state, fleet, FENDT);
  assert.deepEqual(state.comparison.machineIds, [JD, NH, FENDT]);
});

test('toggling the selected machine itself adds only that machine, and toggling twice removes it', () => {
  let state = withMachineSelected(createInitialState(), fleet, JD);
  state = withComparisonToggled(state, fleet, JD);
  assert.deepEqual(state.comparison.machineIds, [JD]);
  state = withComparisonToggled(state, fleet, JD);
  assert.deepEqual(state.comparison.machineIds, []);
});

test('candidates can be added without a selected machine', () => {
  const state = withComparisonToggled(createInitialState(), fleet, NH);
  assert.deepEqual(state.comparison.machineIds, [NH]);
});

test('the comparison never exceeds four machines and explains why', () => {
  let state = createInitialState();
  for (const machine of fleet.slice(0, MAX_COMPARISON_MACHINES)) state = withComparisonToggled(state, fleet, machine.machine_id);
  assert.equal(state.comparison.machineIds.length, MAX_COMPARISON_MACHINES);
  const over = withComparisonToggled(state, fleet, fleet[4].machine_id);
  assert.deepEqual(over.comparison.machineIds, state.comparison.machineIds);
  assert.match(over.comparison.message, /limited to 4 machines/);
});

test('adding an unknown or duplicate machine is rejected safely', () => {
  const state = withComparisonAdded(createInitialState(), fleet, JD);
  assert.match(withComparisonAdded(state, fleet, JD).comparison.message, /already in the comparison/);
  assert.match(withComparisonAdded(state, fleet, 'gone').comparison.message, /not available/);
  assert.deepEqual(withComparisonAdded(state, fleet, 'gone').comparison.machineIds, [JD]);
});

test('removing keeps the remaining order, and clearing leaves discovery state alone', () => {
  let state = { ...createInitialState(), comparison: { machineIds: [JD, NH, FENDT], message: null } };
  state = withFilterChange(state, fleet, 'manufacturer', 'John Deere', true);
  const removed = withComparisonRemoved(state, NH);
  assert.deepEqual(removed.comparison.machineIds, [JD, FENDT]);
  const cleared = withComparisonCleared(state);
  assert.deepEqual(cleared.comparison.machineIds, []);
  assert.deepEqual(cleared.filters.manufacturer, ['John Deere']);
});

test('making a machine the baseline reorders without adding or losing machines', () => {
  const state = { ...createInitialState(), comparison: { machineIds: [JD, NH, FENDT], message: null } };
  assert.deepEqual(withBaseline(state, FENDT).comparison.machineIds, [FENDT, JD, NH]);
  assert.deepEqual(withBaseline(state, JD).comparison.machineIds, [JD, NH, FENDT]);
  assert.deepEqual(withBaseline(state, 'gone').comparison.machineIds, [JD, NH, FENDT]);
  assert.deepEqual(makeBaseline({ machineIds: [], message: 'x' }, JD), { machineIds: [], message: null });
});

test('comparison IDs restore only machines that still exist, without duplicates or overflow', () => {
  const restored = restoreComparisonIds([JD, JD, 'gone', NH, FENDT, JD_RT, 'mf-8s-265-2023-au'], fleet);
  assert.deepEqual(restored.state.machineIds, [JD, NH, FENDT, JD_RT]);
  assert.equal(restored.skipped, 3);
  assert.deepEqual(restoreComparisonIds('not-an-array', fleet).state.machineIds, []);
});

test('reconcile drops retired comparison machines and an ineligible or unknown selection', () => {
  const state = { ...createInitialState(), selectedMachineId: 'gone', relationshipPercentage: 13, comparison: { machineIds: [JD, 'gone'], message: 'stale' } };
  const fixed = reconcile(state, fleet);
  assert.equal(fixed.selectedMachineId, '');
  assert.equal(fixed.relationshipPercentage, 10);
  assert.deepEqual(fixed.comparison, { machineIds: [JD], message: null });
});

test('relationship percentage accepts only the supported bands', () => {
  const state = createInitialState();
  assert.equal(withRelationshipPercentage(state, '20').relationshipPercentage, 20);
  assert.equal(withRelationshipPercentage(state, 13).relationshipPercentage, 10);
  assert.equal(withRelationshipPercentage(state, 'x').relationshipPercentage, 10);
});

test('results and view options change independently of everything else', () => {
  const base = withMachineSelected(createInitialState(), fleet, JD);
  const results = withResultsChange(base, { sort: 'max_hp-desc', brands: ['Fendt'] });
  assert.deepEqual(results.results, { sort: 'max_hp-desc', brands: ['Fendt'], columns: 'key' });
  assert.equal(results.selectedMachineId, JD);
  const view = withViewChange(base, { differencesOnly: true });
  assert.deepEqual(view.view, { differencesOnly: true, showEmpty: false });
});

test('start over returns to the initial state', () => {
  assert.deepEqual(withStartOver(), createInitialState());
});

test('transitions never mutate the state they receive', () => {
  const state = withMachineSelected(createInitialState(), fleet, JD);
  const snapshot = JSON.stringify(state);
  withFilterChange(state, fleet, 'manufacturer', 'Fendt', true);
  withComparisonToggled(state, fleet, NH);
  withSearch(state, fleet, 'x');
  withResultsChange(state, { sort: 'name-asc' });
  withBaseline({ ...state, comparison: { machineIds: [JD, NH], message: null } }, NH);
  assert.equal(JSON.stringify(state), snapshot);
});

test('a catalogue record with unusual values does not break reconciliation', () => {
  const odd = [...fleet, makeMachine({ machine_id: 'odd-0-2025-au', max_hp: null, top_speed_kmh: '30 / 40', cylinders_filter: undefined, number_of_cylinders: undefined })];
  const state = withComparisonToggled(createInitialState(), odd, 'odd-0-2025-au');
  assert.deepEqual(reconcile(state, odd).comparison.machineIds, ['odd-0-2025-au']);
});
