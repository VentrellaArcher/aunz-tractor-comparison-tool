import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runNpm = (args) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: repoRoot, encoding: 'utf8' });

test('clean build creates comparison output module and preserves generated data', () => {
  const result = runNpm(['run', 'build']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(path.join(repoRoot, 'dist/js/comparison-output.js')), true);
  assert.equal(existsSync(path.join(repoRoot, 'dist/data/machines.json')), true);
});

test('application exposes labelled output actions and accessible output status', () => {
  const app = readFileSync(path.join(repoRoot, 'src/js/app.js'), 'utf8');
  const html = readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');
  for (const action of ['Copy Comparison', 'Export CSV', 'Print Comparison']) assert.match(app, new RegExp(action));
  assert.match(html, /id="output-status"/);
  assert.match(app, /comparison-output\.js/);
});

test('print stylesheet hides controls and preserves comparison content', () => {
  const css = readFileSync(path.join(repoRoot, 'src/css/styles.css'), 'utf8');
  assert.match(css, /@media print/);
  assert.match(css, /#discovery/);
  assert.match(css, /#relationship-results/);
  assert.match(css, /\.comparison-actions/);
  assert.match(css, /\.comparison-scroll/);
});

test('output source does not add unsupported export or print features', () => {
  const source = readFileSync(path.join(repoRoot, 'src/js/comparison-output.js'), 'utf8');
  assert.doesNotMatch(source, /xlsx|\.pdf|navigator\.share|image-gallery/i);
});
