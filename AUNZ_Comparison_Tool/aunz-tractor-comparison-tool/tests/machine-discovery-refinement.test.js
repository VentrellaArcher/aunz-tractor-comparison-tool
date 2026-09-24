import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMachines, getFilterOptions, resetFilters, TOP_SPEED_THRESHOLDS } from '../src/js/filters.js';

const machines = [
  { machine_id: 'slow', manufacturer: 'Alpha', machine: 'Slow', model_year: 2025, top_speed_kmh: 30, transmission_filter_tags: ['Mechanical'], rear_pto_filter_tags: ['540'] },
  { machine_id: 'mid', manufacturer: 'Beta', machine: 'Mid', model_year: 2025, top_speed_kmh: 40, transmission_filter_tags: ['CVT'], rear_pto_filter_tags: ['1000'] },
  { machine_id: 'fast', manufacturer: 'Gamma', machine: 'Fast', model_year: 2025, top_speed_kmh: 60, transmission_filter_tags: ['CVT'], rear_pto_filter_tags: ['540'] },
  { machine_id: 'unsafe', manufacturer: 'Delta', machine: 'Unsafe', model_year: 2025, top_speed_kmh: '30 / 40', transmission_filter_tags: [], rear_pto_filter_tags: [] }
];

test('Top Speed exposes only the approved threshold values', () => {
  assert.deepEqual(TOP_SPEED_THRESHOLDS, [30, 40, 50, 60, 70]);
  assert.deepEqual(getFilterOptions(machines).topSpeed, ['30', '40', '50', '60', '70']);
});

test('Top Speed thresholds include exact boundaries and exclude unsafe values', () => {
  assert.deepEqual(filterMachines(machines, { topSpeed: '30' }).map(machine => machine.machine_id), ['slow', 'mid', 'fast']);
  assert.deepEqual(filterMachines(machines, { topSpeed: '40' }).map(machine => machine.machine_id), ['mid', 'fast']);
  assert.deepEqual(filterMachines(machines, { topSpeed: '50' }).map(machine => machine.machine_id), ['fast']);
  assert.deepEqual(filterMachines(machines, { topSpeed: '60' }).map(machine => machine.machine_id), ['fast']);
  assert.deepEqual(filterMachines(machines, { topSpeed: '70' }), []);
  assert.equal(filterMachines(machines, resetFilters()).length, machines.length);
});

test('Market is absent from active filter state and cannot restrict results', () => {
  assert.equal(Object.hasOwn(resetFilters(), 'market'), false);
  assert.equal(filterMachines(machines, { market: 'NZ' }).length, machines.length);
});
