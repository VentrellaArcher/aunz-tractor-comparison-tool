import test from 'node:test';
import assert from 'node:assert/strict';
import { displaySchema, displaySections } from '../src/js/display-schema.js';
import { addMachineToComparison, addSelectedAndCandidate, calculateDelta, clearComparison, comparePowerToWeight, createComparisonState, formatDelta, removeMachineFromComparison, resolveComparisonMachines } from '../src/js/comparison.js';

const machines = [
  { machine_id: 'a', manufacturer: 'Alpha', machine: 'A', model_year: 2025, max_hp: 100, rated_hp: 90, transmission: 'CVT / IVT / EVT', powerToWeightAvailable: true, powerToWeightHpPerTonne: 20, powerToWeightKwPerTonne: 14.91, powerBasis: 'maxHp', weightBasis: 'unladenWeightKg', notes: 'complete' },
  { machine_id: 'b', manufacturer: 'Beta', machine: 'B', model_year: 2025, max_hp: 120, rated_hp: 110, transmission: 'Mechanical / Shuttle', powerToWeightAvailable: true, powerToWeightHpPerTonne: 24, powerToWeightKwPerTonne: 17.90, powerBasis: 'maxHp', weightBasis: 'unladenWeightKg', notes: 'complete' },
  { machine_id: 'c', manufacturer: 'Gamma', machine: 'C', model_year: 2025, max_hp: 80, powerToWeightAvailable: false, powerToWeightHpPerTonne: null, powerToWeightKwPerTonne: null, powerToWeightUnavailableReason: 'unladen_weight_not_scalar' },
  { machine_id: 'd', manufacturer: 'Delta', machine: 'D', model_year: 2025, max_hp: 100, transmission: '8000 / 9000' }
];

const deltaField = displaySchema.find((field) => field.key === 'max_hp');
const textField = displaySchema.find((field) => field.key === 'transmission');

test('initial comparison state is empty', () => {
  assert.deepEqual(createComparisonState(), { machineIds: [], message: null });
});

test('adding valid IDs, selected candidate pair and duplicates is safe', () => {
  let state = createComparisonState();
  state = addMachineToComparison(state, 'a', machines);
  assert.deepEqual(state.machineIds, ['a']);
  assert.deepEqual(addSelectedAndCandidate(createComparisonState(), 'a', 'b', machines).machineIds, ['a', 'b']);
  assert.deepEqual(addMachineToComparison(state, 'a', machines).machineIds, ['a']);
  assert.match(addMachineToComparison(state, 'a', machines).message, /already/);
  assert.deepEqual(addMachineToComparison(state, 'missing', machines).machineIds, ['a']);
});

test('comparison order, limit, removal and clear are deterministic', () => {
  let state = createComparisonState();
  for (const id of ['a', 'b', 'c', 'd']) state = addMachineToComparison(state, id, machines);
  const overLimit = addMachineToComparison(state, 'fifth', [...machines, { machine_id: 'fifth', machine: 'Fifth' }]);
  assert.deepEqual(overLimit.machineIds, ['a', 'b', 'c', 'd']);
  assert.match(overLimit.message, /limited to 4/);
  assert.deepEqual(removeMachineFromComparison(state, 'b').machineIds, ['a', 'c', 'd']);
  assert.deepEqual(clearComparison().machineIds, []);
});

test('IDs resolve to complete runtime machine objects without mutation', () => {
  const state = { machineIds: ['a', 'b'], message: null };
  const resolved = resolveComparisonMachines(state, machines);
  assert.equal(resolved[0], machines[0]);
  assert.equal(resolved[0].notes, 'complete');
  assert.deepEqual(state.machineIds, ['a', 'b']);
});

test('safe numeric deltas use Machine A as baseline with neutral formatting', () => {
  assert.deepEqual(calculateDelta(deltaField, machines[0], machines[1]), { available: true, reason: null, value: 20 });
  assert.equal(formatDelta(calculateDelta(deltaField, machines[0], machines[1]), 'hp'), '+20 hp');
  assert.equal(formatDelta(calculateDelta(deltaField, machines[1], machines[0]), 'hp'), '-20 hp');
  assert.equal(formatDelta(calculateDelta(textField, machines[0], machines[3]), 'hp'), '—');
  assert.equal(calculateDelta(textField, machines[0], machines[1]).available, false);
  assert.equal(formatDelta(calculateDelta(deltaField, machines[0], machines[0]), 'hp'), '0 hp');
});

test('power-to-weight compares generated values only when both machines are available', () => {
  const available = comparePowerToWeight(machines[0], machines[1]);
  assert.equal(available.available, true);
  assert.equal(available.hpPerTonneDelta, 4);
  assert.equal(available.kwPerTonneDelta, 2.9899999999999984);
  assert.equal(available.powerBasis, 'maxHp');
  assert.equal(comparePowerToWeight(machines[0], machines[2]).available, false);
});

test('display schema provides every ordered section and field exactly once', () => {
  assert.deepEqual([...new Set(displaySchema.map((field) => field.key))].length, displaySchema.length);
  assert.deepEqual(displaySections, ['Machine', 'Power and engine', 'Derived performance', 'Transmission and speed', 'Dimensions and weights', 'Hydraulics and hitch', 'Cab and capacities', 'PTO', 'Source and review']);
  assert.equal(displaySchema.filter((field) => field.priority).length >= 4, true);
  assert.ok(displaySchema.some((field) => field.section === 'Source and review'));
  assert.ok(displaySchema.some((field) => field.section === 'Derived performance'));
});
