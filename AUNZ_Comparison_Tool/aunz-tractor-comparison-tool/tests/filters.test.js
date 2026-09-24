import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMachines, getFilterOptions, getSelectionOptions, resetFilters, resolveSelectedMachine, searchMachines, selectionLabel } from '../src/js/filters.js';

const machines = [
  { machine_id: 'jd-a', manufacturer: 'John Deere', machine: 'Alpha', model_year: 2025, market: 'AU', transmission_filter_tags: ['CVT / IVT / EVT'], top_speed_filter: '50', top_speed_kmh: 50, cylinders_filter: '6', number_of_cylinders: 6, rear_pto_filter_tags: ['540', '1000'], full_record: { keep: true } },
  { machine_id: 'jd-b', manufacturer: 'John Deere', machine: 'Beta', model_year: 2024, market: 'AU', transmission_filter_tags: ['Mechanical / Shuttle'], top_speed_filter: '40', top_speed_kmh: 40, cylinders_filter: '4', number_of_cylinders: 4, rear_pto_filter_tags: ['540'], full_record: { keep: true } },
  { machine_id: 'mf-a', manufacturer: 'Massey Ferguson', machine: 'Gamma', model_year: 2025, market: 'NZ', transmission_filter_tags: ['CVT / IVT / EVT'], top_speed_filter: '50', top_speed_kmh: 50, cylinders_filter: '6', number_of_cylinders: 6, rear_pto_filter_tags: ['1000'], full_record: { keep: true } }
];

test('empty, case-insensitive, trimmed and field text search behave deterministically', () => {
  assert.deepEqual(searchMachines(machines, ''), machines);
  assert.equal(searchMachines(machines, '  ALPHA ')[0].machine_id, 'jd-a');
  assert.equal(searchMachines(machines, 'MASSEY')[0].machine_id, 'mf-a');
  assert.deepEqual(searchMachines(machines, 'missing'), []);
});

test('scalar, helper-array and combined filters use AND logic', () => {
  assert.equal(filterMachines(machines, { manufacturer: 'John Deere' }).length, 2);
  assert.equal(filterMachines(machines, { modelYear: 2025 }).length, 2);
  assert.equal(filterMachines(machines, { transmission: 'CVT / IVT / EVT' }).length, 2);
  assert.equal(filterMachines(machines, { topSpeed: '50', cylinders: '6', rearPto: '1000', manufacturer: 'John Deere' }).length, 1);
  assert.equal(filterMachines(machines, { manufacturer: 'Unknown' }).length, 0);
});

test('multi-select filters use OR within a group and AND across groups', () => {
  assert.equal(filterMachines(machines, { manufacturer: ['John Deere', 'Massey Ferguson'] }).length, 3);
  assert.equal(filterMachines(machines, { transmission: ['CVT / IVT / EVT', 'Mechanical / Shuttle'] }).length, 3);
  assert.equal(filterMachines(machines, { manufacturer: ['John Deere', 'Massey Ferguson'], cylinders: ['6'] }).length, 2);
  assert.equal(filterMachines(machines, { manufacturer: ['John Deere'] }).length, 2);
});

test('filtering preserves complete records and does not mutate the source array', () => {
  const original = JSON.stringify(machines);
  const result = filterMachines(machines, { manufacturer: 'John Deere' });
  assert.equal(JSON.stringify(machines), original);
  assert.deepEqual(result[0], machines[0]);
  assert.equal(result[0].full_record.keep, true);
});

test('filter options are derived, unique and deterministically sorted', () => {
  const options = getFilterOptions(machines);
  assert.deepEqual(options.manufacturers, ['John Deere', 'Massey Ferguson']);
  assert.deepEqual(options.modelYears, ['2025', '2024']);
  assert.deepEqual(options.topSpeed, ['30', '40', '50', '60', '70']);
  assert.deepEqual(options.rearPto, ['540', '1000']);
});

test('resetting filters restores the full eligible dataset', () => {
  assert.deepEqual(filterMachines(machines, resetFilters()), machines);
});

test('selection resolves by stable ID and safely clears invalid selections', () => {
  const options = getSelectionOptions(machines);
  assert.equal(options[0].machine_id, 'jd-a');
  assert.equal(resolveSelectedMachine(machines, 'jd-a'), machines[0]);
  assert.equal(resolveSelectedMachine(machines, 'missing'), null);
  assert.match(selectionLabel(machines[0]), /John Deere Alpha \(2025\)/);
  assert.equal(resolveSelectedMachine(filterMachines(machines, { manufacturer: 'Massey Ferguson' }), 'jd-a'), null);
});
