import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset } from '../scripts/data-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(repoRoot, 'data-source', 'machines.csv');
const distMachinesPath = path.join(repoRoot, 'dist', 'data', 'machines.json');
const machineData = existsSync(distMachinesPath)
  ? JSON.parse(readFileSync(distMachinesPath, 'utf8'))
  : buildMachineDataset(readFileSync(csvPath, 'utf8')).publishedMachines;
const { displaySchema, displaySections } = await import('../src/js/display-schema.js');

const firstMachine = machineData[0];

function byKey(key) {
  return displaySchema.find((field) => field.key === key);
}

test('display schema has exactly one definition per display-relevant field', () => {
  const keys = displaySchema.map((field) => field.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  assert.deepEqual(duplicates, []);

  const paths = displaySchema.map((field) => field.propertyPath);
  const pathDuplicates = paths.filter((value, index) => paths.indexOf(value) !== index);
  assert.deepEqual(pathDuplicates, []);
});

test('display schema excludes helper-only fields from visible output', () => {
  const helperOnlyKeys = ['transmission_filter_tags', 'top_speed_filter', 'cylinders_filter', 'rear_pto_filter_tags'];
  for (const key of helperOnlyKeys) {
    assert.equal(byKey(key), undefined);
  }
});

test('display schema defines required keys, labels, sections and order', () => {
  for (const field of displaySchema) {
    assert.ok(field.key);
    assert.ok(field.propertyPath);
    assert.ok(field.label);
    assert.ok(field.section);
    assert.ok(typeof field.order === 'number');
  }

  const expectedOrder = [
    'Machine',
    'Power and engine',
    'Derived performance',
    'Transmission and speed',
    'Dimensions and weights',
    'Hydraulics and hitch',
    'Cab and capacities',
    'PTO',
    'Source and review'
  ];

  assert.deepEqual(displaySections, expectedOrder);
  assert.equal(displaySchema[0].section, 'Machine');
  assert.equal(displaySchema.at(-1).section, 'Source and review');
});

test('display schema keeps labels unique within section and marks priority fields', () => {
  const sectionMap = new Map();
  for (const field of displaySchema) {
    const current = sectionMap.get(field.section) ?? [];
    current.push(field.label);
    sectionMap.set(field.section, current);
  }

  for (const labels of sectionMap.values()) {
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    assert.deepEqual(duplicates, []);
  }

  for (const key of ['max_hp', 'max_torque_nm', 'max_permissible_weight_40_kmh_kg', 'top_speed_kmh']) {
    assert.equal(byKey(key).priority, true);
  }
});

test('display schema marks only scalar numeric fields as delta eligible and uses derived power-to-weight paths', () => {
  assert.equal(byKey('max_hp').numericDeltaEligible, true);
  assert.equal(byKey('max_torque_nm').numericDeltaEligible, true);
  assert.equal(byKey('transmission').numericDeltaEligible, false);
  assert.equal(byKey('powerToWeightHpPerTonne').propertyPath, 'powerToWeightHpPerTonne');
  assert.equal(byKey('powerToWeightKwPerTonne').propertyPath, 'powerToWeightKwPerTonne');
  assert.equal(byKey('powerToWeightHpPerTonne').unit, 'hp/t');
  assert.equal(byKey('powerToWeightKwPerTonne').unit, 'kW/t');
});

test('display schema includes required source and review fields', () => {
  for (const key of ['source_title', 'source_url', 'last_reviewed_date', 'notes']) {
    assert.ok(byKey(key));
  }
});

test('display schema property paths resolve against generated machine data', () => {
  for (const field of displaySchema) {
    const value = firstMachine[field.propertyPath];
    if (field.propertyPath === 'powerToWeightUnavailableReason' && firstMachine.powerToWeightAvailable === true) {
      continue;
    }
    assert.ok(value !== undefined || field.nullable === true, `${field.key} has no matching property path`);
  }
});
