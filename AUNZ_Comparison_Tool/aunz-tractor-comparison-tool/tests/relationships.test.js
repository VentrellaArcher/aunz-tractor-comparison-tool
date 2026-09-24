import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRelationshipBounds, findRelationshipResults, RELATIONSHIP_PERCENTAGES, validateRelationshipPercentage } from '../src/js/relationships.js';

const selected = { machine_id: 'selected', machine: 'Selected', manufacturer: 'Demo', model_year: 2025, max_hp: 100, rated_hp: 10, extra: 'complete' };
const machines = [
  selected,
  { machine_id: 'lower', machine: 'Lower', manufacturer: 'Demo', model_year: 2025, max_hp: 95 },
  { machine_id: 'upper', machine: 'Upper', manufacturer: 'Demo', model_year: 2025, max_hp: 105 },
  { machine_id: 'near', machine: 'Near', manufacturer: 'Demo', model_year: 2025, max_hp: 102 },
  { machine_id: 'outside', machine: 'Outside', manufacturer: 'Demo', model_year: 2025, max_hp: 111 },
  { machine_id: 'missing', machine: 'Missing', manufacturer: 'Demo', model_year: 2025, max_hp: null },
  { machine_id: 'invalid', machine: 'Invalid', manufacturer: 'Demo', model_year: 2025, max_hp: '100 hp' }
];

test('relationship bounds use Max HP and include exact boundaries', () => {
  assert.deepEqual(calculateRelationshipBounds(100, 5), { lowerBound: 95, upperBound: 105 });
  const result = findRelationshipResults(machines, selected, 5);
  assert.deepEqual(result.rows.map((row) => row.machineId), ['selected', 'near', 'lower', 'upper']);
});

test('zero percent returns exact Max HP matches and pins selected first', () => {
  const result = findRelationshipResults([...machines, { machine_id: 'exact', max_hp: 100 }], selected, 0);
  assert.deepEqual(result.rows.map((row) => row.machineId), ['selected', 'exact']);
  assert.equal(result.rows[0].isSelected, true);
});

test('candidates sort by absolute Max HP difference and stable ID ties', () => {
  const result = findRelationshipResults([...machines, { machine_id: 'tie-a', max_hp: 98 }, { machine_id: 'tie-b', max_hp: 102 }], selected, 5);
  assert.deepEqual(result.rows.slice(1).map((row) => row.machineId), ['near', 'tie-a', 'tie-b', 'lower', 'upper']);
});

test('invalid and missing Max HP are excluded or return unavailable state', () => {
  const result = findRelationshipResults(machines, selected, 5);
  assert.equal(result.rows.some((row) => ['missing', 'invalid'].includes(row.machineId)), false);
  assert.equal(findRelationshipResults(machines, { machine_id: 'bad', max_hp: null }, 5).reason, 'selected_max_hp_unavailable');
  assert.equal(findRelationshipResults(machines, null, 5).reason, 'selected_machine_unavailable');
});

test('percentage validation is explicit and rejects invalid values', () => {
  assert.deepEqual(RELATIONSHIP_PERCENTAGES, [0, 5, 10, 15, 20, 30, 50, 100]);
  assert.equal(validateRelationshipPercentage('10'), 10);
  assert.throws(() => validateRelationshipPercentage(-5), /must be one of/);
  assert.throws(() => validateRelationshipPercentage('x'), /must be one of/);
});

test('relationship results retain complete candidate objects and do not mutate inputs', () => {
  const before = JSON.stringify(machines);
  const result = findRelationshipResults(machines, selected, 5);
  assert.equal(result.rows[0].machine.extra, 'complete');
  assert.equal(JSON.stringify(machines), before);
  assert.equal(result.rows.find((row) => row.machineId === 'near').percentageMaxHpDifference, 2);
  assert.equal(result.rows.find((row) => row.machineId === 'near').machine.rated_hp, undefined);
});
