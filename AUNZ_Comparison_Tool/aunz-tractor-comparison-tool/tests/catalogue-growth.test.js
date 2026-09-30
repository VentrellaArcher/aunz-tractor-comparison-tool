import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateIdentity } from '../src/js/identity.js';
import { filterMachines, getFacetCounts, getFilterOptions, getSelectionOptions, machineName, rankBySearch, resetFilters, searchMachines, selectionLabel, suggestSearchCorrection } from '../src/js/filters.js';
import { findRelationshipResults } from '../src/js/relationships.js';
import { buildResultRows, sortResultRows, summariseBrands } from '../src/js/results-model.js';
import { buildComparisonModel } from '../src/js/comparison-model.js';
import { createCsvText, createOutputModel, createPlainText } from '../src/js/comparison-output.js';
import { createInitialState, reconcile } from '../src/js/state.js';
import { decodeState, encodeState } from '../src/js/url-state.js';
import { resultsMarkup } from '../src/js/view-results.js';
import { comparisonMarkup, trayMarkup } from '../src/js/view-comparison.js';
import { makeGrowthCatalogue } from './fixtures/scale.js';

const catalogue = annotateIdentity(makeGrowthCatalogue());
const ids = (machines) => machines.map((machine) => machine.machine_id);
const byName = new Map();
for (const machine of catalogue) byName.set(machineName(machine).toLowerCase(), [...(byName.get(machineName(machine).toLowerCase()) ?? []), machine]);
const multiYearName = [...byName.values()].find((group) => new Set(group.map((machine) => machine.model_year)).size >= 3);
const marketTwinName = [...byName.values()].find((group) => group.some((machine) => machine.market === 'NZ') && group.some((machine) => machine.market === 'AU' && machine.model_year === group.find((other) => other.market === 'NZ').model_year));

test('the growth fixture is far larger and messier than today\'s catalogue', () => {
  assert.ok(catalogue.length >= 2500, `${catalogue.length} records`);
  assert.ok(new Set(catalogue.map((machine) => machine.manufacturer)).size >= 30);
  assert.ok(multiYearName, 'some models have several years');
  assert.ok(marketTwinName, 'some names are shared across markets in one year');
  assert.ok([...byName.values()].some((group) => group.length === 1), 'some models have a single year');
  assert.ok(catalogue.some((machine) => machine.manufacturer.length > 40), 'very long manufacturer names exist');
});

test('every record keeps a unique identity for IDs, labels and selection order', () => {
  assert.equal(new Set(ids(catalogue)).size, catalogue.length);
  assert.equal(new Set(catalogue.map(selectionLabel)).size, catalogue.length, 'no two machines share a label');
  const forward = ids(getSelectionOptions(catalogue));
  const backward = ids(getSelectionOptions([...catalogue].reverse()));
  assert.deepEqual(backward, forward, 'selection order does not depend on input order');
  for (const group of byName.values()) {
    const detailed = group.filter((machine) => machine.identityDetail !== '').length;
    assert.ok(group.length === 1 ? detailed === 0 : detailed === group.length, 'shared names are all detailed, unique names are not');
  }
});

test('a model, its year and its market can be searched together in every supported notation', () => {
  const target = multiYearName.find((machine) => machine.market === 'AU');
  const twoDigits = String(target.model_year).slice(-2);
  const expectedIds = ids(catalogue.filter((machine) => machineName(machine) === machineName(target) && machine.model_year === target.model_year)).sort();
  for (const query of [`${machineName(target)} ${target.model_year}`, `${target.model_year} ${machineName(target)}`, `${machineName(target)} my${twoDigits}`, `MY ${twoDigits} ${machineName(target).toUpperCase()}`, `${machineName(target)}   MY${target.model_year}`]) {
    assert.deepEqual(ids(searchMachines(catalogue, query)).sort(), expectedIds, query);
  }
  const allYears = ids(searchMachines(catalogue, machineName(target)));
  assert.ok(allYears.length >= 3, 'searching the name alone lists every model year');
  const suggestions = rankBySearch(getSelectionOptions(searchMachines(catalogue, machineName(target))), machineName(target));
  assert.deepEqual(suggestions.map((machine) => machine.model_year), [...suggestions.map((machine) => machine.model_year)].sort((left, right) => left - right), 'model years of one machine appear in year order');
});

test('a misspelt manufacturer and model with a year still finds the intended machine', () => {
  const target = catalogue.find((machine) => machine.manufacturer === 'Marque3' && machine.model_year === 2025) ?? catalogue.find((machine) => machine.manufacturer === 'Marque3');
  const typo = `Marqe3 ${machineName(target).split(' ').slice(1).join(' ')} my${String(target.model_year).slice(-2)}`;
  const suggestion = suggestSearchCorrection(catalogue, typo);
  assert.ok(suggestion, typo);
  assert.ok(ids(searchMachines(catalogue, suggestion.query)).includes(target.machine_id));
});

test('filters and live counts stay consistent with many manufacturers, models and years', () => {
  const options = getFilterOptions(catalogue);
  const counts = getFacetCounts(catalogue, resetFilters());
  assert.equal(Object.values(counts.manufacturer).reduce((sum, value) => sum + value, 0), catalogue.length);
  assert.equal(Object.values(counts.modelYear).reduce((sum, value) => sum + value, 0), catalogue.length);
  assert.deepEqual(options.modelYears, [...options.modelYears].sort((left, right) => Number(right) - Number(left)), 'years list newest first, as a plain ordering');
  const filters = { ...resetFilters(), manufacturer: [options.manufacturers[0], options.manufacturers[1]], modelYear: ['2025'] };
  const narrowed = getFacetCounts(catalogue, filters);
  for (const brand of options.manufacturers.slice(0, 5)) {
    assert.equal(narrowed.manufacturer[brand] ?? 0, filterMachines(catalogue, { ...filters, manufacturer: [brand] }).length, brand);
  }
  for (const year of options.modelYears) {
    assert.equal(narrowed.modelYear[year] ?? 0, filterMachines(catalogue, { ...filters, modelYear: [year] }).length, year);
  }
});

test('relationship results in a large catalogue are pinned, in range and in a fixed order', () => {
  const selected = catalogue.find((machine) => machine.max_hp === 210 && machine.market === 'AU');
  const rows = findRelationshipResults(catalogue, selected, 10);
  const reversed = findRelationshipResults([...catalogue].reverse(), selected, 10);
  assert.deepEqual(ids(rows.rows.map((row) => row.machine)), ids(reversed.rows.map((row) => row.machine)), 'input order does not change the result');
  assert.equal(rows.rows[0].isSelected, true);
  for (const row of rows.rows.slice(1)) assert.ok(row.maxHp >= 189 && row.maxHp <= 231, `${row.machineId} is inside the band`);
  const differences = rows.rows.slice(1).map((row) => Math.abs(row.maxHp - 210));
  assert.deepEqual(differences, [...differences].sort((left, right) => left - right), 'closest Max HP first');
  const result = buildResultRows(rows, selected);
  const byNameOrder = sortResultRows(result, 'name-asc');
  assert.deepEqual(ids(byNameOrder.map((row) => row.machine)), ids(sortResultRows([...result].reverse(), 'name-asc').map((row) => row.machine)), 'name order is stable for identical names');
});

test('two model-year variants of one machine stay distinct through selection, comparison, sharing, exports and the tray', () => {
  const group = multiYearName.filter((machine) => machine.market === 'AU').slice(0, 2);
  const [first, second] = group;
  assert.notEqual(selectionLabel(first), selectionLabel(second));

  const state = { ...createInitialState(), selectedMachineId: first.machine_id, comparison: { machineIds: [first.machine_id, second.machine_id], message: null } };
  const restored = decodeState(encodeState(state), catalogue);
  assert.deepEqual(restored.state, state, 'the link keeps both variants');
  assert.deepEqual(restored.notices, []);

  const model = buildComparisonModel([first, second]);
  assert.notEqual(model.machines[0].detail, model.machines[1].detail);
  const html = comparisonMarkup({ model, pickerQuery: '', collapsed: new Set() });
  assert.match(html, new RegExp(`class="col-detail">${first.model_year}`));
  assert.match(html, new RegExp(`class="col-detail">${second.model_year}`));
  const tray = trayMarkup(model.machines.map((card) => ({ id: card.id, letter: card.letter, isBaseline: card.isBaseline, name: card.name, detail: card.detail, label: card.label })));
  assert.equal([...tray.matchAll(/class="tray-detail"/g)].length, 2);

  const output = createOutputModel(state.comparison, catalogue, {});
  const header = createCsvText(output).split('\r\n')[0];
  assert.ok(header.includes(selectionLabel(first)) && header.includes(selectionLabel(second)), 'CSV headings name each year');
  const text = createPlainText(output);
  assert.ok(text.includes(selectionLabel(first)) && text.includes(selectionLabel(second)), 'copied text names each year');
});

test('machines that share a name and year across markets are told apart by market', () => {
  const [au, nz] = [marketTwinName.find((machine) => machine.market === 'AU'), marketTwinName.find((machine) => machine.market === 'NZ')];
  const nzYear = nz.model_year;
  const au25 = marketTwinName.find((machine) => machine.market === 'AU' && machine.model_year === nzYear);
  assert.ok(au && au25);
  assert.match(selectionLabel(nz), /, NZ\)$/);
  assert.match(selectionLabel(au25), /, AU\)$/);
  assert.match(nz.identityDetail, /NZ$/);
  const output = createOutputModel({ machineIds: [au25.machine_id, nz.machine_id] }, catalogue, {});
  const [heading] = createCsvText(output).split('\r\n');
  assert.ok(heading.includes(selectionLabel(au25)) && heading.includes(selectionLabel(nz)));
});

test('an old shared link to a model year that has since been removed degrades gracefully', () => {
  const [keep, gone] = multiYearName.filter((machine) => machine.market === 'AU');
  const link = encodeState({ ...createInitialState(), selectedMachineId: gone.machine_id, comparison: { machineIds: [keep.machine_id, gone.machine_id], message: null } });
  const reduced = catalogue.filter((machine) => machine.machine_id !== gone.machine_id);
  const decoded = decodeState(link, reduced);
  assert.deepEqual(decoded.state.comparison.machineIds, [keep.machine_id]);
  assert.equal(decoded.state.selectedMachineId, '');
  assert.equal(decoded.notices.length, 2);
  assert.deepEqual(reconcile(decoded.state, reduced).comparison.machineIds, [keep.machine_id]);
});

test('search, facets, sorting, relationships and result markup stay responsive at ten times today\'s catalogue', () => {
  const started = performance.now();
  const selected = catalogue.find((machine) => machine.max_hp === 210);
  for (const query of ['marque1', 'a1.90 my25', 'international 2025', '']) {
    const eligible = filterMachines(catalogue, { ...resetFilters(), search: query });
    rankBySearch(getSelectionOptions(eligible), query);
    getFacetCounts(catalogue, { ...resetFilters(), search: query });
  }
  const relationship = findRelationshipResults(catalogue, selected, 20);
  const rows = buildResultRows(relationship, selected);
  const html = resultsMarkup({ selectedMachine: selected, relationship, rows, visibleRows: sortResultRows(rows, 'name-asc'), brands: summariseBrands(rows), results: { sort: 'name-asc', brands: [], columns: 'all' }, comparisonIds: [], layout: 'table' });
  const elapsed = performance.now() - started;
  assert.ok(rows.length > 200, `${rows.length} rows in range`);
  assert.equal([...html.matchAll(/<tr data-machine-id=|<tr class="[^"]*" data-machine-id=/g)].length, rows.length, 'every row is rendered');
  assert.ok(elapsed < 3000, `took ${Math.round(elapsed)} ms; typical is a small fraction of that, so a failure means an algorithmic regression`);
});
