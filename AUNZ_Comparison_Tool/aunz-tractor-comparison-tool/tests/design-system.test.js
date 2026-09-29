import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(path.join(repoRoot, 'src/css/styles.css'), 'utf8');
const html = readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');
const scripts = readdirSync(path.join(repoRoot, 'src/js')).filter((file) => file.endsWith('.js')).map((file) => [file, readFileSync(path.join(repoRoot, 'src/js', file), 'utf8')]);

const rootBlock = css.match(/:root\s*\{([^}]*)\}/)[1];
const tokens = Object.fromEntries([...rootBlock.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));

function channel(value) {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (light + 0.05) / (dark + 0.05);
}

const colour = (name) => (name.startsWith('#') ? name : tokens[name]);

test('text and interface colours meet WCAG contrast on every surface they are used on', () => {
  const pairs = [
    ['--color-text', '--color-surface', 7],
    ['--color-text', '--color-page', 7],
    ['--color-text', '--color-accent-soft', 7],
    ['--color-text-secondary', '--color-surface', 7],
    ['--color-text-secondary', '--color-surface-muted', 4.5],
    ['--color-text-secondary', '--color-primary-light', 4.5],
    ['--color-text-muted', '--color-surface', 4.5],
    ['--color-text-muted', '--color-page', 4.5],
    ['--color-text-muted', '--color-surface-muted', 4.5],
    ['--color-text-muted', '--color-surface-strong', 4.5],
    ['--color-text-muted', '--color-primary-light', 4.5],
    ['--color-primary-dark', '--color-surface', 7],
    ['--color-primary-dark', '--color-primary-light', 4.5],
    ['--color-primary-dark', '--color-surface-strong', 4.5],
    ['#ffffff', '--color-primary', 4.5],
    ['#ffffff', '--color-primary-dark', 7],
    ['#ffffff', '--color-primary-deep', 7],
    ['--color-primary-deep', '--color-accent', 7],
    ['#332700', '--color-accent', 7],
    ['--color-error', '--color-error-soft', 4.5],
    ['--color-focus', '--color-surface', 3],
    ['--color-focus', '--color-page', 3],
    ['--color-focus-on-dark', '--color-primary-deep', 3],
    ['--color-control', '--color-surface', 3],
    ['--color-border-strong', '--color-surface', 3],
    ['#b9d6b4', '#1f5227', 4.5],
    ['#cfe2cc', '#1b4a23', 4.5]
  ];
  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrast(colour(foreground), colour(background));
    assert.ok(ratio >= minimum, `${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
  }
});

test('the brand palette and the approved token set are intact', () => {
  assert.equal(tokens['--color-primary'].toLowerCase(), '#367c2b');
  assert.equal(tokens['--color-accent'].toLowerCase(), '#ffd700');
  for (const token of ['--color-primary-dark', '--color-primary-light', '--color-focus', '--color-success', '--color-warning', '--color-error', '--space-1', '--radius-md', '--shadow-sm', '--content-width', '--font-size-base', '--transition-fast']) {
    assert.ok(tokens[token], `${token} is defined`);
  }
});

test('the page is self-contained: no external fonts, scripts, styles or trackers', () => {
  const sources = [['index.html', html], ['styles.css', css], ...scripts];
  for (const [name, source] of sources) {
    const withoutNamespace = source.replace(/http:\/\/www\.w3\.org\/\d+\/svg/g, '');
    assert.doesNotMatch(withoutNamespace, /https?:\/\//, `${name} references an external origin`);
    assert.doesNotMatch(source, /@import|fonts\.googleapis|fonts\.gstatic|gtag|analytics/i, `${name} pulls in an external resource`);
  }
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
});

test('the document is an accessible, static-site-friendly shell', () => {
  assert.match(html, /<html lang="en-AU">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1" \/>/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale/i, 'zooming must stay possible');
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(html, /<a class="skip-link" href="#discovery-heading">/);
  assert.match(html, /<nav class="app-bar" aria-label="Workflow">/);
  assert.match(html, /<main class="page-shell" id="main">/);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.match(html, /<noscript>/);
  assert.match(html, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/, 'root-absolute paths break project pages on GitHub Pages');
  for (const id of ['discovery-heading', 'relationships-heading', 'comparison-heading']) assert.match(html, new RegExp(`<h2 id="${id}" tabindex="-1">`));
});

test('no development text, local paths or debugging output ships in the interface', () => {
  const sources = [['index.html', html], ...scripts.filter(([name]) => !['comparison-output.js'].includes(name))];
  for (const [name, source] of sources) {
    assert.doesNotMatch(source, /TODO|FIXME|XXX|debugger|lorem ipsum/i, `${name} contains unfinished markers`);
    assert.doesNotMatch(source, /[A-Z]:\\|\/Users\/|OneDrive/, `${name} contains a local path`);
  }
  const app = scripts.find(([name]) => name === 'app.js')[1];
  assert.equal([...app.matchAll(/console\./g)].length, 1, 'only the load-failure path may write to the console');
  assert.doesNotMatch(html, /Generated catalogue loaded successfully|Loaded \d+ published/);
});

test('the interface never claims to be an official manufacturer product', () => {
  const wording = [html, ...scripts.map(([, source]) => source)].join('\n');
  assert.doesNotMatch(wording, /official (?:john deere|product|tool|partner)|authori[sz]ed by|endorsed by/i);
});

test('responsive layout, motion, contrast and print preferences are all handled', () => {
  for (const query of [/@media \(min-width: 48rem\)/, /@media \(min-width: 64rem\)/, /@media \(max-width: 48rem\)/, /@media \(max-width: 30rem\)/, /@media \(prefers-reduced-motion: reduce\)/, /@media \(forced-colors: active\)/, /@media \(pointer: coarse\)/, /@media print/]) {
    assert.match(css, query);
  }
  assert.match(css, /:focus-visible/);
  assert.match(css, /scroll-padding-top/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('the page reflows on very narrow screens instead of forcing a minimum width', () => {
  assert.doesNotMatch(css, /(?:^|\n)(?:html|body)\s*\{[^}]*min-width/, 'a fixed page width breaks 400% zoom and foldable cover screens');
  assert.match(css, /@media \(max-width: 26rem\) \{[^}]*\.app-bar \{/, 'the workflow bar tightens on phones so Help stays visible');
  assert.match(css, /@media \(max-width: 21rem\) \{\s*\.steps a\[aria-current\] \.step-label/, 'the current step label yields on the narrowest screens');
});

test('interactive controls keep a comfortable touch target', () => {
  assert.match(css, /\.btn \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.compare-toggle \{[^}]*min-width: 2\.75rem; min-height: 2\.75rem/);
  assert.match(css, /input\[type="search"\], select \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.switch \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.section-toggle \{[^}]*min-height: 2\.75rem/);
});

test('print output is the comparison alone, with markers that survive black and white', () => {
  const printBlock = css.slice(css.indexOf('@media print'));
  assert.match(printBlock, /@page \{[^}]*size: landscape/);
  for (const hidden of ['.app-bar', '.tray', '#discovery', '#relationship-results', '.comparison-actions', '.spec-list']) assert.ok(printBlock.includes(hidden), `${hidden} is hidden when printing`);
  assert.match(printBlock, /\.value-cell\.differs \{[^}]*border-left: 2pt solid/, 'differences keep a border marker without background graphics');
  assert.match(printBlock, /\.priority-row th\[scope="row"\] \{[^}]*border-left: 3pt solid/);
  assert.match(printBlock, /thead \{ display: table-header-group; \}/, 'headings repeat on every printed page');
});

test('there is a single coherent stylesheet rather than layered overrides', () => {
  assert.equal((css.match(/:root\s*\{/g) ?? []).length, 1, 'one token block');
  assert.equal((css.match(/^body\s*\{/gm) ?? []).length, 1, 'one body rule');
  assert.equal((css.match(/!important/g) ?? []).length <= 12, true, 'important is kept for hidden, motion and print only');
});
