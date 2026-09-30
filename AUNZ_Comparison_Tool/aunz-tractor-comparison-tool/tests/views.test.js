import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRelationshipResults } from '../src/js/relationships.js';
import { buildResultRows, sortResultRows, summariseBrands } from '../src/js/results-model.js';
import { buildComparisonModel } from '../src/js/comparison-model.js';
import { getFacetCounts, getFilterOptions, resetFilters } from '../src/js/filters.js';
import { annotateIdentity } from '../src/js/identity.js';
import { deltaMarkup, escapeHtml, notApplicableMarkup, valueMarkup } from '../src/js/view-html.js';
import { FILTER_GROUPS, activeFiltersMarkup, discoveryMarkup, filterGroup, searchNoteMarkup, suggestionsMarkup } from '../src/js/view-discovery.js';
import { bandControlMarkup, cardMoreMarkup, compareToggleMarkup, resultsMarkup } from '../src/js/view-results.js';
import { comparisonMarkup, comparisonPickerMarkup, emptyComparisonWithPickerMarkup, hiddenRowsNote, pickerSuggestionsMarkup, trayMarkup } from '../src/js/view-comparison.js';
import { catalogueSummaryMarkup, formatBuildDate, toastMarkup, yearRange } from '../src/js/view-shell.js';
import { helpMarkup } from '../src/js/view-help.js';
import { fleet, makeMachine } from './fixtures/fleet.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');
const selected = fleet[0];
const relationship = findRelationshipResults(fleet, selected, 100);
const rows = buildResultRows(relationship, selected);

function results(layout, overrides = {}) {
  return resultsMarkup({ selectedMachine: selected, relationship, rows, visibleRows: sortResultRows(rows, 'closest'), brands: summariseBrands(rows), results: { sort: 'closest', brands: [], columns: 'key' }, comparisonIds: [fleet[1].machine_id], layout, ...overrides });
}

test('every dynamic value is escaped, including hostile machine names', () => {
  assert.equal(escapeHtml(`<b onclick="x">&'`), '&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;');
  const hostile = makeMachine({ machine_id: 'evil-1', manufacturer: 'Evil', machine: '<img src=x onerror=alert(1)>', market: '"><script>' });
  const machines = [selected, hostile];
  const rel = findRelationshipResults(machines, selected, 100);
  const hostileRows = buildResultRows(rel, selected);
  for (const layout of ['table', 'cards']) {
    const html = resultsMarkup({ selectedMachine: selected, relationship: rel, rows: hostileRows, visibleRows: hostileRows, brands: summariseBrands(hostileRows), results: { sort: 'closest', brands: [], columns: 'all' }, comparisonIds: [], layout });
    assert.doesNotMatch(html, /<img src=x|<script>/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  }
  const model = buildComparisonModel([selected, hostile], { showEmpty: true });
  const comparison = comparisonMarkup({ model, pickerQuery: '"><script>alert(1)</script>', collapsed: new Set() });
  assert.doesNotMatch(comparison, /<img src=x|<script>alert/);
  assert.doesNotMatch(suggestionsMarkup([hostile], 0), /<img src=x/);
  assert.doesNotMatch(pickerSuggestionsMarkup([hostile], 0), /<img src=x/);
  assert.doesNotMatch(searchNoteMarkup('<script>x</script>', { query: '"><b>', count: 1 }), /<script>|<b>/);
  assert.doesNotMatch(toastMarkup('<i>x</i>', '<u>Undo</u>'), /<i>|<u>/);
  assert.doesNotMatch(activeFiltersMarkup({ ...resetFilters(), search: '<script>' }), /<script>/);
});

test('missing and not-applicable values use one dash and explain themselves to assistive technology', () => {
  assert.match(valueMarkup('—', true), /aria-hidden="true">—<\/span><span class="visually-hidden">No published value/);
  assert.doesNotMatch(valueMarkup('374 hp', false), /visually-hidden/);
  assert.match(notApplicableMarkup('Selected machine'), /Selected machine/);
});

test('deltas are neutral: shape and words, never a good or bad colour class', () => {
  const up = deltaMarkup({ available: true, direction: 'delta-positive', text: '+4.00 hp' });
  const down = deltaMarkup({ available: true, direction: 'delta-negative', text: '-4.00 hp' });
  const same = deltaMarkup({ available: true, direction: 'delta-neutral', text: '0.00 hp' });
  assert.match(up, /▲/);
  assert.match(down, /▼/);
  assert.match(same, /=/);
  for (const html of [up, down, same]) assert.match(html, /Difference from baseline: /);
  assert.doesNotMatch(up + down + same, /better|worse|good|bad|advantage|success|danger/i);
  assert.match(deltaMarkup({ available: false, direction: 'delta-neutral', text: '—' }), /Difference unavailable/);
  assert.equal(deltaMarkup(null), '');
  const css = read('src/css/styles.css');
  for (const cls of ['delta-positive', 'delta-negative']) assert.doesNotMatch(css, new RegExp(`\\.${cls}[^{]*\\{[^}]*color:\\s*var\\(--color-(?:success|error)`), `${cls} must not use success or error colours`);
});

test('the comparison toggle is a native checkbox whose state is the membership', () => {
  const off = compareToggleMarkup(selected, false);
  const on = compareToggleMarkup(selected, true, true);
  assert.match(off, /<input type="checkbox"[^>]*data-action="toggle-compare"[^>]*data-machine-id="jd-8r-340-2025-au"/);
  assert.match(off, /aria-label="Add John Deere 8R 340 \(2025\) to comparison"/);
  assert.doesNotMatch(off, / checked/);
  assert.match(on, / checked/);
  assert.match(on, />Add<\/span>/);
});

test('results render one representation for the current screen size, never both', () => {
  const table = results('table');
  const cards = results('cards');
  assert.match(table, /<table class="results-table">/);
  assert.doesNotMatch(table, /results-cards/);
  assert.match(cards, /class="results-cards"/);
  assert.doesNotMatch(cards, /<table/);
  assert.match(table, /class="relationship-scroll" role="region" aria-label="Max HP relationship results" tabindex="0"/);
  assert.match(table, /<caption class="visually-hidden">Max HP relationship results for John Deere 8R 340 \(2025\)<\/caption>/);
  assert.match(table, /<th scope="col">Machine<\/th>/);
  assert.match(table, /aria-current="true"/);
  assert.match(table, /class="selected-row in-comparison-row|class="selected-row"/);
  assert.match(table, /name="resultColumns"/);
  assert.doesNotMatch(cards, /name="resultColumns"/, 'column choice only applies to the table');
});

test('the relationship summary keeps the documented rule wording and band range', () => {
  const html = results('table');
  assert.match(html, /role="group" aria-label="Relationship summary"/);
  assert.match(html, /Within 100% of Max HP/);
  assert.match(html, /0\.00–748\.00 hp/);
  assert.match(html, /6 machines/);
});

test('band control offers exactly the supported percentages and checks the current one', () => {
  const html = bandControlMarkup(20);
  const values = [...html.matchAll(/name="relationshipPercentage" value="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(values, [0, 5, 10, 15, 20, 30, 50, 100]);
  assert.match(html, /value="20" data-focus-key="band:20" checked/);
  assert.equal((html.match(/ checked/g) ?? []).length, 1);
});

test('narrowing by manufacturer is announced and reversible', () => {
  const html = results('table', { results: { sort: 'closest', brands: ['Fendt'], columns: 'key' }, visibleRows: rows.filter((row) => row.isSelected || row.machine.manufacturer === 'Fendt') });
  assert.match(html, /Showing 1 of 6 machines in range/);
  assert.match(html, /data-action="clear-brands"/);
  const none = results('table', { results: { sort: 'closest', brands: ['Fendt'], columns: 'key' }, visibleRows: rows.filter((row) => row.isSelected) });
  assert.match(none, /No machines from the chosen manufacturers are in this range\./);
});

test('card details are only built when opened and stay complete', () => {
  assert.doesNotMatch(results('cards'), /Rated hydraulic pump flow/);
  const more = cardMoreMarkup(rows[1]);
  for (const label of ['Rated HP', 'Wheelbase (mm)', 'Rear PTO option', 'Engine manufacturer']) assert.match(more, new RegExp(label.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(more, />Max HP</, 'headline specifications are not repeated in the extra list');
});

test('filter groups show live counts, disable dead ends and keep chosen values enabled', () => {
  const html = filterGroup('manufacturer', 'Manufacturer', ['Alpha', 'Beta', 'Gamma'], 'checkbox', (value) => value, ['Gamma'], { Alpha: 3, Beta: 0, Gamma: 0 });
  assert.match(html, /value="Alpha"[^>]*><span class="chip"><span class="chip-label">Alpha<\/span><span class="chip-count" data-count>3<\/span>/);
  assert.match(html, /value="Beta" disabled/);
  assert.doesNotMatch(html, /value="Gamma"[^>]*disabled/);
  assert.match(html, /value="Gamma" checked/);
  const speed = filterGroup('topSpeed', 'Top Speed', ['30', '40'], 'radio', (value) => `${value} km/h and up`, '40', { 30: 5, 40: 2 });
  assert.match(speed, /type="radio" name="topSpeed"[^>]*value=""/);
  assert.match(speed, /value="40" checked/);
  assert.match(speed, /40 km\/h and up/);
});

test('discovery markup exposes a labelled combobox, the six documented filter groups and a reset control', () => {
  const html = discoveryMarkup({ options: getFilterOptions(fleet), counts: getFacetCounts(fleet), filters: resetFilters(), inputValue: '', hasSelection: false, filtersOpen: true, onboardingVisible: true, eligibleCount: fleet.length });
  assert.match(html, /<label for="search">Primary machine<\/label>/);
  assert.match(html, /role="combobox" aria-autocomplete="list" aria-controls="machine-suggestions" aria-expanded="false"/);
  assert.match(html, /<ul id="machine-suggestions" class="suggestions" role="listbox"/);
  assert.equal([...html.matchAll(/<fieldset class="filter-group"/g)].length, FILTER_GROUPS.length);
  assert.match(html, /id="reset-filters"[^>]*data-action="reset-filters"[^>]*hidden/);
  assert.match(html, /<details class="onboarding" open><summary>/);
  assert.match(discoveryMarkup({ options: getFilterOptions(fleet), counts: getFacetCounts(fleet), filters: resetFilters(), inputValue: '', hasSelection: false, filtersOpen: false, onboardingVisible: true, onboardingOpen: false, eligibleCount: fleet.length }), /<details class="onboarding"><summary>/);
  assert.doesNotMatch(html, /<aside/);
  assert.match(html, /<details class="filter-panel" id="filter-panel" open>/);
});

test('suggestions expose option semantics and say when more exist', () => {
  const html = suggestionsMarkup(fleet.slice(0, 3), 1, 12);
  assert.equal([...html.matchAll(/role="option"/g)].length, 3);
  assert.match(html, /id="suggestion-1" role="option" class="suggestion" aria-selected="true"/);
  assert.match(html, /Showing 3 of 12/);
  assert.doesNotMatch(suggestionsMarkup(fleet.slice(0, 3), 0, 3), /Showing/);
});

test('an empty search explains itself and offers a correction only when one exists', () => {
  assert.equal(searchNoteMarkup('', null), '');
  assert.match(searchNoteMarkup('zzz', null), /No machines match “zzz”\. Check the spelling/);
  assert.match(searchNoteMarkup('fent', { query: 'Fendt', count: 25 }), /Did you mean <button[^>]*data-action="apply-correction" data-query="Fendt">Fendt<\/button> \(25\)\?/);
});

test('comparison markup has semantic table structure and a spec list for narrow screens', () => {
  const model = buildComparisonModel([fleet[0], fleet[1], fleet[2]]);
  const html = comparisonMarkup({ model, pickerQuery: '', collapsed: new Set() });
  assert.match(html, /<table class="comparison-table">/);
  assert.match(html, /<thead><tr><th scope="col" class="spec-col">Specification<\/th>/);
  assert.equal([...html.matchAll(/<th scope="col" class="machine-col/g)].length, 3);
  assert.match(html, /<th colspan="4" scope="rowgroup">/);
  assert.match(html, /class="spec-list" role="region" aria-label="Detailed comparison by specification"/);
  assert.match(html, /<th scope="row">Max HP <span class="priority">Priority<\/span><\/th>/);
  for (const action of ['Copy Comparison', 'Export CSV', 'Print Comparison', 'Copy link', 'Clear Comparison']) assert.match(html, new RegExp(action));
  assert.match(html, /3 of 4 comparison slots in use\./);
  assert.match(html, /class="baseline-label">Baseline/);
  assert.equal([...html.matchAll(/data-action="make-baseline"/g)].length, 2, 'the baseline machine has no Make baseline button');
  assert.equal([...html.matchAll(/data-action="remove-from-comparison"/g)].length, 3);
  assert.match(html, /aria-label="Remove John Deere 8R 340 \(2025\) from comparison"/);
});

test('collapsed sections render no rows and report their state to assistive technology', () => {
  const model = buildComparisonModel([fleet[0], fleet[1]]);
  const html = comparisonMarkup({ model, pickerQuery: '', collapsed: new Set(['Power and engine']) });
  assert.match(html, /data-section="Power and engine"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*data-section="Power and engine"/);
  const collapsedBody = html.match(/<tbody class="comparison-section is-collapsed" data-section="Power and engine">[\s\S]*?<\/tbody>/)[0];
  assert.doesNotMatch(collapsedBody, /<td/);
  assert.match(html, /aria-expanded="true"/);
});

test('view options reflect the model and differences-only needs two machines', () => {
  const one = comparisonMarkup({ model: buildComparisonModel([fleet[0]], { differencesOnly: true }), pickerQuery: '', collapsed: new Set() });
  assert.match(one, /data-action="toggle-differences"[^>]*disabled/);
  assert.match(one, /disabled aria-describedby="diff-note"/, 'the disabled switch points at its explanation');
  assert.match(one, /<p id="diff-note" class="switch-note">Add a second machine to use this\.<\/p>/);
  const two = comparisonMarkup({ model: buildComparisonModel([fleet[0], fleet[1]], { differencesOnly: true, showEmpty: true }), pickerQuery: '', collapsed: new Set() });
  assert.doesNotMatch(two, /diff-note/, 'no explanation once the control is usable');
  assert.match(two, /data-action="toggle-differences" data-focus-key="diff" checked/);
  assert.match(two, /data-action="toggle-empty" data-focus-key="empty" checked/);
  assert.match(hiddenRowsNote({ hiddenEmpty: 1, hiddenSame: 3 }), /1 row with no published value for these machines is hidden\. 3 rows with identical values are hidden\./);
  assert.equal(hiddenRowsNote({ hiddenEmpty: 0, hiddenSame: 0 }), '');
});

test('the direct picker is a labelled combobox and locks when the comparison is full', () => {
  const open = comparisonPickerMarkup('fend', false);
  assert.match(open, /<label for="comparison-search">Add a machine directly<\/label>/);
  assert.match(open, /role="combobox"[^>]*aria-controls="comparison-suggestions"/);
  assert.doesNotMatch(open, / disabled/);
  const full = comparisonPickerMarkup('', true);
  assert.match(full, / disabled/);
  assert.match(full, /Comparison is full \(4 of 4\)\./);
  assert.match(emptyComparisonWithPickerMarkup(''), /No machines are currently compared\./);
});

test('the tray lists every machine with a labelled remove control and says when it is full', () => {
  const cards = buildComparisonModel(fleet.slice(0, 4)).machines.map((card) => ({ id: card.id, letter: card.letter, isBaseline: card.isBaseline, name: card.name, label: card.label }));
  const html = trayMarkup(cards);
  assert.match(html, /<strong>4<\/strong> of 4 selected · full/);
  assert.equal([...html.matchAll(/class="tray-remove"/g)].length, 4);
  assert.match(html, /href="#comparison-heading"/);
  assert.doesNotMatch(trayMarkup(cards.slice(0, 2)), /· full/);
});

test('page furniture formats dates, year ranges and facts without inventing values', () => {
  assert.match(formatBuildDate('2026-09-29T12:00:00.000Z', { timeZone: 'UTC' }), /^29 Sep(?:t)? 2026$/, 'month abbreviation differs between ICU versions');
  assert.equal(formatBuildDate(''), null);
  assert.equal(formatBuildDate('not a date'), null);
  assert.equal(yearRange([2013, 2027, 2025]), '2013–2027');
  assert.equal(yearRange([2025, 2025]), '2025');
  assert.equal(yearRange([]), 'Not available');
  const facts = catalogueSummaryMarkup({ machineCount: 316, manufacturerCount: 9, years: [2013, 2027], buildDate: null });
  assert.match(facts, /<dt>Published machines<\/dt><dd>316<\/dd>/);
  assert.match(facts, /<dt>Data updated<\/dt><dd>Not available<\/dd>/);
});

test('help content covers the workflow, the data rules and the keyboard', () => {
  const html = helpMarkup();
  assert.match(html, /id="help-title"/);
  assert.match(html, /aria-label="Close help"/);
  assert.match(html, /neutral and do not rank machines/);
  assert.match(html, /Nothing is estimated or filled in/);
  assert.match(html, /not a loaded or operating measure/);
  assert.match(html, /<kbd>\/<\/kbd>/);
  assert.match(html, /<kbd>Ctrl<\/kbd> <kbd>Z<\/kbd>/, 'the Undo shortcut is documented');
});

test('an Undo message exposes its keyboard shortcut and a plain message has no action', () => {
  const withUndo = toastMarkup('Removed X.', 'Undo');
  assert.match(withUndo, /<button type="button" class="toast-action" data-action="toast-action" aria-keyshortcuts="Control\+Z Meta\+Z">Undo<\/button>/);
  assert.match(withUndo, /aria-label="Dismiss message"/);
  const plain = toastMarkup('Link copied.');
  assert.doesNotMatch(plain, /toast-action/);
  assert.match(plain, /toast-close/);
});

test('every interactive action in the markup has a handler in the application', () => {
  const app = read('src/js/app.js');
  const markupFiles = ['src/index.html', ...readdirSync(path.join(repoRoot, 'src/js')).filter((file) => file.startsWith('view-')).map((file) => `src/js/${file}`)];
  const actions = new Set();
  for (const file of markupFiles) for (const match of read(file).matchAll(/data-action="([a-z-]+)"/g)) actions.add(match[1]);
  assert.ok(actions.size >= 20, `found ${actions.size} actions`);
  for (const action of actions) {
    const handled = new RegExp(`'${action}':|dataset\\.action === '${action}'`).test(app);
    assert.ok(handled, `no handler for data-action="${action}"`);
  }
});

// The same machine in several years and markets, next to one unrelated machine.
const variants = annotateIdentity([
  makeMachine({ machine_id: 'jd-8r-340-2025-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2025, market: 'AU' }),
  makeMachine({ machine_id: 'jd-8r-340-2027-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2027, market: 'AU' }),
  makeMachine({ machine_id: 'jd-8r-340-2025-nz', manufacturer: 'John Deere', machine: 'John Deere 8R 340', model_year: 2025, market: 'NZ' }),
  makeMachine({ machine_id: 'fendt-942-2025-au', manufacturer: 'Fendt', machine: 'Fendt 942 Vario', model_year: 2025, market: 'AU' })
]);
const trayCards = (model) => model.machines.map((card) => ({ id: card.id, letter: card.letter, isBaseline: card.isBaseline, name: card.name, detail: card.detail, label: card.label }));

test('machines that share a name are told apart in the table, the spec list, the tray and the remove controls', () => {
  const model = buildComparisonModel(variants);
  const html = comparisonMarkup({ model, pickerQuery: '', collapsed: new Set() });
  const headers = [...html.matchAll(/<th scope="col" class="machine-col[^>]*>([\s\S]*?)<\/th>/g)].map((match) => match[1]);
  assert.equal(headers.length, 4);
  assert.match(headers[0], /class="col-detail">2025 · AU<\/span>/);
  assert.match(headers[1], /class="col-detail">2027 · AU<\/span>/);
  assert.match(headers[2], /class="col-detail">2025 · NZ<\/span>/);
  assert.doesNotMatch(headers[3], /col-detail/, 'a name that is not shared needs no extra text');
  assert.match(html, /<span class="spec-machine">John Deere 8R 340<\/span><span class="spec-detail">2025 · NZ<\/span>/);
  const tray = trayMarkup(trayCards(model));
  assert.equal([...tray.matchAll(/class="tray-detail"/g)].length, 3);
  const removeLabels = [...html.matchAll(/aria-label="Remove ([^"]+) from comparison"/g)].map((match) => match[1]);
  assert.equal(new Set(removeLabels).size, 4, 'every remove control has its own name');
  assert.ok(removeLabels.includes('John Deere 8R 340 (2025, NZ)'));
});

test('a single-year comparison stays as simple as before', () => {
  const model = buildComparisonModel(fleet.slice(0, 3));
  const html = comparisonMarkup({ model, pickerQuery: '', collapsed: new Set() });
  assert.doesNotMatch(html, /col-detail|spec-detail/);
  assert.doesNotMatch(trayMarkup(trayCards(model)), /tray-detail/);
});

test('the direct picker names year and market for each match and says when the list is cut short', () => {
  const html = pickerSuggestionsMarkup(variants.slice(0, 3), 0, 3);
  assert.match(html, /<span class="suggestion-name">John Deere 8R 340<\/span><span class="suggestion-meta">2025 · AU · 100 hp<\/span>/);
  assert.match(html, /<span class="suggestion-meta">2025 · NZ · 100 hp<\/span>/);
  assert.match(html, /<span class="suggestion-add" aria-hidden="true">Add<\/span>/);
  assert.doesNotMatch(html, /Showing/);
  const truncated = pickerSuggestionsMarkup(variants.slice(0, 3), 0, 25);
  assert.match(truncated, /<li class="suggestion-more" role="presentation">Showing 3 of 25\. Keep typing to narrow the list\.<\/li>/);
});

test('the relationship summary names the market once, whether or not the name is shared', () => {
  const plain = results('table');
  assert.match(plain, /John Deere 8R 340 \(2025\)<\/span>|John Deere 8R 340 \(2025\) · AU/);
  const machines = variants;
  const nz = machines.find((machine) => machine.machine_id === 'jd-8r-340-2025-nz');
  const rel = findRelationshipResults(machines, nz, 100);
  const nzRows = buildResultRows(rel, nz);
  const html = resultsMarkup({ selectedMachine: nz, relationship: rel, rows: nzRows, visibleRows: nzRows, brands: summariseBrands(nzRows), results: { sort: 'closest', brands: [], columns: 'key' }, comparisonIds: [], layout: 'table' });
  const summary = html.match(/<span class="summary-machine">([^<]*)<\/span>/)[1];
  assert.equal(summary, 'John Deere 8R 340 (2025, NZ)');
});
