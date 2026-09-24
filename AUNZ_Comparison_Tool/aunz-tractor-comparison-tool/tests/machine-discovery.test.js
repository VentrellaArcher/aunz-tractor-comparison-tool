import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runNpm = (args) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: repoRoot, encoding: 'utf8' });

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
  const source = [
    readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8'),
    readFileSync(path.join(repoRoot, 'src/js/filters.js'), 'utf8'),
    readFileSync(path.join(repoRoot, 'src/js/relationships.js'), 'utf8')
  ].join('\n');
  assert.doesNotMatch(source, /john-deere-|Massey Ferguson|Case IH|New Holland/);
  assert.doesNotMatch(source, /machines\s*=\s*\[/);
});

test('source page exposes labelled keyboard-reachable discovery controls and a semantic results table target', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  for (const name of ['search', 'manufacturer', 'modelYear', 'transmission', 'topSpeed', 'cylinders', 'rearPto', 'relationshipPercentage']) {
    assert.match(app, name === 'search' || name === 'relationshipPercentage' ? new RegExp(`name="${name}"`) : new RegExp(`filterGroup\\('${name}'`));
  }
  assert.doesNotMatch(app, /name="market"|id="machine-select"/);
  assert.match(app, /role="combobox"/);
  assert.match(app, /role="listbox"/);
  assert.match(app, /<table>/);
  assert.match(app, /<caption>/);
  assert.match(app, /Reset Filters/);
});

test('unmatched search produces zero eligible machines', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /\$\{eligibleMachines\.length\} eligible machine/);
});

test('zero eligible machines clears an ineligible selected machine ID', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /state\.selectedMachineId = ''/);
  assert.match(app, /!resolveSelectedMachine\(eligibleMachines, state\.selectedMachineId\)/);
});

test('zero eligible machines produces the explicit empty-results UI state', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /No eligible machines match the active search and filters\./);
});

test('zero eligible machines does not produce the generic selection state', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /if \(eligibleMachines\.length === 0\)/);
  assert.match(app, /if \(!state\.selectedMachineId\)/);
  assert.ok(app.indexOf('if (eligibleMachines.length === 0)') < app.indexOf("if (!state.selectedMachineId)"));
});

test('stale relationship rows are cleared and result count remains zero', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /resultsNode\.innerHTML = '<p>No eligible machines match the active search and filters\.<\/p>'/);
  assert.match(app, /\$\{eligibleMachines\.length\} eligible machine/);
});

test('Reset Filters restores eligible machines and the normal unselected state', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /state\.filters = resetFilters\(\)/);
  assert.match(app, /renderDiscovery\(\);\s*renderRelationshipResults\(\);/);
  assert.match(app, /Select a machine to view Max HP relationships\./);
});

test('existing relationship behavior remains unchanged by the empty state guard', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  assert.match(app, /findRelationshipResults\(state\.data\.machines, selectedMachine, state\.relationshipPercentage\)/);
  assert.match(app, /relationship\.rows\.length/);
  assert.match(app, /<table>/);
});
