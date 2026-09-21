import test from 'node:test';
import assert from 'node:assert/strict';
import { displaySchema } from '../src/js/display-schema.js';
import { copyComparison, createCsvText, createOutputModel, createPlainText, createSafeFilename, downloadCsv, escapeCsvCell, outputAvailability, printComparison } from '../src/js/comparison-output.js';

const machines = [
  { machine_id: 'a', manufacturer: 'Alpha', machine: 'A, One', model_year: 2025, market: 'AU', max_hp: 100, transmission: 'CVT / IVT / EVT', source_title: 'Source "One"', source_url: 'https://example.test/a', notes: 'Full, descriptive value', powerToWeightAvailable: true, powerToWeightHpPerTonne: 20, powerToWeightKwPerTonne: 14.91, powerBasis: 'maxHp', weightBasis: 'unladenWeightKg' },
  { machine_id: 'b', manufacturer: 'Beta', machine: 'B', model_year: 2025, market: 'AU', max_hp: 120, transmission: '8000 / 9000', source_title: 'Source B', source_url: 'https://example.test/b', notes: '=unsafe', powerToWeightAvailable: true, powerToWeightHpPerTonne: 24, powerToWeightKwPerTonne: 17.9, powerBasis: 'maxHp', weightBasis: 'unladenWeightKg' }
];
const state = { machineIds: ['a', 'b'] };
const empty = { machineIds: [] };
const buildInfo = { buildDate: '2026-09-21T00:00:00.000Z', version: 'test' };

test('empty comparison produces unavailable output state and actions', () => {
  const model = createOutputModel(empty, machines, buildInfo);
  assert.equal(model.available, false);
  assert.deepEqual(outputAvailability(empty, machines), { available: false, reason: 'comparison_empty' });
  assert.equal(createPlainText(model), '');
  assert.equal(createCsvText(model), '');
});

test('output model preserves order, headings, sections, fields, units and metadata', () => {
  const model = createOutputModel(state, machines, buildInfo);
  assert.equal(model.available, true);
  assert.deepEqual(model.machines.map((machine) => machine.machineId), ['a', 'b']);
  assert.equal(model.machines[0].baseline, true);
  assert.deepEqual(model.sections.map((section) => section.section), ['Machine', 'Power and engine', 'Derived performance', 'Transmission and speed', 'Dimensions and weights', 'Hydraulics and hitch', 'Cab and capacities', 'PTO', 'Source and review']);
  assert.equal(model.sections.flatMap((section) => section.fields).length, displaySchema.length);
  assert.ok(model.sections.some((section) => section.section === 'Source and review'));
  assert.ok(model.sections.some((section) => section.section === 'Derived performance'));
  assert.equal(model.buildInfo.version, 'test');
});

test('plain text is structured, complete, ordered and free of visible HTML', () => {
  const text = createPlainText(createOutputModel(state, machines, buildInfo));
  assert.match(text, /AU\/NZ Tractor Comparison Tool/);
  assert.match(text, /Machine A \(baseline\)/);
  assert.ok(text.indexOf('Alpha') < text.indexOf('Beta'));
  assert.match(text, /Source and review/);
  assert.match(text, /Power-to-weight ratio/);
  assert.match(text, /maxHp/);
  assert.match(text, /\+20 hp/);
  assert.doesNotMatch(text, /<[^>]+>/);
  assert.doesNotMatch(text, /Copy Comparison|Export CSV|Print Comparison/);
});

test('CSV includes ordered machine columns, fields, deltas and escaping', () => {
  const csv = createCsvText(createOutputModel(state, machines, buildInfo));
  assert.match(csv, /Section,Specification,Unit/);
  assert.match(csv, /Machine A \(baseline\)/);
  assert.match(csv, /Delta B - A/);
  assert.match(csv, /"A, One"/);
  assert.match(csv, /"Source ""One"""/);
  assert.match(csv, /https:\/\/example\.test\/a/);
  assert.match(csv, /Source and review/);
  assert.match(csv, /Derived performance/);
  assert.match(csv, /'\=unsafe/);
  assert.doesNotMatch(csv, /transmission_filter_tags/);
});

test('CSV formula protection preserves numeric and negative delta text', () => {
  assert.equal(escapeCsvCell('=formula'), "'=formula");
  assert.equal(escapeCsvCell(' +text'), "' +text");
  assert.equal(escapeCsvCell('5'), '5');
  assert.equal(escapeCsvCell('-5 hp'), '-5 hp');
});

test('filename is deterministic and safe', () => {
  assert.equal(createSafeFilename('2026-09-21T12:00:00.000Z'), 'aunz-tractor-comparison-2026-09-21.csv');
});

test('clipboard success and failure are reported through injectable boundary', async () => {
  const model = createOutputModel(state, machines, buildInfo);
  let copied = '';
  assert.deepEqual(await copyComparison(model, { writeText: async (text) => { copied = text; } }), { ok: true, message: 'Comparison copied successfully.' });
  assert.match(copied, /Machine A/);
  assert.deepEqual(await copyComparison(model, { writeText: async () => { throw new Error('denied'); } }), { ok: false, message: 'Copy failed. Check clipboard permissions and try again.' });
  assert.match((await copyComparison(createOutputModel(empty, machines), { writeText: async () => {} })).message, /unavailable/);
});

test('CSV download uses Blob, safe filename and revokes object URL', () => {
  let revoked = false;
  let clicked = false;
  const browser = {
    Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => { revoked = true; } },
    document: { createElement: () => ({ click: () => { clicked = true; } }) }
  };
  assert.deepEqual(downloadCsv(createOutputModel(state, machines, buildInfo), browser), { ok: true, message: 'CSV export started.' });
  assert.equal(clicked, true);
  assert.equal(revoked, true);
});

test('print invokes injectable boundary exactly once and preserves empty availability', () => {
  let calls = 0;
  const model = createOutputModel(state, machines, buildInfo);
  assert.deepEqual(printComparison(model, () => { calls += 1; }), { ok: true, message: 'Print dialog initiated.' });
  assert.equal(calls, 1);
  assert.match(printComparison(createOutputModel(empty, machines), () => { calls += 1; }).message, /unavailable/);
});
