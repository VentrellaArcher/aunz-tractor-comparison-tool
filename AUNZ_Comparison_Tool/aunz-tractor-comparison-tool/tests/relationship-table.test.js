import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRelationshipResults } from '../src/js/relationships.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
const css = readFileSync(path.join(repoRoot, 'src/css/styles.css'), 'utf8');
const displaySchema = readFileSync(path.join(repoRoot, 'src/js/display-schema.js'), 'utf8');
const machines = [
  { machine_id: 'selected', machine: 'Selected', manufacturer: 'John Deere', model_year: 2025, max_hp: 100, rated_hp: 90, powerToWeightHpPerTonne: 20, top_speed_kmh: 40 },
  { machine_id: 'candidate', machine: 'Candidate', manufacturer: 'Beta', model_year: 2025, max_hp: 105, rated_hp: 95, powerToWeightHpPerTonne: 21, top_speed_kmh: 50 }
];

test('relationship results preserve selected pinning and absolute difference ordering', () => {
  const result = findRelationshipResults(machines, machines[0], 10);
  assert.equal(result.rows[0].isSelected, true);
  assert.equal(result.rows[0].machineId, 'selected');
  assert.equal(result.rows[1].absoluteMaxHpDifference, 5);
});

test('relationship rendering has the refined column contract and no Role column', () => {
  for (const label of ['Machine', 'Δ Max HP', 'Δ Max HP %', 'Power to Weight', 'Rated HP', 'Max HP', 'Transmission', 'Top Speed (km/h)', 'Rear PTO option']) assert.match(app, new RegExp(label.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(app, /<th scope="col">Role<\/th>/);
  assert.match(app, /selected-row-label/);
  assert.match(app, /relationship-summary/);
  assert.match(app, /in-comparison-row/);
  assert.match(app, /aria-label="Add/);
  assert.doesNotMatch(app, /<th scope="col">Add<\/th>/);
});

test('relationship table uses contained keyboard-focusable scrolling and sticky layers', () => {
  assert.match(app, /class="relationship-scroll" role="region"[^>]*tabindex="0"/);
  assert.match(css, /\.relationship-scroll\s*\{[^}]*max-height/s);
  assert.match(css, /\.relationship-scroll\s*\{[^}]*overflow:\s*auto/s);
  assert.match(css, /\.relationship-scroll thead th\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.relationship-scroll th:first-child, \.relationship-scroll td:first-child\s*\{[^}]*position:\s*sticky/s);
});

test('visible comparison schema excludes derived metadata rows but retains power-to-weight', () => {
  assert.doesNotMatch(displaySchema, /key: 'powerBasis'|key: 'weightBasis'|key: 'powerToWeightUnavailableReason'/);
  assert.match(displaySchema, /powerToWeightHpPerTonne/);
  assert.match(displaySchema, /powerToWeightKwPerTonne/);
});
