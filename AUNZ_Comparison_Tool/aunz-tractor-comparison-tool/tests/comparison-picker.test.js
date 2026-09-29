import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
const view = readFileSync(path.join(repoRoot, 'src/js/view-comparison.js'), 'utf8');
const css = readFileSync(path.join(repoRoot, 'src/css/styles.css'), 'utf8');

test('detailed comparison exposes a runtime-backed direct machine picker', () => {
  assert.match(view, /id="comparison-search"/);
  assert.match(view, /class="comparison-suggestion"/);
  assert.match(view, /role="combobox"/);
  assert.match(view, /role="listbox"/);
  assert.match(app, /withComparisonAdded\(before, catalogue\(\), machineId\)/);
  assert.match(app, /filterMachines\(catalogue\(\), \{ search: query \}\)/);
  assert.doesNotMatch(app + view, /machines\s*=\s*\[/);
});

test('direct comparison picker has a contained responsive suggestion surface', () => {
  assert.match(css, /\.comparison-picker/);
  assert.match(css, /\.comparison-suggestions/);
  assert.match(css, /\.comparison-picker[^}]*grid-template-columns/s);
});