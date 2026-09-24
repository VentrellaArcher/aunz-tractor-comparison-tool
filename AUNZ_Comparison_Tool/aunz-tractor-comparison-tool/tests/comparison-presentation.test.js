import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDelta, deltaDirection, formatDelta } from '../src/js/comparison.js';

const field = { propertyPath: 'max_hp', numericDeltaEligible: true };

test('deltas round to two decimals with explicit mathematical signs', () => {
  assert.equal(formatDelta(calculateDelta(field, { max_hp: 100 }, { max_hp: 104.766 }), ''), '+4.77');
  assert.equal(formatDelta(calculateDelta(field, { max_hp: 100 }, { max_hp: 96.745 }), ''), '-3.25');
  assert.equal(formatDelta(calculateDelta(field, { max_hp: 100 }, { max_hp: 100 }), ''), '0.00');
  assert.doesNotMatch(formatDelta(calculateDelta(field, { max_hp: 100 }, { max_hp: 104.766 }), ''), /\d+\.\d{3,}/);
});

test('delta direction classes are explicit and do not encode product judgement', () => {
  assert.equal(deltaDirection({ available: true, value: 1 }), 'delta-positive');
  assert.equal(deltaDirection({ available: true, value: -1 }), 'delta-negative');
  assert.equal(deltaDirection({ available: true, value: 0 }), 'delta-neutral');
  assert.equal(deltaDirection({ available: false, value: null }), 'delta-neutral');
  assert.doesNotMatch(formatDelta({ available: true, value: 1 }, ''), /better|worse|advantage|disadvantage/i);
});
