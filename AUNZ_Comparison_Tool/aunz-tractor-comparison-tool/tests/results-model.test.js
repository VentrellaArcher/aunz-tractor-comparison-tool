import test from 'node:test';
import assert from 'node:assert/strict';
import { findRelationshipResults } from '../src/js/relationships.js';
import { CARD_HIGHLIGHT_KEYS, RESULT_COLUMNS, RESULT_SORTS, buildResultRows, columnsForMode, filterResultRows, isKnownSort, resultCell, sortResultRows, summariseBrands } from '../src/js/results-model.js';
import { fleet, makeMachine } from './fixtures/fleet.js';

const selected = fleet[0];
const band = (percentage, machines = fleet) => findRelationshipResults(machines, selected, percentage);
const rowsFor = (percentage = 100, machines = fleet) => buildResultRows(band(percentage, machines), selected);
const ids = (rows) => rows.map((row) => row.machineId);

test('column contract keeps every original relationship column and a focused default view', () => {
  assert.equal(RESULT_COLUMNS.length, 30);
  assert.equal(new Set(RESULT_COLUMNS.map((column) => column.key)).size, 30);
  for (const label of ['Machine', 'Δ Max HP', 'Δ Max HP %', 'Power to Weight', 'Rated HP', 'Max HP', 'Transmission', 'Top Speed (km/h)', 'Rear PTO option']) {
    assert.ok(RESULT_COLUMNS.some((column) => column.label === label), `${label} column`);
  }
  const focused = columnsForMode('key');
  assert.ok(focused.length < RESULT_COLUMNS.length);
  assert.deepEqual(columnsForMode('all'), RESULT_COLUMNS);
  assert.deepEqual(focused, RESULT_COLUMNS.filter((column) => focused.includes(column)), 'focused view preserves the original order');
  for (const key of ['machine', 'max_hp', 'max_torque_nm', 'top_speed_kmh', 'max_permissible_weight_40_kmh_kg']) {
    assert.ok(focused.some((column) => column.key === key), `${key} stays in the focused view`);
  }
  for (const key of CARD_HIGHLIGHT_KEYS) assert.ok(RESULT_COLUMNS.some((column) => column.key === key), `${key} is a real column`);
});

test('result rows carry signed differences and leave the selected machine without one', () => {
  const rows = rowsFor(100);
  assert.equal(rows[0].isSelected, true);
  assert.equal(rows[0].deltaMaxHp, null);
  const tenderer = rows.find((row) => row.machineId === 'nh-t8-410-2024-us');
  assert.equal(tenderer.deltaMaxHp, 6);
  assert.ok(Math.abs(tenderer.deltaMaxHpPercent - (6 / 374) * 100) < 1e-9);
  const lower = rows.find((row) => row.machineId === 'mf-8s-265-2023-au');
  assert.equal(lower.deltaMaxHp, -109);
  assert.deepEqual(buildResultRows({ available: false, rows: [] }, selected), []);
});

test('result cells format deltas neutrally and show a consistent missing marker', () => {
  const rows = rowsFor(100);
  const column = (key) => RESULT_COLUMNS.find((candidate) => candidate.key === key);
  const higher = rows.find((row) => row.machineId === 'nh-t8-410-2024-us');
  const lower = rows.find((row) => row.machineId === 'mf-8s-265-2023-au');
  assert.equal(resultCell(higher, column('deltaMaxHp')).text, '+6.00 hp');
  assert.equal(resultCell(higher, column('deltaMaxHp')).direction, 'delta-positive');
  assert.equal(resultCell(lower, column('deltaMaxHp')).text, '-109.00 hp');
  assert.equal(resultCell(higher, column('deltaMaxHpPercent')).text, '+1.60%');
  assert.equal(resultCell(lower, column('deltaMaxHpPercent')).text, '-29.14%');
  assert.equal(resultCell(rows[0], column('deltaMaxHp')).text, '—');
  assert.equal(resultCell(higher, column('max_torque_nm')).text, '—');
  assert.equal(resultCell(higher, column('max_torque_nm')).missing, true);
  assert.equal(resultCell(higher, column('powerToWeightHpPerTonne')).text, '—');
  assert.equal(resultCell(higher, column('unladen_weight_kg')).text, '24639 (narrow), 25546 (wide) kg', 'descriptive values stay untouched');
  assert.equal(resultCell(rows[0], column('max_hp')).text, '374 hp');
  assert.equal(resultCell(rows[0], column('machine')).text, 'John Deere 8R 340');
  const same = rows.find((row) => row.machineId === 'jd-8rt-340-2025-au');
  assert.equal(resultCell(same, column('deltaMaxHp')).text, '0.00 hp');
  assert.equal(resultCell(same, column('deltaMaxHpPercent')).text, '0.00%');
  assert.equal(resultCell(same, column('deltaMaxHp')).direction, 'delta-neutral');
});

test('sorting always pins the selected machine and defaults to closest Max HP', () => {
  const rows = rowsFor(100);
  assert.deepEqual(ids(sortResultRows(rows, 'closest')), ids(rows));
  assert.deepEqual(ids(sortResultRows(rows, 'unknown-key')), ids(rows));
  const byHpDescending = sortResultRows(rows, 'max_hp-desc');
  assert.equal(byHpDescending[0].machineId, selected.machine_id);
  assert.deepEqual(ids(byHpDescending).slice(1, 4), ['fendt-942-2025-au', 'nh-t8-410-2024-us', 'jd-8rt-340-2025-au']);
  assert.equal(sortResultRows(rows, 'max_hp-asc')[1].machineId, 'case-puma-150-2025-au');
  assert.equal(sortResultRows(rows, 'name-asc')[1].machineId, 'case-puma-150-2025-au');
});

test('sorting places missing values last in both directions and keeps ties stable', () => {
  const rows = rowsFor(100);
  const torqueHigh = sortResultRows(rows, 'max_torque_nm-desc');
  assert.equal(torqueHigh.at(-1).machineId, 'nh-t8-410-2024-us');
  assert.equal(torqueHigh[1].machineId, 'jd-8rt-340-2025-au');
  const weightLow = sortResultRows(rows, 'unladen_weight_kg-asc');
  assert.equal(weightLow.at(-1).machineId, 'nh-t8-410-2024-us', 'descriptive weight is not sortable so it goes last');
  const tied = sortResultRows(rows, 'model_year-desc');
  assert.deepEqual(ids(tied).filter((id) => ['fendt-942-2025-au', 'case-puma-150-2025-au'].includes(id)), ids(rows).filter((id) => ['fendt-942-2025-au', 'case-puma-150-2025-au'].includes(id)));
  assert.ok(RESULT_SORTS.every((sort) => isKnownSort(sort.key)));
  assert.equal(isKnownSort('price-asc'), false);
});

test('brand narrowing is view-only: it keeps the selected machine and ignores case', () => {
  const rows = rowsFor(100);
  assert.equal(filterResultRows(rows, []).length, rows.length);
  assert.deepEqual(ids(filterResultRows(rows, ['new holland'])), [selected.machine_id, 'nh-t8-410-2024-us']);
  assert.deepEqual(ids(filterResultRows(rows, ['Fendt', 'Case IH'])), [selected.machine_id, 'fendt-942-2025-au', 'case-puma-150-2025-au']);
  assert.deepEqual(ids(filterResultRows(rows, ['Nobody'])), [selected.machine_id]);
});

test('brand summary counts candidates only, largest group first', () => {
  const rows = rowsFor(100, [...fleet, makeMachine({ machine_id: 'jd-9r-2025-au', manufacturer: 'John Deere', machine: 'John Deere 9R', max_hp: 380 })]);
  assert.deepEqual(summariseBrands(rows).slice(0, 2), [{ name: 'John Deere', count: 2 }, { name: 'Case IH', count: 1 }]);
  assert.equal(summariseBrands(rows).some((entry) => entry.name === 'Demo'), false);
});
