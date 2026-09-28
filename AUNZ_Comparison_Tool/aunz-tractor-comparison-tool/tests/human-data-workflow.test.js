import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset, parseCsv } from '../scripts/data-utils.mjs';
import { validateCsv } from '../scripts/validate.mjs';
import { filterMachines } from '../src/js/filters.js';
import { findRelationshipResults } from '../src/js/relationships.js';
import { displaySchema } from '../src/js/display-schema.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(repoRoot, 'data-source', 'machines.csv');
const productionCsv = readFileSync(csvPath);
const productionHash = createHash('sha256').update(productionCsv).digest('hex');
const sourceText = productionCsv.toString('utf8');
const rows = parseCsv(sourceText);
const header = rows[0];
const firstRow = rows[1];
const column = (name) => header.indexOf(name);
const csvFromRows = (fixtureRows) => [header, ...fixtureRows].map((row) => row.map((cell) => {
  const value = cell ?? '';
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}).join(',')).join('\r\n');
const copyRow = (row) => [...row];

function fixtureRow(overrides = {}) {
  const row = copyRow(firstRow);
  for (const [name, value] of Object.entries(overrides)) row[column(name)] = String(value);
  return row;
}

test('temporary existing-row edit propagates through the real transformation path', () => {
  const edited = fixtureRow({ rated_hp: '77' });
  const dataset = buildMachineDataset(csvFromRows([edited]));
  assert.equal(dataset.publishedMachines[0].rated_hp, 77);
  assert.equal(dataset.publishedMachines[0].machine_id, edited[column('machine_id')]);
  assert.equal(dataset.publishedMachines[0].max_hp, Number(firstRow[column('max_hp')]));
  assert.equal(createHash('sha256').update(readFileSync(csvPath)).digest('hex'), productionHash);
});

test('temporary added row discovers a synthetic JCB manufacturer and model year automatically', () => {
  const jcb = fixtureRow({
    machine_id: 'jcb-synthetic-9999-au',
    machine: 'JCB Synthetic 9999',
    manufacturer: 'JCB',
    model_year: '2035',
    max_hp: '250',
    rated_hp: '240',
    unladen_weight_kg: '10000',
    published: 'TRUE'
  });
  const dataset = buildMachineDataset(csvFromRows([firstRow, jcb]));
  assert.equal(dataset.publishedMachines.length, 2);
  assert.ok(dataset.manufacturers.includes('JCB'));
  assert.ok(dataset.modelYears.includes(2035));
  assert.ok(filterMachines(dataset.publishedMachines, { manufacturer: ['JCB'] }).some((machine) => machine.machine_id === 'jcb-synthetic-9999-au'));
  const selected = dataset.publishedMachines.find((machine) => machine.machine_id === 'jcb-synthetic-9999-au');
  assert.ok(findRelationshipResults(dataset.publishedMachines, selected, 100).rows.some((row) => row.machineId === firstRow[column('machine_id')]));
  assert.equal(selected.powerToWeightHpPerTonne, 25);
  assert.ok(displaySchema.some((field) => field.key === 'max_hp'));
  assert.equal(JSON.stringify(dataset.publishedMachines).includes('official'), false);
  assert.equal(createHash('sha256').update(readFileSync(csvPath)).digest('hex'), productionHash);
});

test('temporary unpublished row is excluded while source fixture counts it', () => {
  const unpublished = fixtureRow({ machine_id: 'jcb-synthetic-unpublished-au', manufacturer: 'JCB', published: 'FALSE' });
  const fixture = csvFromRows([firstRow, unpublished]);
  const dataset = buildMachineDataset(fixture);
  assert.equal(parseCsv(fixture).length - 1, 2);
  assert.equal(dataset.publishedMachines.length, 1);
  assert.equal(dataset.publishedMachines.some((machine) => machine.machine_id === 'jcb-synthetic-unpublished-au'), false);
});

test('temporary invalid fixtures block validation without repairing source text', () => {
  const duplicate = csvFromRows([firstRow, firstRow]);
  assert.ok(validateCsv(duplicate).errors.some((error) => /Duplicate machine ID|Duplicate machine/.test(error.reason)));
  const invalidId = csvFromRows([fixtureRow({ machine_id: 'JCB Synthetic Invalid' })]);
  assert.ok(validateCsv(invalidId).errors.some((error) => error.field === 'machine_id'));
  const invalidPublished = csvFromRows([fixtureRow({ published: 'MAYBE' })]);
  assert.ok(validateCsv(invalidPublished).errors.some((error) => error.field === 'published'));
  assert.equal(createHash('sha256').update(readFileSync(csvPath)).digest('hex'), productionHash);
});

test('synthetic JCB data is absent from the production source and generated catalogue', () => {
  assert.doesNotMatch(sourceText, /jcb-synthetic|JCB Synthetic/);
  const generatedPath = path.join(repoRoot, 'dist/data/machines.json');
  if (existsSync(generatedPath)) assert.doesNotMatch(readFileSync(generatedPath, 'utf8'), /jcb-synthetic|JCB Synthetic/);
});
