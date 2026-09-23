import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(path.join(repoRoot, 'src/css/styles.css'), 'utf8');
const html = readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');

test('visual design defines the approved token system and uses it in the interface', () => {
  for (const token of [
    '--color-primary', '--color-primary-dark', '--color-primary-light', '--color-accent',
    '--color-focus', '--color-success', '--color-warning', '--color-error', '--space-1',
    '--radius-md', '--shadow-sm', '--content-width', '--font-size-base', '--transition-fast'
  ]) assert.match(css, new RegExp(`${token}:`));
  assert.match(css, /#367c2b/i);
  assert.match(css, /#ffd700/i);
  assert.doesNotMatch(css, /@import|fonts\.googleapis|tailwind|bootstrap/i);
  assert.match(css, /var\(--color-primary\)/);
  assert.match(css, /var\(--color-surface\)/);
});

test('visual design preserves workflow hooks and accessible state treatments', () => {
  for (const hook of ['site-header', 'catalogue-summary', 'discovery-section', 'relationships-section', 'comparison-section-wrapper']) {
    assert.match(html, new RegExp(`class="[^"]*${hook}`));
  }
  for (const id of ['output-status', 'comparison-status']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.selected-row/);
  assert.match(css, /\.priority-row/);
  assert.match(css, /\.baseline-label/);
  assert.match(css, /\.delta/);
  assert.match(css, /button:disabled/);
});

test('visual design covers required responsive widths and local table scrolling', () => {
  assert.match(css, /@media\s*\(min-width:\s*48rem\)/);
  assert.match(css, /@media\s*\(min-width:\s*64rem\)/);
  assert.match(css, /@media\s*\(max-width:\s*48rem\)/);
  assert.match(css, /\.comparison-scroll\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /overflow-x:\s*clip|overflow-x:\s*hidden/);
});

test('print styling preserves comparison data while hiding workflow controls', () => {
  assert.match(css, /@media print/);
  for (const selector of ['#discovery', '#relationship-results', '.comparison-actions', '.comparison-controls button']) {
    const escapedSelector = selector.replace(/[.#]/g, '\\$&');
    assert.match(css, new RegExp(`${escapedSelector}[^}]*display:\\s*none`, 's'));
  }
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /thead\s*\{[^}]*display:\s*table-header-group/s);
});