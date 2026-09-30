import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset } from '../scripts/data-utils.mjs';
import { annotateIdentity } from '../src/js/identity.js';
import { machineName, selectionLabel } from '../src/js/filters.js';
import { makeMachine } from './fixtures/fleet.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jd = (id, year, market = 'AU', extra = {}) => makeMachine({ machine_id: id, manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: year, market, ...extra });
const byId = (machines) => Object.fromEntries(machines.map((machine) => [machine.machine_id, machine]));

test('a name that appears once keeps its plain label and shows no extra detail', () => {
  const [only] = annotateIdentity([jd('jd-8r-340-2025-au', 2025)]);
  assert.equal(only.identityDetail, '');
  assert.equal(selectionLabel(only), 'John Deere 8R 340 (2025)');
});

test('the same machine in several model years is told apart by year', () => {
  const annotated = byId(annotateIdentity([jd('a', 2023), jd('b', 2025), jd('c', 2027)]));
  assert.equal(annotated.a.identityDetail, '2023');
  assert.equal(selectionLabel(annotated.b), 'John Deere 8R 340 (2025)');
  assert.equal(selectionLabel(annotated.c), 'John Deere 8R 340 (2027)');
});

test('when two markets share a name and year the market is added, uniformly across that name', () => {
  const annotated = byId(annotateIdentity([jd('au25', 2025, 'AU'), jd('nz25', 2025, 'NZ'), jd('au27', 2027, 'AU')]));
  assert.equal(annotated.au25.identityDetail, '2025 \u00b7 AU');
  assert.equal(annotated.nz25.identityDetail, '2025 \u00b7 NZ');
  assert.equal(annotated.au27.identityDetail, '2027 \u00b7 AU', 'every machine of the shared name uses the same form');
  assert.equal(selectionLabel(annotated.nz25), 'John Deere 8R 340 (2025, NZ)');
  assert.equal(new Set(Object.values(annotated).map(selectionLabel)).size, 3);
});

test('names are grouped ignoring case and spacing, and other machines are left alone', () => {
  const machines = [jd('a', 2023), jd('b', 2025, 'AU', { machine: 'john deere 8r 340 ' }), makeMachine({ machine_id: 'other', manufacturer: 'Fendt', machine: 'Fendt 942 Vario', model_year: 2025 })];
  const annotated = byId(annotateIdentity(machines));
  assert.equal(annotated.a.identityDetail, '2023');
  assert.equal(annotated.b.identityDetail, '2025');
  assert.equal(annotated.other.identityDetail, '');
});

test('records that would still read identically fall back to their permanent ID', () => {
  const twins = annotateIdentity([jd('twin-1', 2025), jd('twin-2', 2025)]);
  assert.equal(new Set(twins.map(selectionLabel)).size, 2);
  assert.match(selectionLabel(twins[0]), /twin-1/);
});

test('records without a year or market still read differently from their siblings', () => {
  const [first, second] = annotateIdentity([jd('a', null, null), jd('b', 2025, 'AU')]);
  assert.equal(selectionLabel(first), 'John Deere 8R 340');
  assert.equal(selectionLabel(second), 'John Deere 8R 340 (2025)');
  assert.notEqual(selectionLabel(first), selectionLabel(second));
});

test('annotation copies records, never edits the published values, and is repeatable', () => {
  const source = Object.freeze([Object.freeze(jd('a', 2023)), Object.freeze(jd('b', 2025))]);
  const once = annotateIdentity(source);
  assert.notEqual(once[0], source[0]);
  assert.equal(once[0].max_hp, source[0].max_hp);
  assert.equal(source[0].identityDetail, undefined, 'the input record is untouched');
  assert.deepEqual(annotateIdentity(once), once);
  assert.deepEqual(annotateIdentity(once).map(machineName), once.map(machineName));
});

test('adding a new model year later changes labels only for that name', () => {
  const before = byId(annotateIdentity([jd('a', 2025), makeMachine({ machine_id: 'x', manufacturer: 'Fendt', machine: 'Fendt 942 Vario' })]));
  const after = byId(annotateIdentity([jd('a', 2025), jd('b', 2027), makeMachine({ machine_id: 'x', manufacturer: 'Fendt', machine: 'Fendt 942 Vario' })]));
  assert.equal(selectionLabel(before.a), selectionLabel(after.a), 'a year is already part of the plain label');
  assert.equal(after.a.identityDetail, '2025');
  assert.equal(selectionLabel(before.x), selectionLabel(after.x));
  assert.equal(after.x.identityDetail, '');
});

test('the published catalogue never produces two machines with the same label', () => {
  const catalogue = buildMachineDataset(readFileSync(path.join(repoRoot, 'data-source', 'machines.csv'), 'utf8')).publishedMachines;
  const annotated = annotateIdentity(catalogue);
  assert.equal(new Set(annotated.map(selectionLabel)).size, catalogue.length, 'labels are unique');
  assert.equal(new Set(annotated.map((machine) => machine.machine_id)).size, catalogue.length, 'IDs are unique');
  const nameCounts = new Map();
  for (const machine of annotated) nameCounts.set(machineName(machine).toLowerCase(), (nameCounts.get(machineName(machine).toLowerCase()) ?? 0) + 1);
  for (const machine of annotated) {
    if (nameCounts.get(machineName(machine).toLowerCase()) === 1) assert.equal(machine.identityDetail, '', `${machine.machine_id} has a unique name, so it needs no extra detail`);
  }
});
