import test from 'node:test';
import assert from 'node:assert/strict';
import { displaySchema, displaySections } from '../src/js/display-schema.js';
import { buildComparisonModel, normalizeViewOptions, slugify, slotLetter } from '../src/js/comparison-model.js';
import { fleet, makeMachine } from './fixtures/fleet.js';

const pair = [fleet[0], fleet[1]];
const rowOf = (model, key) => model.sections.flatMap((section) => section.rows).find((row) => row.key === key);

test('model covers every display section and field exactly once, in schema order', () => {
  const model = buildComparisonModel(pair, { showEmpty: true });
  assert.deepEqual(model.sections.map((section) => section.name), displaySections);
  assert.equal(model.totals.rows, displaySchema.length);
  assert.deepEqual(model.sections.flatMap((section) => section.rows.map((row) => row.key)), displaySections.flatMap((section) => displaySchema.filter((field) => field.section === section).sort((left, right) => left.order - right.order).map((field) => field.key)));
  assert.equal(model.totals.visible + model.totals.hiddenEmpty + model.totals.hiddenSame, model.totals.rows);
});

test('machine cards use slot letters, mark the baseline and surface the priority specifications', () => {
  const model = buildComparisonModel(pair);
  assert.deepEqual(model.machines.map((card) => [card.letter, card.isBaseline]), [['A', true], ['B', false]]);
  assert.equal(model.machines[0].label, 'John Deere 8R 340 (2025)');
  assert.equal(model.machines[0].model, '8R 340');
  assert.deepEqual(model.machines[0].highlights.map((item) => item.key), displaySchema.filter((field) => field.priority).map((field) => field.key));
  assert.equal(model.machines[0].highlights.find((item) => item.key === 'max_hp').text, '374 hp');
  assert.equal(slotLetter(3), 'D');
  assert.equal(slugify('Power and engine'), 'power-and-engine');
});

test('numeric deltas are neutral, baseline-relative and only for delta-eligible fields', () => {
  const model = buildComparisonModel([fleet[0], fleet[3]]);
  const maxHp = rowOf(model, 'max_hp');
  assert.equal(maxHp.cells[0].delta, null, 'baseline has no delta');
  assert.equal(maxHp.cells[1].text, '420 hp');
  assert.equal(maxHp.cells[1].delta.text, '+46.00 hp');
  assert.equal(maxHp.cells[1].delta.direction, 'delta-positive');
  assert.equal(maxHp.priority, true);
  assert.equal(rowOf(model, 'transmission').cells[1].delta, null, 'descriptive rows never get a delta');
  assert.equal(rowOf(model, 'unladen_weight_kg').cells[1].delta, null, 'weights are not delta eligible');
  const negative = buildComparisonModel([fleet[3], fleet[0]]);
  assert.equal(rowOf(negative, 'max_hp').cells[1].delta.text, '-46.00 hp');
});

test('a delta is unavailable when either side lacks a clean number', () => {
  const model = buildComparisonModel([fleet[0], fleet[2]]);
  const torque = rowOf(model, 'max_torque_nm');
  assert.equal(torque.cells[1].missing, true);
  assert.equal(torque.cells[1].text, '—');
  assert.equal(torque.cells[1].delta.available, false);
  assert.equal(torque.cells[1].delta.text, '—');
});

test('power-to-weight explains why a value is unavailable without inventing one', () => {
  const model = buildComparisonModel([fleet[0], fleet[2]]);
  const ratio = rowOf(model, 'powerToWeightHpPerTonne');
  assert.equal(ratio.cells[0].text, '29.45 hp/t');
  assert.equal(ratio.cells[1].text, '—');
  assert.match(ratio.cells[1].note, /Not calculated/);
  assert.equal(ratio.cells[0].note, null);
  assert.match(model.sections.find((section) => section.name === 'Derived performance').note, /not a loaded, ballasted or operating measure/i);
});

test('descriptive source values are shown exactly as published', () => {
  const model = buildComparisonModel([fleet[0], fleet[2]], { showEmpty: true });
  assert.equal(rowOf(model, 'unladen_weight_kg').cells[1].text, '24639 (narrow), 25546 (wide) kg');
  assert.equal(rowOf(model, 'transmission').cells[0].text, 'CVT / IVT / EVT');
});

test('rows with no published value for any compared machine are hidden unless requested', () => {
  const hidden = buildComparisonModel(pair);
  const shown = buildComparisonModel(pair, { showEmpty: true });
  assert.ok(hidden.totals.hiddenEmpty > 0);
  assert.equal(shown.totals.hiddenEmpty, 0);
  assert.equal(rowOf(hidden, 'notes').hidden, true);
  assert.equal(rowOf(hidden, 'notes').hiddenReason, 'empty');
  assert.equal(rowOf(shown, 'notes').hidden, false);
  assert.equal(hidden.sections.find((section) => section.name === 'Source and review').hidden, true, 'a section with nothing to show is hidden');
  assert.equal(shown.sections.find((section) => section.name === 'Source and review').hidden, false);
  assert.equal(rowOf(buildComparisonModel([fleet[0], makeMachine({ notes: 'Field note' })]), 'notes').hidden, false);
});

test('differences only hides identical rows but never rows that differ', () => {
  const model = buildComparisonModel(pair, { differencesOnly: true });
  assert.equal(rowOf(model, 'max_hp').hidden, true, 'identical Max HP is hidden');
  assert.equal(rowOf(model, 'max_hp').hiddenReason, 'same');
  assert.equal(rowOf(model, 'max_torque_nm').hidden, false);
  assert.equal(rowOf(model, 'machine').hidden, false);
  assert.ok(model.totals.hiddenSame > 0);
  assert.equal(model.totals.visible + model.totals.hiddenEmpty + model.totals.hiddenSame, model.totals.rows);
});

test('cells that differ from the baseline are flagged for highlighting', () => {
  const model = buildComparisonModel(pair);
  const torque = rowOf(model, 'max_torque_nm');
  assert.deepEqual(torque.cells.map((cell) => cell.differs), [false, true]);
  assert.equal(torque.allSame, false);
  assert.equal(rowOf(model, 'max_hp').allSame, true);
  assert.deepEqual(rowOf(model, 'max_hp').cells.map((cell) => cell.differs), [false, false]);
});

test('differences only needs at least two machines', () => {
  assert.deepEqual(normalizeViewOptions({ differencesOnly: true, showEmpty: true }, 1), { differencesOnly: false, showEmpty: true });
  assert.deepEqual(normalizeViewOptions({ differencesOnly: true }, 2), { differencesOnly: true, showEmpty: false });
  assert.deepEqual(normalizeViewOptions({ differencesOnly: 'yes' }, 3), { differencesOnly: false, showEmpty: false });
  const single = buildComparisonModel([fleet[0]], { differencesOnly: true });
  assert.equal(single.options.differencesOnly, false);
  assert.equal(single.totals.hiddenSame, 0);
});

test('up to four machines produce one cell per machine in every row', () => {
  const model = buildComparisonModel([fleet[0], fleet[1], fleet[2], fleet[3]], { showEmpty: true });
  assert.deepEqual(model.machines.map((card) => card.letter), ['A', 'B', 'C', 'D']);
  for (const section of model.sections) for (const row of section.rows) assert.equal(row.cells.length, 4);
});

test('model building does not mutate machines', () => {
  const before = JSON.stringify(fleet);
  buildComparisonModel(fleet.slice(0, 4), { differencesOnly: true, showEmpty: true });
  assert.equal(JSON.stringify(fleet), before);
});
