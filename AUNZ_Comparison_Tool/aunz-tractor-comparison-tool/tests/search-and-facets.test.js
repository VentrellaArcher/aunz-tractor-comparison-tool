import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset } from '../scripts/data-utils.mjs';
import { filterMachines, getFacetCounts, getFilterOptions, getSelectionOptions, machineModel, machineName, rankBySearch, resetFilters, searchMachines, selectionLabel, suggestSearchCorrection } from '../src/js/filters.js';
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

// One model in several years, plus a model with a single year: the shape the catalogue is expected to grow into.
const multiYear = [
  makeMachine({ machine_id: 'jd-8r-340-2023-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2023 }),
  makeMachine({ machine_id: 'jd-8r-340-2025-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2025 }),
  makeMachine({ machine_id: 'jd-8r-340-2027-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2027 }),
  makeMachine({ machine_id: 'jd-8r-370-2025-au', manufacturer: 'John Deere', machine: 'John Deere 8R 370', model_year: 2025 }),
  makeMachine({ machine_id: 'fendt-942-2025-au', manufacturer: 'Fendt', machine: 'Fendt 942 Vario', model_year: 2025 })
];

test('a model year can be searched as a plain year or as MY25, MY 25 and MY2025', () => {
  const expected = ['jd-8r-340-2025-au', 'jd-8r-370-2025-au', 'fendt-942-2025-au'];
  for (const query of ['2025', 'my25', 'MY25', 'my 25', 'MY2025', "my'25", 'my-25']) {
    assert.deepEqual(ids(searchMachines(multiYear, query)).sort(), [...expected].sort(), query);
  }
  assert.deepEqual(ids(searchMachines(multiYear, '8r 340 my27')), ['jd-8r-340-2027-au']);
  assert.deepEqual(ids(searchMachines(multiYear, 'my27 8r 340')), ['jd-8r-340-2027-au']);
  assert.deepEqual(ids(searchMachines(multiYear, '8r 340 2023')), ['jd-8r-340-2023-au']);
  assert.deepEqual(ids(searchMachines(multiYear, '8r 340')), ['jd-8r-340-2023-au', 'jd-8r-340-2025-au', 'jd-8r-340-2027-au']);
  assert.deepEqual(ids(searchMachines(multiYear, 'my25 my27')).sort(), ['jd-8r-340-2025-au', 'jd-8r-340-2027-au', 'jd-8r-370-2025-au', 'fendt-942-2025-au'].sort());
  assert.deepEqual(searchMachines(multiYear, 'my99'), []);
});

test('a year that is still being typed does not blank the results', () => {
  assert.equal(searchMachines(multiYear, 'my').length, multiYear.length);
  assert.equal(searchMachines(multiYear, '8r 340 my').length, 3);
  assert.equal(searchMachines(multiYear, '8r 340 my2').length, 3);
  assert.equal(searchMachines(multiYear, '8r 340 my202').length, 3);
});

test('a bare two-digit number is not read as a year because it can belong to a model name', () => {
  const machines = [makeMachine({ machine_id: 'a', machine: 'Demo 27', manufacturer: 'Demo', model_year: 2019 }), makeMachine({ machine_id: 'b', machine: 'Demo 90', manufacturer: 'Demo', model_year: 2027 })];
  assert.deepEqual(ids(searchMachines(machines, 'demo 27')), ['a']);
  assert.deepEqual(ids(searchMachines(machines, 'demo my27')), ['b']);
});

test('ranking and corrections ignore the year notation but keep it in the suggestion', () => {
  assert.deepEqual(ids(rankBySearch(multiYear, 'john my25')).slice(0, 4), ids(multiYear).slice(0, 4), 'names that start with the text come first, in input order');
  assert.deepEqual(suggestSearchCorrection(multiYear, 'fent 942 my25'), { query: 'Fendt 942 my25', count: 1 });
  assert.deepEqual(suggestSearchCorrection(multiYear, 'fent 942 2025'), { query: 'Fendt 942 2025', count: 1 });
  assert.equal(suggestSearchCorrection(multiYear, 'my99'), null);
});

test('the selection list is deterministic and puts model years of one machine side by side in year order', () => {
  const shuffled = [multiYear[4], multiYear[2], multiYear[0], multiYear[3], multiYear[1]];
  assert.deepEqual(ids(getSelectionOptions(shuffled)), ids(getSelectionOptions(multiYear)));
  assert.deepEqual(ids(getSelectionOptions(multiYear)), ['fendt-942-2025-au', 'jd-8r-340-2023-au', 'jd-8r-340-2025-au', 'jd-8r-340-2027-au', 'jd-8r-370-2025-au']);
  const johnDeere = getSelectionOptions(multiYear).filter((machine) => machine.machine === 'John Deere 8R 340').map((machine) => machine.model_year);
  assert.deepEqual(johnDeere, [2023, 2025, 2027]);
});

test('facet counts follow model years when one machine has several', () => {
  const counts = getFacetCounts(multiYear, { ...resetFilters(), search: '8r 340' });
  assert.equal(counts.modelYear['2023'], 1);
  assert.equal(counts.modelYear['2025'], 1);
  assert.equal(counts.modelYear['2027'], 1);
  const twenty25 = getFacetCounts(multiYear, { ...resetFilters(), modelYear: ['2025'] });
  assert.equal(twenty25.manufacturer['John Deere'], 2);
  assert.equal(twenty25.modelYear['2027'], 1, 'a group ignores its own selection');
});
