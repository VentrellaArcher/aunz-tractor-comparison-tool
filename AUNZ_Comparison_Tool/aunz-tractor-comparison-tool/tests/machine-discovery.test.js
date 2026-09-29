import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { filterMachines, resetFilters, resolveSelectedMachine } from '../src/js/filters.js';
import { createInitialState, withFilterChange, withFiltersReset, withMachineSelected } from '../src/js/state.js';
import { FILTER_GROUPS, discoveryMarkup, resultCountText } from '../src/js/view-discovery.js';
import { noEligibleMarkup, noSelectionMarkup } from '../src/js/view-results.js';
import { fleet } from './fixtures/fleet.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runNpm = (args) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: repoRoot, encoding: 'utf8' });
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('clean build produces discovery modules and preserves generated data files', () => {
  const build = runNpm(['run', 'build']);
  assert.equal(build.status, 0, build.stderr || build.stdout);
  for (const relativePath of [
    'dist/js/filters.js',
    'dist/js/relationships.js',
    'dist/data/machines.json',
    'dist/data/manufacturers.json',
    'dist/data/model-years.json',
    'dist/data/filter-options.json',
    'dist/data/build-info.json'
  ]) {
    assert.equal(existsSync(path.join(repoRoot, relativePath)), true, `missing ${relativePath}`);
  }
});

test('diagnostic page contains relative app module, discovery controls and relationship result region', () => {
  const html = readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');
  assert.match(html, /src="\.\/js\/app\.js"/);
  for (const id of ['discovery', 'relationship-results', 'status']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8'), /filters\.js/);
  assert.match(readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8'), /relationships\.js/);
});

test('front-end modules do not embed a machine catalogue or hard-coded filter catalogue', () => {
  const source = ['app.js', 'filters.js', 'relationships.js', 'view-discovery.js', 'view-results.js', 'view-comparison.js', 'state.js', 'url-state.js']
    .map((file) => read(`src/js/${file}`))
    .join('\n');
  assert.doesNotMatch(source, /john-deere-|Massey Ferguson|Case IH|New Holland|Fendt|Kubota|Valtra|CLAAS|Deutz/);
  assert.doesNotMatch(source, /machines\s*=\s*\[/);
});

test('discovery exposes labelled keyboard-reachable controls and a semantic results table target', () => {
  const markup = discoveryMarkup({ options: { manufacturers: ['Alpha'], modelYears: ['2025'], transmission: ['CVT'], topSpeed: ['30'], cylinders: ['4'], rearPto: ['540'] }, counts: {}, filters: resetFilters(), inputValue: '', hasSelection: false, filtersOpen: true, onboardingVisible: false, eligibleCount: 1 });
  assert.match(markup, /name="search"/);
  assert.match(markup, /role="combobox"/);
  assert.match(markup, /role="listbox"/);
  assert.match(markup, /<label for="search">/);
  assert.match(markup, /Reset Filters/);
  assert.deepEqual(FILTER_GROUPS.map((group) => group.key), ['manufacturer', 'modelYear', 'transmission', 'topSpeed', 'cylinders', 'rearPto']);
  for (const group of FILTER_GROUPS) assert.match(markup, new RegExp(`<legend>${group.label}</legend>`));
  assert.doesNotMatch(markup, /name="market"|id="machine-select"/);
  const results = read('src/js/view-results.js');
  assert.match(results, /name="relationshipPercentage"/);
  assert.match(results, /<table class="results-table">/);
  assert.match(results, /<caption/);
});

test('unmatched search produces zero eligible machines', () => {
  assert.deepEqual(filterMachines(fleet, { search: 'no such tractor' }), []);
  assert.equal(resultCountText(0), '0 eligible machines');
  assert.equal(resultCountText(1), '1 eligible machine');
  assert.equal(resultCountText(316), '316 eligible machines');
});

test('an ineligible selected machine ID is cleared safely', () => {
  const selected = withMachineSelected(createInitialState(), fleet, 'jd-8r-340-2025-au');
  const excluded = withFilterChange(selected, fleet, 'manufacturer', 'Fendt', true);
  assert.equal(excluded.selectedMachineId, '');
  assert.equal(resolveSelectedMachine(filterMachines(fleet, excluded.filters), 'jd-8r-340-2025-au'), null);
  assert.match(read('src/js/app.js'), /resolveSelectedMachine\(eligible, app\.state\.selectedMachineId\)/);
});

test('zero eligible machines produces the explicit empty-results UI state', () => {
  assert.match(noEligibleMarkup(), /No eligible machines match the active search and filters\./);
  assert.match(noEligibleMarkup(), /data-action="reset-filters"/);
});

test('zero eligible machines does not produce the generic selection state', () => {
  const app = read('src/js/app.js');
  const renderResults = app.slice(app.indexOf('function renderResults()'), app.indexOf('function syncResultToggles()'));
  assert.match(renderResults, /if \(eligible\.length === 0\)/);
  assert.match(renderResults, /if \(!app\.state\.selectedMachineId\)/);
  assert.ok(renderResults.indexOf('if (eligible.length === 0)') < renderResults.indexOf('if (!app.state.selectedMachineId)'));
  assert.doesNotMatch(noEligibleMarkup(), /Select a machine/);
});

test('stale relationship rows are cleared when nothing is eligible', () => {
  const app = read('src/js/app.js');
  assert.match(app, /els\.results\.innerHTML = noEligibleMarkup\(\)/);
  assert.match(app, /els\.results\.innerHTML = noSelectionMarkup\(\)/);
});

test('Reset Filters restores eligible machines and the normal unselected state', () => {
  const filtered = withFilterChange(createInitialState(), fleet, 'manufacturer', 'Fendt', true);
  const restored = withFiltersReset(filtered, fleet);
  assert.deepEqual(restored.filters, resetFilters());
  assert.equal(filterMachines(fleet, restored.filters).length, fleet.length);
  assert.match(noSelectionMarkup(), /Select a machine to view Max HP relationships\./);
});

test('relationship candidates come from the complete published catalogue, not the discovery filters', () => {
  const app = read('src/js/app.js');
  assert.match(app, /findRelationshipResults\(machines, selectedMachine, app\.state\.relationshipPercentage\)/);
  assert.match(app, /const machines = catalogue\(\);/);
  assert.match(read('src/js/view-results.js'), /candidateCount/);
});
