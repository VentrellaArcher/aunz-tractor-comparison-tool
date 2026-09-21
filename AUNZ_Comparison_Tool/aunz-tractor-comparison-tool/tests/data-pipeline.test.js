import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function runNpm(args) {
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

import { schema } from '../scripts/schema.js';
import {
  parseCsv,
  transformSourceRows,
  buildMachineDataset,
  calculatePowerToWeight
} from '../scripts/data-utils.mjs';
import { validateCsv } from '../scripts/validate.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(repoRoot, 'data-source', 'machines.csv');
const csvText = readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvText);
const sourceHeader = rows[0];
const sourceDataRows = rows.slice(1);

function makeCsvFromRows(rowRecords) {
  const header = sourceHeader;
  return [header, ...rowRecords]
    .map((row) => row.map((value) => (value == null ? '' : String(value))).join(','))
    .join('\n') + '\n';
}

function buildRow(overrides = {}) {
  const row = [...sourceDataRows[0]];
  for (const [key, value] of Object.entries(overrides)) {
    const index = sourceHeader.indexOf(key);
    if (index >= 0) {
      row[index] = value;
    }
  }
  return row;
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

test('validateCsv rejects duplicate machine_id', () => {
  const rowA = buildRow({ machine_id: 'dup-machine-1', published: 'TRUE' });
  const rowB = buildRow({ machine_id: 'dup-machine-1', published: 'TRUE', machine: 'John Deere 5055E', manufacturer: 'John Deere', model_year: 2023, market: 'AU' });
  const report = validateCsv(makeCsvFromRows([rowA, rowB]));
  assert.ok(report.errors.some((error) => error.field === 'machine_id' && /Duplicate machine ID/.test(error.reason)));
});

test('validateCsv rejects invalid machine_id uppercase letters', () => {
  const row = buildRow({ machine_id: 'John-Deere-5050E', published: 'TRUE' });
  const report = validateCsv(makeCsvFromRows([row]));
  assert.ok(report.errors.some((error) => error.field === 'machine_id'));
});

test('validateCsv rejects invalid machine_id with spaces', () => {
  const row = buildRow({ machine_id: 'john deere 5050e', published: 'TRUE' });
  const report = validateCsv(makeCsvFromRows([row]));
  assert.ok(report.errors.some((error) => error.field === 'machine_id'));
});

test('validateCsv rejects invalid machine_id with unsupported symbols', () => {
  const row = buildRow({ machine_id: 'john_deere_5050e', published: 'TRUE' });
  const report = validateCsv(makeCsvFromRows([row]));
  assert.ok(report.errors.some((error) => error.field === 'machine_id'));
});

test('validateCsv rejects duplicate record identity', () => {
  const rowA = buildRow({ machine_id: 'dup-identity-1', published: 'TRUE', machine: 'John Deere 5050E', manufacturer: 'John Deere', model_year: 2023, market: 'AU' });
  const rowB = buildRow({ machine_id: 'dup-identity-2', published: 'TRUE', machine: 'John Deere 5050E', manufacturer: 'John Deere', model_year: 2023, market: 'AU' });
  const report = validateCsv(makeCsvFromRows([rowA, rowB]));
  assert.ok(report.errors.some((error) => /Duplicate machine, model year and market identity/.test(error.reason)));
});

test('validateCsv rejects invalid published values', () => {
  const row = buildRow({ published: 'MAYBE' });
  const report = validateCsv(makeCsvFromRows([row]));
  assert.ok(report.errors.some((error) => error.field === 'published'));
});

test('validateCsv rejects image filename without image alt text', () => {
  const row = buildRow({ image_filename: 'tractor.png', image_alt_text: null });
  const report = validateCsv(makeCsvFromRows([row]));
  assert.ok(report.errors.some((error) => error.field === 'image_alt_text'));
});

test('validateCsv rejects unexpected CSV headers', () => {
  const header = [...sourceHeader, 'unexpected_column'];
  const row = [...sourceDataRows[0], 'unexpected'];
  const report = validateCsv(makeCsvFromRows([row]).replace(sourceHeader.join(','), header.join(',')));
  assert.ok(report.errors.some((error) => /Unexpected CSV column names/.test(error.reason)));
});

test('validateCsv rejects missing expected CSV headers', () => {
  const header = sourceHeader.filter((name) => name !== 'machine_id');
  const row = sourceDataRows[0].filter((_, index) => sourceHeader[index] !== 'machine_id');
  const csvTextFixture = [header, row].map((line) => line.map((value) => (value == null ? '' : String(value))).join(',')).join('\n') + '\n';
  const report = validateCsv(csvTextFixture);
  assert.ok(report.errors.some((error) => /Unexpected or missing CSV header/.test(error.reason) || /Missing required identity field/.test(error.reason)));
});

test('transformSourceRows converts blank and sentinel values to null', () => {
  const header = ['machine_id', 'published', 'machine', 'manufacturer', 'model_year', 'market', 'unladen_weight_kg', 'max_hp'];
  const row = ['m-blank', '', 'John Deere 5050E', 'John Deere', '2023', 'AU', 'NA', 'No Data'];
  const [record] = transformSourceRows([row], header);
  assert.equal(record.published, null);
  assert.equal(record.unladen_weight_kg, null);
  assert.equal(record.max_hp, null);
});

test('transformSourceRows converts sentinel strings to null across all listed values', () => {
  const header = ['machine_id', 'published', 'machine', 'manufacturer', 'model_year', 'market', 'notes'];
  const row = ['m-sentinel', 'TRUE', 'John Deere 5050E', 'John Deere', '2023', 'AU', 'N/A'];
  const [record] = transformSourceRows([row], header);
  assert.equal(record.notes, null);
  const row2 = ['m-sentinel-2', 'FALSE', 'John Deere 5050E', 'John Deere', '2023', 'AU', '~'];
  const [record2] = transformSourceRows([row2], header);
  assert.equal(record2.notes, null);
});

test('transformSourceRows trims pipe-delimited helper arrays', () => {
  const header = ['machine_id', 'published', 'machine', 'manufacturer', 'model_year', 'market', 'transmission_filter_tags', 'rear_pto_filter_tags'];
  const row = ['m-pipe', 'TRUE', 'John Deere 5050E', 'John Deere', '2023', 'AU', ' Mechanical / Shuttle | CVT / IVT / EVT  ', ' 540E | 540 | 1000 '];
  const [record] = transformSourceRows([row], header);
  assert.deepEqual(record.transmission_filter_tags, ['Mechanical / Shuttle', 'CVT / IVT / EVT']);
  assert.deepEqual(record.rear_pto_filter_tags, ['540E', '540', '1000']);
});

test('transformSourceRows preserves complex descriptive specifications as strings', () => {
  const header = ['machine_id', 'published', 'machine', 'manufacturer', 'model_year', 'market', 'rear_hitch_capacity_kg'];
  const row = ['m-string', 'TRUE', 'Test Tractor', 'Test', '2025', 'AU', '6894, 9072'];
  const [record] = transformSourceRows([row], header);
  assert.equal(record.rear_hitch_capacity_kg, '6894, 9072');
});

test('buildMachineDataset excludes unpublished records from public output', () => {
  const header = sourceHeader;
  const published = buildRow({ machine_id: 'draft-machine-1', published: 'TRUE' });
  const unpublished = buildRow({ machine_id: 'draft-machine-2', published: 'FALSE' });
  const dataset = buildMachineDataset(makeCsvFromRows([published, unpublished]));
  assert.equal(dataset.publishedMachines.length, 1);
  assert.equal(dataset.publishedMachines[0].machine_id, 'draft-machine-1');
});

test('buildMachineDataset derives manufacturers and model years automatically', () => {
  const dataset = buildMachineDataset(csvText);
  assert.ok(dataset.manufacturers.includes('John Deere'));
  assert.ok(dataset.modelYears.includes(2025));
  assert.deepEqual(dataset.modelYears, [...dataset.modelYears].sort((a, b) => Number(b) - Number(a)));
});

test('calculatePowerToWeight returns the documented 443HP / 12700kg values', () => {
  const result = calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: 12700 });
  assert.deepEqual(result, {
    powerToWeightHpPerTonne: 34.88,
    powerToWeightKwPerTonne: 26.01,
    powerBasis: 'maxHp',
    weightBasis: 'unladenWeightKg',
    powerToWeightAvailable: true,
    powerToWeightUnavailableReason: null
  });
});

test('calculatePowerToWeight returns null ratios for missing power and missing weight', () => {
  assert.equal(calculatePowerToWeight({ max_hp: null, unladen_weight_kg: 12700 }).powerToWeightAvailable, false);
  assert.equal(calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: null }).powerToWeightAvailable, false);
});

test('calculatePowerToWeight returns null ratios for zero and negative weight', () => {
  assert.equal(calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: 0 }).powerToWeightAvailable, false);
  assert.equal(calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: -100 }).powerToWeightAvailable, false);
});

test('calculatePowerToWeight rejects descriptive and multi-option weights', () => {
  const descriptive = calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: '24639 (narrow), 25546 (wide)' });
  const multi = calculatePowerToWeight({ max_hp: 443, unladen_weight_kg: '8000 / 8900' });
  assert.equal(descriptive.powerToWeightAvailable, false);
  assert.equal(multi.powerToWeightAvailable, false);
  assert.equal(descriptive.powerToWeightUnavailableReason, 'unladen_weight_not_scalar');
  assert.equal(multi.powerToWeightUnavailableReason, 'unladen_weight_not_scalar');
});

test('build command creates all required generated JSON files and validates their structure', () => {
  const build = runNpm(['run', 'build']);
  assert.equal(build.status ?? 0, 0, build.stderr || build.stdout);

  const requiredFiles = [
    'dist/data/machines.json',
    'dist/data/manufacturers.json',
    'dist/data/model-years.json',
    'dist/data/filter-options.json',
    'dist/data/build-info.json',
    'artifacts/validation-report.json'
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(repoRoot, relPath);
    assert.equal(existsSync(fullPath), true, `missing ${relPath}`);
  }

  const machineData = JSON.parse(readFileSync(path.join(repoRoot, 'dist/data/machines.json'), 'utf8'));
  const manufacturers = JSON.parse(readFileSync(path.join(repoRoot, 'dist/data/manufacturers.json'), 'utf8'));
  const modelYears = JSON.parse(readFileSync(path.join(repoRoot, 'dist/data/model-years.json'), 'utf8'));
  const filterOptions = JSON.parse(readFileSync(path.join(repoRoot, 'dist/data/filter-options.json'), 'utf8'));
  const buildInfo = JSON.parse(readFileSync(path.join(repoRoot, 'dist/data/build-info.json'), 'utf8'));
  const validationReport = JSON.parse(readFileSync(path.join(repoRoot, 'artifacts/validation-report.json'), 'utf8'));

  assert.equal(Array.isArray(machineData), true);
  assert.equal(Array.isArray(manufacturers), true);
  assert.equal(Array.isArray(modelYears), true);
  assert.equal(typeof filterOptions, 'object');
  assert.equal(typeof buildInfo, 'object');
  assert.equal(typeof validationReport, 'object');
  assert.equal(machineData.length, buildMachineDataset(csvText).publishedMachines.length);
  assert.equal(manufacturers.length, [...new Set(buildMachineDataset(csvText).publishedMachines.map((machine) => machine.manufacturer))].length);
  assert.equal(modelYears.length, [...new Set(buildMachineDataset(csvText).publishedMachines.map((machine) => machine.model_year))].length);
});

test('source CSV hash remains unchanged after validation and build', () => {
  const beforeHash = hashFile(csvPath);
  const validateResult = runNpm(['run', 'validate']);
  assert.equal(validateResult.status ?? 0, 0, validateResult.stderr || validateResult.stdout);
  const buildResult = runNpm(['run', 'build']);
  assert.equal(buildResult.status ?? 0, 0, buildResult.stderr || buildResult.stdout);
  const afterHash = hashFile(csvPath);
  assert.equal(afterHash, beforeHash);
});

test('proof page loads generated machine data through a GitHub Pages-compatible relative path', () => {
  const build = runNpm(['run', 'build']);
  assert.equal(build.status ?? 0, 0, build.stderr || build.stdout);

  const html = readFileSync(path.join(repoRoot, 'dist/index.html'), 'utf8');
  assert.match(html, /fetch\(['"]\.\/data\/machines\.json['"]\)/);
  assert.doesNotMatch(html, /fetch\(\s*['"](?:https?:\/\/|\/|file:)/i);
  assert.equal(existsSync(path.join(repoRoot, 'dist/data/machines.json')), true);
});
