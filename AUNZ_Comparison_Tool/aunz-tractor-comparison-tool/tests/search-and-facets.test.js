import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset } from '../scripts/data-utils.mjs';
import { filterMachines, getFacetCounts, getFilterOptions, machineModel, machineName, rankBySearch, resetFilters, searchMachines, selectionLabel, suggestSearchCorrection } from '../src/js/filters.js';
import { fleet, makeMachine } from './fixtures/fleet.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ids = (machines) => machines.map((machine) => machine.machine_id);

test('machine labels do not repeat the brand when the source name already includes it', () => {
  assert.equal(machineName(fleet[0]), 'John Deere 8R 340');
  assert.equal(selectionLabel(fleet[0]), 'John Deere 8R 340 (2025)');
  assert.equal(machineModel(fleet[0]), '8R 340');
  assert.equal(machineName({ manufacturer: 'Beta', machine: 'Model 1' }), 'Beta Model 1');
  assert.equal(machineModel({ manufacturer: 'Beta', machine: 'Model 1' }), 'Model 1');
  assert.equal(machineName({ manufacturer: 'Case', machine: 'Caseflow 9' }), 'Case Caseflow 9');
  assert.equal(machineName({ manufacturer: 'Deutz-Fahr', machine: 'Deutz-Fahr 6170' }), 'Deutz-Fahr 6170');
});

test('labels tolerate missing values without printing undefined', () => {
  assert.equal(selectionLabel(null), '');
  assert.equal(selectionLabel({ manufacturer: 'Beta', machine: 'Model 1' }), 'Beta Model 1');
  assert.doesNotMatch(selectionLabel({ manufacturer: 'Beta', machine: 'Model 1', model_year: null }), /null|undefined/);
});

test('search is case-insensitive, token based and tolerant of spacing and punctuation', () => {
  assert.deepEqual(ids(searchMachines(fleet, '8r 340')), ['jd-8r-340-2025-au']);
  assert.deepEqual(ids(searchMachines(fleet, '8r 3')), ['jd-8r-340-2025-au']);
  assert.deepEqual(ids(searchMachines(fleet, '8R340')), ['jd-8r-340-2025-au']);
  assert.deepEqual(ids(searchMachines(fleet, 't8.410')), ['nh-t8-410-2024-us']);
  assert.deepEqual(ids(searchMachines(fleet, 'T8 410')), ['nh-t8-410-2024-us']);
  assert.deepEqual(ids(searchMachines(fleet, 'deutz fahr')), ['deutz-6170-2025-au']);
  assert.deepEqual(ids(searchMachines(fleet, 'DEUTZFAHR')), ['deutz-6170-2025-au']);
  assert.deepEqual(ids(searchMachines(fleet, 'fendt 2025')), ['fendt-942-2025-au']);
  assert.deepEqual(searchMachines(fleet, 'zzz'), []);
  assert.equal(searchMachines(fleet, '   ').length, fleet.length);
});

test('filtering applies the same search matching and unmatched searches yield nothing', () => {
  assert.deepEqual(ids(filterMachines(fleet, { search: '8r340' })), ['jd-8r-340-2025-au']);
  assert.deepEqual(filterMachines(fleet, { search: 'no such tractor' }), []);
});

test('punctuation-only searches keep the previous substring behaviour instead of matching everything', () => {
  assert.deepEqual(ids(filterMachines(fleet, { search: '-' })), ['deutz-6170-2025-au']);
  assert.deepEqual(filterMachines(fleet, { search: '???' }), []);
});

test('search corrections are offered only when nothing matches and a close match exists', () => {
  assert.deepEqual(suggestSearchCorrection(fleet, 'fent'), { query: 'Fendt', count: 1 });
  assert.deepEqual(suggestSearchCorrection(fleet, 'masey fergusn'), { query: 'Massey Ferguson', count: 1 });
  assert.equal(suggestSearchCorrection(fleet, 'fendt'), null);
  assert.equal(suggestSearchCorrection(fleet, ''), null);
  assert.equal(suggestSearchCorrection(fleet, 'zzzzzz'), null);
  assert.equal(suggestSearchCorrection(fleet, 'jdx'), null);
});

test('facet counts show what each option would return given the other active filters', () => {
  const open = getFacetCounts(fleet);
  assert.equal(open.manufacturer['John Deere'], 2);
  assert.equal(open.manufacturer.Fendt, 1);
  assert.equal(open.modelYear['2025'], 5);
  assert.equal(open.topSpeed['30'], 7);
  assert.equal(open.topSpeed['60'], 1);
  assert.equal(open.topSpeed['70'], 0);

  const narrowed = getFacetCounts(fleet, { ...resetFilters(), manufacturer: ['John Deere'], transmission: ['Full powershift'] });
  assert.equal(narrowed.manufacturer['John Deere'], 1, 'own group ignores its own selection but respects the other groups');
  assert.equal(narrowed.manufacturer.Fendt, undefined);
  assert.equal(narrowed.transmission['Full powershift'], 1);
  assert.equal(narrowed.transmission['CVT / IVT / EVT'], 1);
  assert.equal(narrowed.cylinders['6'], 1);
});

test('facet counts respect the search text and ignore unusable values', () => {
  const counts = getFacetCounts([...fleet, makeMachine({ machine_id: 'blank-year', model_year: null, top_speed_kmh: '30 / 40' })], { ...resetFilters(), search: 'demo' });
  assert.equal(counts.manufacturer.Demo, 1);
  assert.equal(counts.modelYear.null, undefined);
  assert.equal(counts.topSpeed['30'], 0, 'descriptive top speeds are not counted');
});

test('suggestions rank names that start with the typed text ahead of looser matches', () => {
  const machines = [
    makeMachine({ machine_id: 'later', manufacturer: 'Zeta', machine: 'Zeta Big John 5' }),
    makeMachine({ machine_id: 'starts', manufacturer: 'John Deere', machine: 'John Deere 5050E' }),
    makeMachine({ machine_id: 'other', manufacturer: 'Other', machine: 'Other 9' })
  ];
  assert.deepEqual(ids(rankBySearch(machines, 'john')), ['starts', 'later', 'other']);
  assert.deepEqual(ids(rankBySearch(machines, '')), ['later', 'starts', 'other']);
  assert.deepEqual(rankBySearch(machines, 'john'), rankBySearch(machines, ' JOHN '));
});

test('resetFilters returns independent arrays so state can never leak between resets', () => {
  const first = resetFilters();
  first.manufacturer.push('Fendt');
  assert.deepEqual(resetFilters().manufacturer, []);
});

test('the real catalogue produces clean labels and consistent facet totals', () => {
  const catalogue = buildMachineDataset(readFileSync(path.join(repoRoot, 'data-source', 'machines.csv'), 'utf8')).publishedMachines;
  for (const machine of catalogue) {
    const label = selectionLabel(machine).toLowerCase();
    const maker = machine.manufacturer.toLowerCase();
    assert.ok(label.startsWith(maker), `${label} keeps the brand`);
    assert.equal(label.startsWith(`${maker} ${maker}`), false, `${label} repeats the brand`);
  }
  const counts = getFacetCounts(catalogue);
  const options = getFilterOptions(catalogue);
  assert.deepEqual(Object.keys(counts.manufacturer).sort(), [...options.manufacturers].sort());
  assert.equal(Object.values(counts.manufacturer).reduce((sum, value) => sum + value, 0), catalogue.length);
  assert.equal(Object.values(counts.modelYear).reduce((sum, value) => sum + value, 0), catalogue.length);
});
