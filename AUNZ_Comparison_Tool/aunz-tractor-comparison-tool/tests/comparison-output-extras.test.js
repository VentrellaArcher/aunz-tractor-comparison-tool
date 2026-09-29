import test from 'node:test';
import assert from 'node:assert/strict';
import { copyLink, createCsvText, createOutputModel, createPlainText, writeClipboard } from '../src/js/comparison-output.js';
import { displaySchema } from '../src/js/display-schema.js';
import { fleet } from './fixtures/fleet.js';

const model = createOutputModel({ machineIds: ['jd-8r-340-2025-au', 'nh-t8-410-2024-us'] }, fleet, { buildDate: '2026-09-29T00:00:00.000Z', version: 'test' });

test('exports name machines once, without repeating the brand', () => {
  const text = createPlainText(model);
  assert.match(text, /Machine A \(baseline\): John Deere 8R 340 \(2025\), market AU/);
  assert.match(text, /Compared machine: New Holland T8\.410 \*US SPEC\* \(2024\), market US/);
  assert.doesNotMatch(text, /John Deere John Deere|New Holland New Holland/);
  const csv = createCsvText(model);
  assert.match(csv, /Machine A \(baseline\): John Deere 8R 340 \(2025\)/);
  assert.doesNotMatch(csv, /John Deere John Deere|New Holland New Holland/);
});

test('exports still include every display field, including empty ones', () => {
  const lines = createCsvText(model).trim().split('\r\n');
  assert.equal(lines.length, displaySchema.length + 1, 'a header plus every display row');
  assert.ok(lines.some((line) => line.startsWith('Source and review,Notes')));
});

test('link copying reports success and failure through the injectable clipboard', async () => {
  let copied = '';
  assert.deepEqual(await copyLink('https://example.test/?c=a', { writeText: async (text) => { copied = text; } }), { ok: true, message: 'Link copied. Opening it restores this selection and comparison.' });
  assert.equal(copied, 'https://example.test/?c=a');
  const failed = await copyLink('https://example.test/', { writeText: async () => { throw new Error('denied'); } });
  assert.equal(failed.ok, false);
  assert.match(failed.message, /Copy failed/);
});

test('clipboard writing falls back to a selection copy when the async API is blocked', async () => {
  const appended = [];
  let copyCalls = 0;
  const field = { value: '', attributes: {}, style: {}, setAttribute(name, value) { this.attributes[name] = value; }, select() {}, remove() { appended.splice(appended.indexOf(this), 1); } };
  const doc = { body: { appendChild: (node) => appended.push(node) }, createElement: () => field, execCommand: (command) => { copyCalls += 1; return command === 'copy'; } };
  assert.equal(await writeClipboard('hello', { writeText: async () => { throw new Error('denied'); } }, doc), true);
  assert.equal(field.value, 'hello');
  assert.equal(copyCalls, 1);
  assert.equal(appended.length, 0, 'the temporary field is removed');
  assert.equal(await writeClipboard('hello', undefined, { ...doc, execCommand: () => false }), false);
  assert.equal(await writeClipboard('hello', undefined, undefined), false);
});
