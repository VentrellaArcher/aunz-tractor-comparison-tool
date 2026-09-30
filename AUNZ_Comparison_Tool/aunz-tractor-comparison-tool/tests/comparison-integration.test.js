import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runNpm = (args) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: repoRoot, encoding: 'utf8' });

test('clean build creates comparison module and preserves generated data', () => {
  const result = runNpm(['run', 'build']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const relativePath of ['dist/js/comparison.js', 'dist/data/machines.json', 'dist/data/build-info.json']) {
    assert.equal(existsSync(path.join(repoRoot, relativePath)), true, `missing ${relativePath}`);
  }
});

test('application wires comparison actions and accessible comparison region', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  const results = readFileSync(path.join(repoRoot, 'src/js/view-results.js'), 'utf8');
  const comparison = readFileSync(path.join(repoRoot, 'src/js/view-comparison.js'), 'utf8');
  const model = readFileSync(path.join(repoRoot, 'src/js/comparison-model.js'), 'utf8');
  const html = readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');
  assert.match(app, /toggleRelationshipRow/);
  assert.match(results, /aria-label="Add/);
  assert.match(comparison, /Clear Comparison/);
  assert.match(model, /displaySchema/);
  assert.match(model, /calculateDelta/);
  assert.match(comparison, /remove-comparison/);
  assert.match(html, /id="comparison-heading"/);
  assert.match(html, /id="comparison-status"/);
  assert.match(html, /id="comparison"/);
});

test('comparison UI does not embed machine records or unsupported features', () => {
  const source = ['app.js', 'comparison.js', 'comparison-model.js', 'view-comparison.js', 'view-results.js']
    .map((file) => readFileSync(path.join(repoRoot, 'src/js', file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(source, /john-deere-|Massey Ferguson|Case IH|New Holland/);
  assert.doesNotMatch(source, /navigator\.clipboard|\.csv|window\.print|image-gallery/i);
});
