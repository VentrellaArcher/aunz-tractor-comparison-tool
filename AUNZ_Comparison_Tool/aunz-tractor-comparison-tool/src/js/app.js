import { loadRuntimeData, sanitizeMachines } from './data-loader.js';
import { filterMachines, getFacetCounts, getFilterOptions, getSelectionOptions, machineName, rankBySearch, resolveSelectedMachine, selectionLabel, suggestSearchCorrection } from './filters.js';
import { findRelationshipResults } from './relationships.js';
import { MAX_COMPARISON_MACHINES, resolveComparisonMachines } from './comparison.js';
import { buildComparisonModel, slotLetter } from './comparison-model.js';
import { buildResultRows, filterResultRows, sortResultRows, summariseBrands } from './results-model.js';
import { reconcile, withBaseline, withComparisonAdded, withComparisonCleared, withComparisonRemoved, withComparisonToggled, withFilterChange, withFiltersReset, withMachineSelected, withRelationshipPercentage, withResultsChange, withSearch, withSelectionCleared, withStartOver, withViewChange, createInitialState } from './state.js';
import { ONBOARDING_KEY, buildShareUrl, decodeState, encodeState, readPreference, readSessionState, writePreference, writeSessionState } from './url-state.js';
import { SUGGESTION_LIMIT, activeFilterEntries, activeFiltersMarkup, discoveryMarkup, filterBadgeText, resultCountText, searchNoteMarkup, suggestionsMarkup } from './view-discovery.js';
import { cardMoreMarkup, noEligibleMarkup, noSelectionMarkup, resultsMarkup, unavailableMarkup } from './view-results.js';
import { comparisonMarkup, emptyComparisonWithPickerMarkup, pickerSuggestionsMarkup, trayMarkup } from './view-comparison.js';
import { catalogueSummaryMarkup, formatBuildDate, toastMarkup } from './view-shell.js';

const $ = (id) => document.getElementById(id);
const els = {
  status: $('status'),
  summary: $('summary'),
  discovery: $('discovery'),
  results: $('relationship-results'),
  comparison: $('comparison'),
  comparisonStatus: $('comparison-status'),
  outputStatus: $('output-status'),
  tray: $('comparison-tray'),
  toasts: $('toasts'),
  help: $('help-dialog'),
  stepBadge: $('step-badge'),
  buildNote: $('build-note'),
  printBanner: $('print-banner')
};

const PICKER_LIMIT = 8;
const DEFAULT_TITLE = document.title;

function browserStorage(kind) {
  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

const sessionStore = browserStorage('sessionStorage');
const localStore = browserStorage('localStorage');
const wideQuery = window.matchMedia('(min-width: 48rem)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const app = {
  data: null,
  options: null,
  state: createInitialState(),
  undo: null,
  ui: {
    suggestionsOpen: false,
    suggestionIndex: 0,
    suggestionCount: 0,
    pickerQuery: '',
    pickerOpen: false,
    pickerIndex: 0,
    pickerCount: 0,
    collapsed: new Set(),
    comparisonInView: false,
    wide: wideQuery.matches,
    filtersOpen: wideQuery.matches,
    onboardingVisible: false,
    resultsKey: '',
    comparisonKey: '',
    trayKey: '',
    resultRows: new Map(),
    toastTimer: 0,
    toastAction: null,
    persistTimer: 0
  }
};

const catalogue = () => app.data.machines;
const eligibleMachines = () => filterMachines(catalogue(), app.state.filters);

/* ---------- Small helpers ---------- */

// Full re-renders replace focused controls, so remember which one had focus and put it back.
function withFocusRestore(container, render, fallbackSelector) {
  const active = document.activeElement;
  const key = active && container.contains(active) ? active.dataset.focusKey : null;
  const selection = key && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
  render();
  if (!key) return;
  const target = [...container.querySelectorAll('[data-focus-key]')].find((element) => element.dataset.focusKey === key);
  if (!target || target.disabled) {
    if (fallbackSelector) container.querySelector(fallbackSelector)?.focus({ preventScroll: true });
    return;
  }
  target.focus({ preventScroll: true });
  if (selection && typeof target.setSelectionRange === 'function') {
    try {
      target.setSelectionRange(selection[0], selection[1]);
    } catch {
      // Not every input type supports selection ranges.
    }
  }
}

function focusByKey(container, key) {
  const target = [...container.querySelectorAll('[data-focus-key]')].find((element) => element.dataset.focusKey === key);
  if (target && !target.disabled) target.focus({ preventScroll: true });
}

function announce(message, region = els.status) {
  region.textContent = '';
  window.setTimeout(() => { region.textContent = message; }, 40);
}

function hideToast() {
  window.clearTimeout(app.ui.toastTimer);
  app.ui.toastAction = null;
  els.toasts.innerHTML = '';
}

function showToast(message, { actionLabel, onAction, duration } = {}) {
  window.clearTimeout(app.ui.toastTimer);
  app.ui.toastAction = onAction ?? null;
  els.toasts.innerHTML = toastMarkup(message, actionLabel);
  app.ui.toastTimer = window.setTimeout(hideToast, duration ?? (actionLabel ? 10000 : 6000));
}

function offerUndo(message, previousState) {
  app.undo = previousState;
  showToast(message, { actionLabel: 'Undo', onAction: undoLast });
}

function undoLast() {
  const previous = app.undo;
  app.undo = null;
  hideToast();
  if (!previous) return;
  commit(previous, { history: 'push' });
  announce('Previous selection restored.');
}

/* ---------- Persistence: address bar, browser history and session ---------- */

function persist(mode) {
  writeSessionState(sessionStore, app.state);
  if (mode === 'none') return;
  const query = encodeState(app.state);
  if (query === location.search.replace(/^\?/, '')) return;
  const write = () => {
    const url = `${location.pathname}${query ? `?${query}` : ''}`;
    try {
      history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
    } catch {
      // Some browsers rate-limit or block history updates; the tool keeps working without them.
    }
  };
  window.clearTimeout(app.ui.persistTimer);
  if (mode === 'push') write();
  else app.ui.persistTimer = window.setTimeout(write, 300);
}

function commit(nextState, { history: mode = 'replace' } = {}) {
  app.state = nextState;
  refresh();
  persist(mode);
}

/* ---------- Discovery ---------- */

function renderDiscoveryFull() {
  const { filters } = app.state;
  const eligible = eligibleMachines();
  const selected = resolveSelectedMachine(eligible, app.state.selectedMachineId);
  els.discovery.innerHTML = discoveryMarkup({
    options: app.options,
    counts: getFacetCounts(catalogue(), filters),
    filters,
    inputValue: filters.search || (selected ? selectionLabel(selected) : ''),
    hasSelection: Boolean(selected || filters.search),
    filtersOpen: app.ui.filtersOpen,
    onboardingVisible: app.ui.onboardingVisible,
    eligibleCount: eligible.length
  });
}

function syncDiscovery() {
  const form = $('discovery-form');
  if (!form) return;
  const { filters, selectedMachineId } = app.state;
  const eligible = eligibleMachines();
  const selected = resolveSelectedMachine(eligible, selectedMachineId);

  $('result-count').textContent = resultCountText(eligible.length);
  $('active-filters').innerHTML = activeFiltersMarkup(filters);
  const activeCount = activeFilterEntries(filters).length;
  const badgeText = filterBadgeText(activeCount);
  $('filter-badge').textContent = badgeText;
  $('filter-badge').hidden = !badgeText;
  $('reset-filters').hidden = activeCount === 0;

  const input = $('search');
  const desired = filters.search || (selected ? selectionLabel(selected) : '');
  if (input.value !== desired && document.activeElement !== input) input.value = desired;
  $('clear-machine').hidden = !(selected || filters.search);

  const counts = getFacetCounts(catalogue(), filters);
  for (const chip of form.querySelectorAll('.filter-option input[data-filter-key]')) {
    const key = chip.dataset.filterKey;
    const selectedValue = key === 'topSpeed' ? filters.topSpeed === chip.value : filters[key].includes(chip.value);
    chip.checked = selectedValue;
    if (chip.value === '') continue;
    const count = counts[key]?.[chip.value] ?? 0;
    const label = chip.closest('.filter-option');
    const counter = label.querySelector('[data-count]');
    if (counter) counter.textContent = String(count);
    const disabled = count === 0 && !chip.checked;
    chip.disabled = disabled;
    label.classList.toggle('is-empty', disabled);
  }

  const onboarding = els.discovery.querySelector('.onboarding');
  if (onboarding) onboarding.hidden = Boolean(selectedMachineId) || app.state.comparison.machineIds.length > 0;
  updateSuggestions(eligible);
  updateSearchNote(eligible);
}

function updateSuggestions(eligible = eligibleMachines()) {
  const input = $('search');
  const list = $('machine-suggestions');
  if (!input || !list) return;
  const ranked = rankBySearch(getSelectionOptions(eligible), app.state.filters.search);
  const shown = ranked.slice(0, SUGGESTION_LIMIT);
  const open = app.ui.suggestionsOpen && shown.length > 0;
  app.ui.suggestionCount = shown.length;
  if (open) {
    app.ui.suggestionIndex = Math.min(Math.max(app.ui.suggestionIndex, 0), shown.length - 1);
    list.innerHTML = suggestionsMarkup(shown, app.ui.suggestionIndex, ranked.length);
  }
  list.hidden = !open;
  input.setAttribute('aria-expanded', String(open));
  if (open) {
    input.setAttribute('aria-activedescendant', `suggestion-${app.ui.suggestionIndex}`);
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function updateSearchNote(eligible) {
  const note = $('search-note');
  if (!note) return;
  const search = app.state.filters.search.trim();
  if (!search || eligible.length > 0) {
    note.innerHTML = '';
    return;
  }
  const scope = filterMachines(catalogue(), { ...app.state.filters, search: '' });
  note.innerHTML = searchNoteMarkup(search, suggestSearchCorrection(scope, search));
}

function selectPrimaryMachine(machineId) {
  const machine = catalogue().find((candidate) => candidate.machine_id === machineId);
  if (!machine) return;
  app.ui.suggestionsOpen = false;
  $('search').value = selectionLabel(machine);
  commit(withMachineSelected(app.state, catalogue(), machineId), { history: 'push' });
  const relationshipCount = $('relationship-results').querySelector('.results-count')?.textContent ?? '';
  announce(`Selected ${selectionLabel(machine)}. ${relationshipCount}`);
  revealResults();
}

function revealResults() {
  const heading = $('relationships-heading');
  heading.closest('section').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  heading.focus({ preventScroll: true });
}

function clearPrimaryMachine() {
  app.ui.suggestionsOpen = false;
  const input = $('search');
  input.value = '';
  commit(withSelectionCleared(app.state), { history: 'push' });
  input.focus();
}

function onFilterChange(control) {
  const before = app.state;
  const key = control.dataset.filterKey;
  commit(withFilterChange(before, catalogue(), key, control.value, control.checked));
  if (before.selectedMachineId && !app.state.selectedMachineId) {
    showToast('The primary machine no longer matches the filters, so it was cleared.', { actionLabel: 'Undo', onAction: () => { app.undo = before; undoLast(); } });
  }
}

function removeFilter(key, value) {
  const before = app.state;
  if (key === 'search') {
    $('search').value = '';
    commit(withSearch(before, catalogue(), ''));
  } else {
    commit(withFilterChange(before, catalogue(), key, value, false));
  }
  $('filter-panel')?.querySelector('summary')?.focus({ preventScroll: true });
}

function resetAllFilters() {
  const before = app.state;
  $('search').value = '';
  commit(withFiltersReset(before, catalogue()), { history: 'push' });
  offerUndo('Filters reset.', before);
}

function applyCorrection(query) {
  const input = $('search');
  input.value = query;
  app.ui.suggestionsOpen = true;
  app.ui.suggestionIndex = 0;
  commit(withSearch(app.state, catalogue(), query));
  input.focus();
}

function dismissOnboarding() {
  writePreference(localStore, ONBOARDING_KEY, true);
  app.ui.onboardingVisible = false;
  els.discovery.querySelector('.onboarding')?.remove();
  $('search')?.focus();
}

function onSearchKeydown(event) {
  const total = app.ui.suggestionCount;
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!app.ui.suggestionsOpen) {
        app.ui.suggestionsOpen = true;
        app.ui.suggestionIndex = 0;
      } else {
        app.ui.suggestionIndex = Math.min(app.ui.suggestionIndex + 1, Math.max(total - 1, 0));
      }
      updateSuggestions();
      break;
    case 'ArrowUp':
      event.preventDefault();
      app.ui.suggestionsOpen = true;
      app.ui.suggestionIndex = Math.max(app.ui.suggestionIndex - 1, 0);
      updateSuggestions();
      break;
    case 'Enter': {
      event.preventDefault();
      const active = app.ui.suggestionsOpen ? $(`suggestion-${app.ui.suggestionIndex}`) : null;
      if (active) selectPrimaryMachine(active.dataset.machineId);
      break;
    }
    case 'Escape':
      if (app.ui.suggestionsOpen) {
        event.preventDefault();
        app.ui.suggestionsOpen = false;
        updateSuggestions();
      }
      break;
    case 'Tab':
      app.ui.suggestionsOpen = false;
      updateSuggestions();
      break;
    default:
  }
}

/* ---------- Relationship results ---------- */

function renderResults() {
  const machines = catalogue();
  const eligible = eligibleMachines();
  const selectedMachine = resolveSelectedMachine(eligible, app.state.selectedMachineId);
  const key = JSON.stringify([eligible.length === 0, selectedMachine?.machine_id ?? '', app.state.relationshipPercentage, app.state.results, app.ui.wide]);
  if (key === app.ui.resultsKey) return;
  app.ui.resultsKey = key;
  const relationship = findRelationshipResults(machines, selectedMachine, app.state.relationshipPercentage);
  withFocusRestore(els.results, () => {
    app.ui.resultRows = new Map();
    if (eligible.length === 0) {
      els.results.innerHTML = noEligibleMarkup();
      return;
    }
    if (!app.state.selectedMachineId) {
      els.results.innerHTML = noSelectionMarkup();
      return;
    }
    if (!relationship.available) {
      els.results.innerHTML = unavailableMarkup(relationship.reason);
      return;
    }
    const rows = buildResultRows(relationship, selectedMachine);
    rows.forEach((row) => app.ui.resultRows.set(row.machineId, row));
    const visibleRows = sortResultRows(filterResultRows(rows, app.state.results.brands), app.state.results.sort);
    els.results.innerHTML = resultsMarkup({
      selectedMachine,
      relationship,
      rows,
      visibleRows,
      brands: summariseBrands(rows),
      results: app.state.results,
      comparisonIds: app.state.comparison.machineIds,
      layout: app.ui.wide ? 'table' : 'cards'
    });
  });
}

// Membership changes only flip the toggles in place, so long lists are not rebuilt and focus stays put.
function syncResultToggles() {
  const compared = new Set(app.state.comparison.machineIds);
  for (const input of els.results.querySelectorAll('input[data-action="toggle-compare"]')) {
    const added = compared.has(input.dataset.machineId);
    if (input.checked !== added) input.checked = added;
    input.closest('.compare-toggle')?.classList.toggle('is-added', added);
    input.closest('tr, li')?.classList.toggle('in-comparison-row', added);
  }
}

function toggleRelationshipRow(machineId) {
  const machine = catalogue().find((candidate) => candidate.machine_id === machineId);
  if (!machine) return;
  const before = app.state;
  const wasCompared = before.comparison.machineIds.includes(machineId);
  const after = withComparisonToggled(before, catalogue(), machineId);
  const isCompared = after.comparison.machineIds.includes(machineId);
  commit(after, { history: 'push' });
  if (!wasCompared && !isCompared) {
    showToast(after.comparison.message ?? 'That machine could not be added.');
    return;
  }
  const count = after.comparison.machineIds.length;
  announce(`${isCompared ? 'Added' : 'Removed'} ${selectionLabel(machine)}. ${count} of ${MAX_COMPARISON_MACHINES} machines in the comparison.`, els.comparisonStatus);
}

function fillCardDetails(details) {
  const list = details.querySelector('dl');
  const row = app.ui.resultRows.get(details.dataset.machineId);
  if (details.open && list && row && list.childElementCount === 0) list.innerHTML = cardMoreMarkup(row);
}

/* ---------- Comparison ---------- */

function renderComparison() {
  const machines = resolveComparisonMachines(app.state.comparison, catalogue());
  const key = JSON.stringify([machines.map((machine) => machine.machine_id), app.state.view, [...app.ui.collapsed].sort()]);
  if (key === app.ui.comparisonKey) return;
  app.ui.comparisonKey = key;
  withFocusRestore(els.comparison, () => {
    if (machines.length === 0) {
      els.comparison.innerHTML = emptyComparisonWithPickerMarkup(app.ui.pickerQuery);
      return;
    }
    els.comparison.innerHTML = comparisonMarkup({ model: buildComparisonModel(machines, app.state.view), pickerQuery: app.ui.pickerQuery, collapsed: app.ui.collapsed });
  }, '.comparison-actions button');
  app.ui.pickerOpen = false;
}

function renderTray() {
  const machines = resolveComparisonMachines(app.state.comparison, catalogue());
  const hidden = machines.length === 0 || app.ui.comparisonInView;
  els.tray.hidden = hidden;
  document.body.classList.toggle('has-tray', !hidden);
  const cards = machines.map((machine, index) => ({ id: machine.machine_id, letter: slotLetter(index), isBaseline: index === 0, name: machineName(machine), label: selectionLabel(machine) }));
  const key = JSON.stringify(cards);
  if (key === app.ui.trayKey) return;
  app.ui.trayKey = key;
  withFocusRestore(els.tray, () => { els.tray.innerHTML = cards.length ? trayMarkup(cards) : ''; });
}

function updateNavBadge() {
  const count = app.state.comparison.machineIds.length;
  els.stepBadge.textContent = String(count);
  els.stepBadge.hidden = count === 0;
}

function pickerOptions() {
  const compared = new Set(app.state.comparison.machineIds);
  const query = app.ui.pickerQuery.trim();
  if (!query) return [];
  return rankBySearch(getSelectionOptions(filterMachines(catalogue(), { search: query }).filter((machine) => !compared.has(machine.machine_id))), query);
}

function updatePickerSuggestions() {
  const input = $('comparison-search');
  const list = $('comparison-suggestions');
  if (!input || !list) return;
  const shown = pickerOptions().slice(0, PICKER_LIMIT);
  const open = app.ui.pickerOpen && shown.length > 0;
  app.ui.pickerCount = shown.length;
  if (open) {
    app.ui.pickerIndex = Math.min(Math.max(app.ui.pickerIndex, 0), shown.length - 1);
    list.innerHTML = pickerSuggestionsMarkup(shown, app.ui.pickerIndex);
  }
  list.hidden = !open;
  input.setAttribute('aria-expanded', String(open));
  if (open) input.setAttribute('aria-activedescendant', `picker-option-${app.ui.pickerIndex}`);
  else input.removeAttribute('aria-activedescendant');
}

function addFromPicker(machineId) {
  const before = app.state;
  app.ui.pickerQuery = '';
  app.ui.pickerOpen = false;
  const after = withComparisonAdded(before, catalogue(), machineId);
  const added = after.comparison.machineIds.includes(machineId) && !before.comparison.machineIds.includes(machineId);
  commit(after, { history: 'push' });
  if (!added) {
    showToast(after.comparison.message ?? 'That machine could not be added.');
    return;
  }
  const machine = catalogue().find((candidate) => candidate.machine_id === machineId);
  announce(`Added ${selectionLabel(machine)}. ${after.comparison.machineIds.length} of ${MAX_COMPARISON_MACHINES} machines in the comparison.`, els.comparisonStatus);
}

function onPickerKeydown(event) {
  const total = app.ui.pickerCount;
  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      const wasOpen = app.ui.pickerOpen;
      app.ui.pickerOpen = true;
      app.ui.pickerIndex = wasOpen && total > 0 ? Math.min(app.ui.pickerIndex + 1, total - 1) : 0;
      updatePickerSuggestions();
      break;
    }
    case 'ArrowUp':
      event.preventDefault();
      app.ui.pickerIndex = Math.max(app.ui.pickerIndex - 1, 0);
      updatePickerSuggestions();
      break;
    case 'Enter': {
      event.preventDefault();
      const active = app.ui.pickerOpen ? $(`picker-option-${app.ui.pickerIndex}`) : null;
      if (active) addFromPicker(active.dataset.machineId);
      break;
    }
    case 'Escape':
      if (app.ui.pickerOpen) {
        event.preventDefault();
        app.ui.pickerOpen = false;
        updatePickerSuggestions();
      }
      break;
    case 'Tab':
      app.ui.pickerOpen = false;
      updatePickerSuggestions();
      break;
    default:
  }
}

function removeFromComparison(machineId, trigger) {
  const machine = catalogue().find((candidate) => candidate.machine_id === machineId);
  if (!machine) return;
  const before = app.state;
  const fromTray = els.tray.contains(trigger);
  commit(withComparisonRemoved(before, machineId), { history: 'push' });
  offerUndo(`Removed ${selectionLabel(machine)} from the comparison.`, before);
  window.requestAnimationFrame(() => {
    const container = fromTray && !els.tray.hidden ? els.tray : els.comparison;
    const next = container.querySelector('.remove-comparison, .tray-remove') ?? $('comparison-search');
    next?.focus({ preventScroll: true });
  });
}

function makeBaseline(machineId) {
  const machine = catalogue().find((candidate) => candidate.machine_id === machineId);
  if (!machine) return;
  commit(withBaseline(app.state, machineId), { history: 'push' });
  focusByKey(els.comparison, `remove:${machineId}`);
  announce(`${selectionLabel(machine)} is now the baseline, Machine A. Differences are measured against it.`, els.comparisonStatus);
}

function clearComparison() {
  const before = app.state;
  if (before.comparison.machineIds.length === 0) return;
  commit(withComparisonCleared(before), { history: 'push' });
  offerUndo('Comparison cleared.', before);
  window.requestAnimationFrame(() => $('comparison-search')?.focus({ preventScroll: true }));
}

function toggleSection(name) {
  if (app.ui.collapsed.has(name)) app.ui.collapsed.delete(name);
  else app.ui.collapsed.add(name);
  refresh();
}

function setAllSections(collapse) {
  const model = buildComparisonModel(resolveComparisonMachines(app.state.comparison, catalogue()), app.state.view);
  app.ui.collapsed = new Set(collapse ? model.sections.filter((section) => !section.hidden).map((section) => section.name) : []);
  refresh();
}

/* ---------- Outputs and sharing (loaded on first use) ---------- */

async function runOutput(kind) {
  const output = await import('./comparison-output.js');
  const model = output.createOutputModel(app.state.comparison, catalogue(), app.data.buildInfo);
  let result;
  if (kind === 'copy') result = await output.copyComparison(model);
  else if (kind === 'csv') result = output.downloadCsv(model);
  else result = output.printComparison(model);
  announce(result.message, els.outputStatus);
  if (kind !== 'print') showToast(result.message);
}

async function copyShareLink() {
  const output = await import('./comparison-output.js');
  const result = await output.copyLink(buildShareUrl(location.href, app.state));
  announce(result.message, els.outputStatus);
  showToast(result.message);
}

function printTitle() {
  const machines = resolveComparisonMachines(app.state.comparison, catalogue());
  if (machines.length === 0) return DEFAULT_TITLE;
  const date = new Date().toISOString().slice(0, 10);
  return `AU-NZ Tractor Comparison - ${machines.map((machine) => machineName(machine)).join(' vs ')} - ${date}`;
}

window.addEventListener('beforeprint', () => {
  if (!app.data) return;
  document.title = printTitle();
  const built = formatBuildDate(app.data.buildInfo.buildDate);
  els.printBanner.textContent = `AU/NZ Tractor Comparison Tool. Printed ${formatBuildDate(new Date().toISOString())}.${built ? ` Data updated ${built}.` : ''}`;
});
window.addEventListener('afterprint', () => { document.title = DEFAULT_TITLE; });

/* ---------- Help ---------- */

async function openHelp() {
  const { helpMarkup } = await import('./view-help.js');
  els.help.innerHTML = helpMarkup();
  if (typeof els.help.showModal === 'function') els.help.showModal();
  else els.help.setAttribute('open', '');
}

function closeHelp() {
  if (typeof els.help.close === 'function') els.help.close();
  else els.help.removeAttribute('open');
}

els.help.addEventListener('click', (event) => {
  if (event.target === els.help) closeHelp();
});

/* ---------- Whole-page refresh ---------- */

function startOver() {
  const before = app.state;
  app.ui.collapsed = new Set();
  app.ui.pickerQuery = '';
  const input = $('search');
  if (input) input.value = '';
  commit(withStartOver(), { history: 'push' });
  offerUndo('Started over.', before);
}

function refresh() {
  syncDiscovery();
  renderResults();
  renderComparison();
  renderTray();
  syncResultToggles();
  updateNavBadge();
}

/* ---------- Event wiring (delegated) ---------- */

const clickActions = {
  'select-suggestion': (element) => selectPrimaryMachine(element.dataset.machineId),
  'clear-machine': () => clearPrimaryMachine(),
  'remove-filter': (element) => removeFilter(element.dataset.filterKey, element.dataset.value),
  'reset-filters': () => resetAllFilters(),
  'apply-correction': (element) => applyCorrection(element.dataset.query),
  'dismiss-onboarding': () => dismissOnboarding(),
  'clear-brands': () => commit(withResultsChange(app.state, { brands: [] })),
  'add-suggestion': (element) => addFromPicker(element.dataset.machineId),
  'remove-from-comparison': (element) => removeFromComparison(element.dataset.machineId, element),
  'make-baseline': (element) => makeBaseline(element.dataset.machineId),
  'clear-comparison': () => clearComparison(),
  'copy-comparison': () => runOutput('copy'),
  'export-csv': () => runOutput('csv'),
  'print-comparison': () => runOutput('print'),
  'copy-link': () => copyShareLink(),
  'toggle-section': (element) => toggleSection(element.dataset.section),
  'collapse-all': () => setAllSections(true),
  'expand-all': () => setAllSections(false),
  'start-over': () => startOver(),
  'open-help': () => openHelp(),
  'close-help': () => closeHelp(),
  'toast-action': () => app.ui.toastAction?.(),
  'toast-close': () => hideToast(),
  'retry-load': () => start()
};

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (target && !target.matches('input') && clickActions[target.dataset.action]) {
    clickActions[target.dataset.action](target, event);
    return;
  }
  if (!event.target.closest('.combobox-wrap') && app.ui.suggestionsOpen) {
    app.ui.suggestionsOpen = false;
    updateSuggestions();
  }
  if (!event.target.closest('.comparison-picker-input') && app.ui.pickerOpen) {
    app.ui.pickerOpen = false;
    updatePickerSuggestions();
  }
  if (event.target.id === 'search' && !app.ui.suggestionsOpen && $('search').value === '') {
    app.ui.suggestionsOpen = true;
    updateSuggestions();
  }
});

document.addEventListener('change', (event) => {
  const control = event.target;
  if (control.matches('[data-filter-key]')) {
    onFilterChange(control);
    return;
  }
  if (control.dataset.action === 'toggle-compare') {
    toggleRelationshipRow(control.dataset.machineId);
    return;
  }
  if (control.dataset.action === 'toggle-differences') {
    commit(withViewChange(app.state, { differencesOnly: control.checked }));
    return;
  }
  if (control.dataset.action === 'toggle-empty') {
    commit(withViewChange(app.state, { showEmpty: control.checked }));
    return;
  }
  if (control.name === 'relationshipPercentage') commit(withRelationshipPercentage(app.state, control.value), { history: 'push' });
  else if (control.name === 'resultsSort') commit(withResultsChange(app.state, { sort: control.value }));
  else if (control.name === 'resultColumns') commit(withResultsChange(app.state, { columns: control.value }));
  else if (control.name === 'resultBrand') {
    const brands = [...els.results.querySelectorAll('input[name="resultBrand"]:checked')].map((input) => input.value);
    commit(withResultsChange(app.state, { brands }));
  }
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (control.id === 'search') {
    app.ui.suggestionsOpen = true;
    app.ui.suggestionIndex = 0;
    commit(withSearch(app.state, catalogue(), control.value));
  } else if (control.id === 'comparison-search') {
    app.ui.pickerQuery = control.value;
    app.ui.pickerOpen = true;
    app.ui.pickerIndex = 0;
    updatePickerSuggestions();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.target.id === 'search') {
    onSearchKeydown(event);
    return;
  }
  if (event.target.id === 'comparison-search') {
    onPickerKeydown(event);
    return;
  }
  const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    const input = $('search');
    input?.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    input?.focus({ preventScroll: true });
  }
});

document.addEventListener('focusout', (event) => {
  if (event.target.id === 'search' && !event.relatedTarget?.closest('.combobox-wrap') && app.ui.suggestionsOpen) {
    app.ui.suggestionsOpen = false;
    updateSuggestions();
  }
  if (event.target.id === 'comparison-search' && app.ui.pickerOpen) {
    app.ui.pickerOpen = false;
    updatePickerSuggestions();
  }
});

// Keep the input focused while a suggestion is pressed so the list does not close before the click lands.
document.addEventListener('mousedown', (event) => {
  if (event.target.closest('.suggestions, .comparison-suggestions')) event.preventDefault();
});

// The discovery form only filters in place; it must never navigate.
document.addEventListener('submit', (event) => event.preventDefault());

els.results.addEventListener('toggle', (event) => {
  if (event.target.matches('details.result-more')) fillCardDetails(event.target);
}, true);

els.discovery.addEventListener('toggle', (event) => {
  if (event.target.id === 'filter-panel') app.ui.filtersOpen = event.target.open;
}, true);

for (const [type, restart] of [['mouseenter', false], ['focusin', false], ['mouseleave', true], ['focusout', true]]) {
  els.toasts.addEventListener(type, () => {
    window.clearTimeout(app.ui.toastTimer);
    if (restart && els.toasts.firstElementChild) app.ui.toastTimer = window.setTimeout(hideToast, 4000);
  });
}

wideQuery.addEventListener('change', (event) => {
  app.ui.wide = event.matches;
  if (app.data) renderResults();
});

window.addEventListener('popstate', () => {
  if (!app.data) return;
  const query = location.search.replace(/^\?/, '');
  if (query === encodeState(app.state)) return;
  const decoded = decodeState(query, catalogue());
  commit(reconcile(decoded.state, catalogue()), { history: 'none' });
});

/* ---------- Page chrome that reacts to scrolling ---------- */

function observeLayout() {
  if (!('IntersectionObserver' in window)) return;
  const steps = [['discovery', '.discovery-section'], ['relationships', '.relationships-section'], ['comparison', '.comparison-section-wrapper']];
  const stepObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const name = steps.find(([, selector]) => entry.target.matches(selector))?.[0];
      document.querySelectorAll('.steps a').forEach((link) => {
        if (link.dataset.step === name) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  for (const [, selector] of steps) stepObserver.observe(document.querySelector(selector));
  const comparisonObserver = new IntersectionObserver(([entry]) => {
    app.ui.comparisonInView = entry.isIntersecting;
    if (app.data) renderTray();
  }, { rootMargin: '0px 0px -20% 0px' });
  comparisonObserver.observe(document.querySelector('.comparison-section-wrapper'));
}

/* ---------- Start-up ---------- */

function setStatus(state, message) {
  els.status.dataset.state = state;
  els.status.textContent = message;
}

function renderFatal() {
  setStatus('error', 'The published catalogue could not be loaded.');
  els.summary.innerHTML = '';
  els.discovery.innerHTML = '<div class="empty-state" role="alert"><p>Machine discovery is unavailable because the catalogue did not load.</p><p class="hint">Check your connection, then try again. If the problem continues, contact the owner of this tool.</p><button type="button" class="btn btn-primary" data-action="retry-load">Try again</button></div>';
  els.results.innerHTML = '<p class="hint">Relationship results are unavailable because required data did not load.</p>';
  els.comparison.innerHTML = '<p class="hint">Comparison is unavailable because required data did not load.</p>';
}

async function start() {
  try {
    Object.assign(app.ui, { resultsKey: '', comparisonKey: '', trayKey: '' });
    setStatus('loading', 'Loading the machine catalogue…');
    const loaded = await loadRuntimeData();
    const { machines, skipped } = sanitizeMachines(loaded.machines);
    app.data = { ...loaded, machines };
    app.options = getFilterOptions(machines);

    let initial = decodeState(location.search, machines);
    if (!initial.hasState) initial = readSessionState(sessionStore, machines) ?? initial;
    app.state = reconcile(initial.state, machines);
    app.ui.onboardingVisible = !readPreference(localStore, ONBOARDING_KEY);

    const built = formatBuildDate(loaded.buildInfo.buildDate);
    els.summary.innerHTML = catalogueSummaryMarkup({
      machineCount: machines.length,
      manufacturerCount: new Set(machines.map((machine) => machine.manufacturer)).size,
      years: machines.map((machine) => machine.model_year),
      buildDate: built
    });
    els.buildNote.textContent = built ? `Catalogue data updated ${built}.` : '';

    renderDiscoveryFull();
    refresh();
    persist('replace');
    setStatus('ready', `${machines.length} published machine${machines.length === 1 ? '' : 's'} loaded.`);
    const notices = [...initial.notices];
    if (skipped > 0) notices.push(`${skipped} incomplete catalogue record${skipped === 1 ? ' was' : 's were'} skipped.`);
    if (notices.length) showToast(notices.join(' '), { duration: 9000 });
  } catch (error) {
    console.error(error);
    renderFatal();
  }
}

observeLayout();
start();
