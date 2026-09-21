import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { schema } from '../scripts/schema.js';
import { parseCsv, transformSourceRows, buildMachineDataset } from '../scripts/data-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(repoRoot, 'data-source', 'machines.csv');
const csvText = readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvText);
const sourceHeaders = rows[0];
const dataRows = rows.slice(1);
const published = buildMachineDataset(csvText).publishedMachines;

test('schema covers each CSV column once', () => {
  const sourceNames = schema.map((field) => field.source);
  const missing = sourceHeaders.filter((name) => !sourceNames.includes(name));
  const extra = sourceNames.filter((name) => !sourceHeaders.includes(name));
  assert.deepEqual(missing, []);
  assert.deepEqual(extra, []);
  assert.equal(sourceNames.length, sourceHeaders.length);
  assert.equal(new Set(sourceNames).size, sourceNames.length);
});

test('CSV parsing preserves descriptive strings and normalizes missing values', () => {
  const record = transformSourceRows(dataRows, sourceHeaders)[0];
  assert.equal(record.machine_id, 'john-deere-5050e-2023-au');
  assert.equal(record.published, true);
  assert.equal(record.transmission, '9F/3R TSS');
  assert.equal(Array.isArray(record.transmission_filter_tags), true);
  assert.equal(record.transmission_filter_tags.length, 1);
  assert.equal(record.unladen_weight_kg, 2500);
  assert.equal(record.max_hydraulic_flow_lpm, 68.8);
  assert.deepEqual(record.rear_pto_filter_tags.slice(0, 2), ['540E', '540']);
});

test('published output excludes unpublished rows and calculates power-to-weight', () => {
  assert.ok(published.length > 0);
  assert.ok(published.every((machine) => machine.published === true));
  const first = published[0];
  assert.equal(first.powerToWeightHpPerTonne, 20);
  assert.ok(Number.isFinite(first.powerToWeightKwPerTonne));
});
