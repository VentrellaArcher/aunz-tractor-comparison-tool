import { loadRuntimeData } from './data-loader.js';
import { displaySchema, displaySections, formatDisplayValue } from './display-schema.js';
import { filterMachines, getFilterOptions, getSelectionOptions, resetFilters, resolveSelectedMachine, selectionLabel, TOP_SPEED_THRESHOLDS } from './filters.js';
import { findRelationshipResults, RELATIONSHIP_PERCENTAGES } from './relationships.js';
import { addMachineToComparison, calculateDelta, clearComparison, comparePowerToWeight, createComparisonState, deltaDirection, formatDelta, removeMachineFromComparison, resolveComparisonMachines, MAX_COMPARISON_MACHINES } from './comparison.js';
import { copyComparison, createCsvText, createOutputModel, downloadCsv, printComparison } from './comparison-output.js';

const statusNode = document.getElementById('status');
const summaryNode = document.getElementById('summary');
const discoveryNode = document.getElementById('discovery');
const resultsNode = document.getElementById('relationship-results');
const comparisonNode = document.getElementById('comparison');
const comparisonStatusNode = document.getElementById('comparison-status');
const outputStatusNode = document.getElementById('output-status');

// Faint per-manufacturer column tint; derived from the manufacturer name only, never stored as data.
const MANUFACTURER_HUES = {
  'case ih': 4,
  'kubota': 28,
  'deutz-fahr': 45,
  'john deere': 122,
  'claas': 152,
  'fendt': 174,
  'new holland': 206,
  'massey ferguson': 350,
  'valtra': 12
};

function manufacturerHue(manufacturer) {
  const key = String(manufacturer ?? '').trim().toLowerCase();
  if (key in MANUFACTURER_HUES) return MANUFACTURER_HUES[key];
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) % 360;
  return hash;
}

const state = {
  data: null,
  filters: resetFilters(),
  selectedMachineId: '',
  relationshipPercentage: 10,
  comparison: createComparisonState(),
  suggestionsOpen: false,
  suggestionIndex: 0,
  comparisonSearch: ''
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function comparisonValue(field, machine) {
  return formatDisplayValue(machine[field.propertyPath], field.unit, field.blankValue);
}

function machineHeading(machine, index) {
  return `<div class="comparison-machine-heading"><strong>Machine ${String.fromCharCode(65 + index)}${index === 0 ? ' (baseline)' : ''}</strong><span>${escapeHtml(selectionLabel(machine))}</span><button type="button" class="remove-comparison" data-machine-id="${escapeHtml(machine.machine_id)}" aria-label="Remove ${escapeHtml(selectionLabel(machine))} from comparison">Remove</button></div>`;
}

function comparisonPickerMarkup() {
  const query = state.comparisonSearch.trim().toLowerCase();
  const comparedIds = new Set(state.comparison.machineIds);
  const matches = query
    ? getSelectionOptions(state.data.machines.filter((machine) => !comparedIds.has(machine.machine_id)))
      .filter((machine) => `${machine.manufacturer} ${machine.machine}`.toLowerCase().includes(query))
    : [];
  const suggestions = matches.map((machine) => `<li><button type="button" class="comparison-suggestion" data-machine-id="${escapeHtml(machine.machine_id)}">${escapeHtml(selectionLabel(machine))}<span>Add</span></button></li>`).join('');
  return `<div class="comparison-picker"><label for="comparison-search">Add a machine directly</label><div class="comparison-picker-input"><input id="comparison-search" type="search" value="${escapeHtml(state.comparisonSearch)}" placeholder="Search by manufacturer or model" autocomplete="off" aria-controls="comparison-suggestions" aria-expanded="${Boolean(query)}" /><span aria-hidden="true">+</span></div><ul id="comparison-suggestions" class="comparison-suggestions" role="listbox">${suggestions}</ul></div>`;
}

function wireComparisonPicker() {
  const input = document.getElementById('comparison-search');
  input?.addEventListener('input', () => {
    const cursorPosition = input.selectionStart;
    state.comparisonSearch = input.value;
    renderComparison();
    const nextInput = document.getElementById('comparison-search');
    nextInput?.focus();
    nextInput?.setSelectionRange(cursorPosition, cursorPosition);
  });
  comparisonNode.querySelectorAll('.comparison-suggestion').forEach((button) => button.addEventListener('click', () => {
    state.comparison = addMachineToComparison(state.comparison, button.dataset.machineId, state.data.machines);
    state.comparisonSearch = '';
    renderComparison();
  }));
}

function renderComparison() {
  const machines = resolveComparisonMachines(state.comparison, state.data.machines);
  const comparisonMessage = state.comparison.message ? `<p class="error" role="alert">${escapeHtml(state.comparison.message)}</p>` : '';
  if (machines.length === 0) {
    comparisonNode.innerHTML = `${comparisonMessage}${comparisonPickerMarkup()}<div class="comparison-actions"><button type="button" id="copy-comparison" disabled>Copy Comparison</button><button type="button" id="export-csv" disabled>Export CSV</button><button type="button" id="print-comparison" disabled>Print Comparison</button></div><p>No machines are currently compared.</p>`;
    comparisonStatusNode.textContent = state.comparison.message || 'Comparison is empty.';
    wireComparisonPicker();
    return;
  }

  const baseline = machines[0];
  const powerToWeight = machines.length > 1 ? comparePowerToWeight(baseline, machines[1]) : null;
  const sections = displaySections.map((section) => {
    const fields = displaySchema.filter((field) => field.section === section).sort((left, right) => left.order - right.order);
    const rows = fields.map((field) => {
      const values = machines.map((machine, index) => {
        const value = comparisonValue(field, machine);
        const deltaResult = index === 0 ? null : calculateDelta(field, baseline, machine);
        const delta = index === 0 ? '<span class="baseline-label">Baseline</span>' : `<span class="delta ${deltaDirection(deltaResult)}">Delta: ${escapeHtml(formatDelta(deltaResult, field.unit))}</span>`;
        return `<td class="machine-accent" style="--m-hue:${manufacturerHue(machine.manufacturer)}">${escapeHtml(value)}<small>${delta}</small></td>`;
      }).join('');
      return `<tr class="${field.priority ? 'priority-row' : ''}"><th scope="row">${escapeHtml(field.label)}${field.priority ? ' <span class="priority">Priority</span>' : ''}</th>${values}</tr>`;
    }).join('');
    return `<tbody class="comparison-section"><tr><th colspan="${machines.length + 1}" scope="colgroup">${escapeHtml(section)}</th></tr>${rows}</tbody>`;
  }).join('');

  const powerNote = powerToWeight ? `<p class="comparison-note">Power-to-weight basis: ${escapeHtml(powerToWeight.powerBasis)} / ${escapeHtml(powerToWeight.weightBasis)}. hp/t delta: ${escapeHtml(formatDelta({ available: powerToWeight.available, value: powerToWeight.hpPerTonneDelta }, 'hp/t'))}; kW/t delta: ${escapeHtml(formatDelta({ available: powerToWeight.available, value: powerToWeight.kwPerTonneDelta }, 'kW/t'))}.</p>` : '';
  const headings = machines.map(machineHeading).join('');
  const headers = machines.map((machine, index) => `<th scope="col" class="machine-accent" style="--m-hue:${manufacturerHue(machine.manufacturer)}">Machine ${String.fromCharCode(65 + index)}${index === 0 ? ' (baseline)' : ''}<br>${escapeHtml(selectionLabel(machine))}</th>`).join('');
  comparisonNode.innerHTML = `${comparisonMessage}${comparisonPickerMarkup()}<div class="comparison-actions"><button type="button" id="copy-comparison">Copy Comparison</button><button type="button" id="export-csv">Export CSV</button><button type="button" id="print-comparison">Print Comparison</button></div><p role="status">${machines.length} of ${MAX_COMPARISON_MACHINES} comparison slots in use.</p><div class="comparison-controls">${headings}<button type="button" id="clear-comparison">Clear Comparison</button></div>${powerNote}<div class="comparison-scroll" role="region" aria-label="Detailed comparison table" tabindex="0"><table><caption>Detailed side-by-side tractor comparison. Machine A is the baseline for deltas.</caption><thead><tr><th scope="col">Specification</th>${headers}</tr></thead>${sections}</table></div>`;
  comparisonStatusNode.textContent = `${machines.length} machines are in the comparison.`;
  wireComparisonPicker();
  const outputModel = createOutputModel(state.comparison, state.data.machines, state.data.buildInfo);
  document.getElementById('copy-comparison').addEventListener('click', async () => {
    const result = await copyComparison(outputModel);
    outputStatusNode.textContent = result.message;
  });
  document.getElementById('export-csv').addEventListener('click', () => {
    const result = downloadCsv(outputModel);
    outputStatusNode.textContent = result.message;
  });
  document.getElementById('print-comparison').addEventListener('click', () => {
    const result = printComparison(outputModel);
    outputStatusNode.textContent = result.message;
  });
  comparisonNode.querySelectorAll('.remove-comparison').forEach((button) => button.addEventListener('click', () => {
    state.comparison = removeMachineFromComparison(state.comparison, button.dataset.machineId);
    renderComparison();
  }));
  comparisonNode.querySelector('#clear-comparison').addEventListener('click', () => {
    state.comparison = clearComparison();
    renderComparison();
  });
}

function renderRelationshipResults() {
  const eligibleMachines = filterMachines(state.data.machines, state.filters);
  const selectedMachine = resolveSelectedMachine(eligibleMachines, state.selectedMachineId);
  const relationship = findRelationshipResults(state.data.machines, selectedMachine, state.relationshipPercentage);

  if (eligibleMachines.length === 0) {
    resultsNode.innerHTML = '<p>No eligible machines match the active search and filters.</p>';
    return;
  }
  if (!state.selectedMachineId) {
    resultsNode.innerHTML = '<p>Select a machine to view Max HP relationships.</p>';
    return;
  }
  if (!relationship.available) {
    resultsNode.innerHTML = `<p class="error">Relationship results unavailable: ${escapeHtml(relationship.reason)}.</p>`;
    return;
  }

  const relationshipColumns = [
    ['machine', 'Machine', null],
    ['deltaMaxHp', 'Δ Max HP', 'hp'],
    ['deltaMaxHpPercent', 'Δ Max HP %', null],
    ['powerToWeightHpPerTonne', 'Power to Weight', 'hp/t'],
    ['manufacturer', 'Manufacturer', null],
    ['model_year', 'Model Year', null],
    ['rated_hp', 'Rated HP', 'hp'],
    ['max_hp', 'Max HP', 'hp'],
    ['max_hp_with_ipm', 'Max HP (With IPM)', 'hp'],
    ['max_torque_nm', 'Max Torque', 'Nm'],
    ['transmission', 'Transmission', null],
    ['top_speed_kmh', 'Top Speed (km/h)', 'km/h'],
    ['wheelbase_mm', 'Wheelbase (mm)', 'mm'],
    ['unladen_weight_kg', 'Unladen weight', 'kg'],
    ['max_permissible_weight_40_kmh_kg', 'Max permissible weight @ 40 km/h', 'kg'],
    ['max_permissible_weight_50_kmh_kg', 'Max permissible weight @ 50 km/h', 'kg'],
    ['max_permissible_weight_60_kmh_kg', 'Max permissible weight @ 60 km/h', 'kg'],
    ['rated_hydraulic_flow_lpm', 'Rated hydraulic pump flow', 'L/min'],
    ['max_hydraulic_flow_lpm', 'Max hydraulic pump flow', 'L/min'],
    ['max_scvs', 'Max SCVs', null],
    ['rear_hitch_capacity_kg', 'Rear hitch lift capacity', 'kg'],
    ['front_hitch_capacity_kg', 'Front hitch lift capacity', 'kg'],
    ['engine_capacity_l', 'Engine Capacity (L)', 'L'],
    ['number_of_cylinders', 'No. of cylinders', null],
    ['engine_manufacturer', 'Engine manufacturer', null],
    ['cab_suspension', 'Cab suspension', null],
    ['fuel_capacity_l', 'Fuel capacity', 'L'],
    ['engine_stage_tier', 'Engine stage / tier', null],
    ['adblue_tank_l', 'AdBlue tank', 'L'],
    ['rear_pto_option', 'Rear PTO option', null]
  ];
  const relationshipValue = (row, key, unit) => {
    if (key === 'deltaMaxHp') return row.isSelected ? '—' : formatDelta({ available: row.maxHp !== null, value: row.maxHp - safeMaxHp(selectedMachine) }, unit);
    if (key === 'deltaMaxHpPercent') return row.isSelected ? '—' : `${row.maxHp === null ? '—' : `${((row.maxHp - safeMaxHp(selectedMachine)) / safeMaxHp(selectedMachine) * 100).toFixed(2)}%`}`;
    if (key === 'powerToWeightHpPerTonne') return formatDisplayValue(row.machine[key], unit);
    return formatDisplayValue(row.machine[key], unit);
  };
  const rows = relationship.rows.map((row) => {
    const inComparison = state.comparison.machineIds.includes(row.machineId);
    const selectedLabel = row.isSelected ? '<span class="selected-row-label">Selected machine</span>' : '';
    const values = relationshipColumns.map(([key, label, unit]) => `<td class="${key.startsWith('delta') ? `delta ${key === 'deltaMaxHp' ? deltaDirection({ available: !row.isSelected && row.maxHp !== null, value: row.maxHp - safeMaxHp(selectedMachine) }) : deltaDirection({ available: !row.isSelected && row.percentageMaxHpDifference !== null, value: row.maxHp - safeMaxHp(selectedMachine) })}` : ''}">${escapeHtml(relationshipValue(row, key, unit))}${key === 'machine' ? selectedLabel : ''}</td>`).join('');
    const rowClasses = [row.isSelected ? 'selected-row' : '', inComparison ? 'in-comparison-row' : ''].filter(Boolean).join(' ');
    const actionAttribute = inComparison ? `aria-label="Remove ${escapeHtml(selectionLabel(row.machine))} from comparison"` : `aria-label="Add ${escapeHtml(selectionLabel(row.machine))} to comparison"`;
    return `<tr${rowClasses ? ` class="${rowClasses}"` : ''} data-machine-id="${escapeHtml(row.machineId)}" role="button" tabindex="0" aria-pressed="${inComparison}" ${actionAttribute}${row.isSelected ? ' aria-current="true"' : ''}>${values}</tr>`;
  }).join('');
  const tableHeaders = relationshipColumns.map(([, label]) => `<th scope="col">${escapeHtml(label)}</th>`).join('');
  const summary = `<div class="relationship-summary" aria-label="Relationship summary"><div><strong>Selected machine</strong><span>${escapeHtml(selectionLabel(selectedMachine))}</span></div><div><strong>Selected Max HP</strong><span>${escapeHtml(String(safeMaxHp(selectedMachine)))}</span></div><div><strong>Rule</strong><span>Within ${relationship.percentage}% of Max HP</span></div><div><strong>Max HP range</strong><span>${relationship.lowerBound.toFixed(2)}–${relationship.upperBound.toFixed(2)} hp</span></div><div><strong>Matches shown</strong><span>${relationship.rows.length}</span></div><div><strong>Active filters</strong><span>${escapeHtml(activeFilterSummary())}</span></div></div>`;

  resultsNode.innerHTML = `
    ${summary}
    <div class="relationship-scroll" role="region" aria-label="Max HP relationship results" tabindex="0"><table>
      <caption>Max HP relationship results for ${escapeHtml(selectionLabel(selectedMachine))}</caption>
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  `;
  function toggleRelationshipRow(machineId) {
    const alreadyIn = state.comparison.machineIds.includes(machineId);
    if (alreadyIn) {
      state.comparison = removeMachineFromComparison(state.comparison, machineId);
      renderComparison();
      renderRelationshipResults();
      return;
    }
    if (state.comparison.machineIds.length === 0 && machineId !== selectedMachine.machine_id) {
      state.comparison = addMachineToComparison(state.comparison, selectedMachine.machine_id, state.data.machines);
    }
    state.comparison = addMachineToComparison(state.comparison, machineId, state.data.machines);
    renderComparison();
    renderRelationshipResults();
    const heading = document.getElementById('comparison-heading');
    heading.scrollIntoView({ block: 'start', behavior: 'smooth' });
    heading.focus({ preventScroll: true });
  }
  resultsNode.querySelectorAll('.relationship-scroll tbody tr[data-machine-id]').forEach((row) => {
    row.addEventListener('click', () => toggleRelationshipRow(row.dataset.machineId));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleRelationshipRow(row.dataset.machineId); }
    });
  });
}

function safeMaxHp(machine) {
  return typeof machine?.max_hp === 'number' && Number.isFinite(machine.max_hp) ? machine.max_hp : null;
}

function activeFilterSummary() {
  const labels = [];
  for (const [key, value] of Object.entries(state.filters)) {
    const values = Array.isArray(value) ? value : [value];
    if (values.some(Boolean)) labels.push(key === 'topSpeed' ? `${values.filter(Boolean).join(', ')} km/h and up` : values.filter(Boolean).join(', '));
  }
  return labels.length ? labels.join(', ') : 'None';
}

function renderDiscovery() {
  const eligibleMachines = filterMachines(state.data.machines, state.filters);
  if (state.selectedMachineId && !resolveSelectedMachine(eligibleMachines, state.selectedMachineId)) state.selectedMachineId = '';
  const options = getFilterOptions(state.data.machines);
  const selectedMachine = resolveSelectedMachine(state.data.machines, state.selectedMachineId);
  const suggestionMachines = getSelectionOptions(eligibleMachines);
  const filterGroup = (key, label, values, type = 'checkbox', formatter = (value) => value) => {
    const selectedValues = Array.isArray(state.filters[key]) ? state.filters[key] : [state.filters[key]];
    return `<fieldset class="filter-group"><legend>${label}</legend><div class="filter-options">${values.map((value) => `<label class="filter-option"><input type="${type}" name="${key}" data-filter-key="${key}" value="${escapeHtml(value)}"${selectedValues.includes(String(value)) ? ' checked' : ''}><span>${escapeHtml(formatter(value))}</span></label>`).join('')}</div></fieldset>`;
  };
  discoveryNode.innerHTML = `
    <form id="discovery-form" class="discovery-form">
      <div class="control primary-machine"><label for="search">Primary machine</label><div class="combobox-wrap"><input id="search" name="search" type="search" role="combobox" aria-autocomplete="list" aria-controls="machine-suggestions" aria-expanded="${state.suggestionsOpen}" autocomplete="off" value="${escapeHtml(state.filters.search || (selectedMachine ? selectionLabel(selectedMachine) : ''))}" placeholder="Search manufacturer or machine" />${state.selectedMachineId ? '<button type="button" id="clear-machine" class="combobox-clear" aria-label="Clear selected machine">&times;</button>' : ''}<ul id="machine-suggestions" class="suggestions" role="listbox">${state.suggestionsOpen ? suggestionMachines.map((machine, index) => `<li id="suggestion-${index}" role="option" aria-selected="${index === state.suggestionIndex}"><button type="button" class="suggestion" data-machine-id="${escapeHtml(machine.machine_id)}">${escapeHtml(selectionLabel(machine))}</button></li>`).join('') : ''}</ul></div></div>
      <div class="control relationship-control"><label for="relationship-band">Relationship percentage</label><select id="relationship-band" name="relationshipPercentage">${RELATIONSHIP_PERCENTAGES.map((value) => `<option value="${value}"${value === state.relationshipPercentage ? ' selected' : ''}>${value}%</option>`).join('')}</select></div>
      <div class="discovery-actions"><button id="reset-filters" type="button">Reset Filters</button><button id="clear-filters" type="button">Clear Filters</button></div>
      <div class="filter-groups">
        ${filterGroup('manufacturer', 'Manufacturer', options.manufacturers)}
        ${filterGroup('modelYear', 'Model year', options.modelYears)}
        ${filterGroup('transmission', 'Transmission', options.transmission)}
        ${filterGroup('topSpeed', 'Top Speed', TOP_SPEED_THRESHOLDS.map(String), 'radio', (value) => `${value} km/h and up`)}
        ${filterGroup('cylinders', 'Cylinders', options.cylinders)}
        ${filterGroup('rearPto', 'Rear PTO option', options.rearPto)}
      </div>
    </form>
    <div class="discovery-summary"><p role="status" class="result-count">${eligibleMachines.length} eligible machine${eligibleMachines.length === 1 ? '' : 's'}</p><p class="active-filter-summary"><strong>Active filters:</strong> ${escapeHtml(activeFilterSummary())}</p></div>
  `;
  const form = document.getElementById('discovery-form');
  form.addEventListener('change', handleControlChange);
  const search = document.getElementById('search');
  search.addEventListener('input', () => {
    state.filters = { ...state.filters, search: search.value };
    if (state.selectedMachineId) state.selectedMachineId = '';
    state.suggestionsOpen = true;
    state.suggestionIndex = 0;
    renderDiscovery();
    renderRelationshipResults();
    const nextSearch = document.getElementById('search');
    nextSearch.focus();
    nextSearch.setSelectionRange(search.value.length, search.value.length);
  });
  search.addEventListener('keydown', (event) => {
    const suggestions = getSelectionOptions(filterMachines(state.data.machines, state.filters));
    if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); state.suggestionsOpen = true; state.suggestionIndex = Math.min(state.suggestionIndex + 1, suggestions.length - 1); renderDiscovery(); document.getElementById('search').focus(); }
    if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); state.suggestionIndex = Math.max(state.suggestionIndex - 1, 0); renderDiscovery(); document.getElementById('search').focus(); }
    if (event.key === 'Enter' && state.suggestionsOpen && suggestions[state.suggestionIndex]) { event.preventDefault(); selectSuggestion(suggestions[state.suggestionIndex]); }
    if (event.key === 'Escape') { state.suggestionsOpen = false; renderDiscovery(); document.getElementById('search').focus(); }
  });
  discoveryNode.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => selectSuggestion(state.data.machines.find((machine) => machine.machine_id === button.dataset.machineId))));
  document.getElementById('clear-machine')?.addEventListener('click', () => { state.selectedMachineId = ''; state.filters = { ...state.filters, search: '' }; state.suggestionsOpen = false; renderDiscovery(); renderRelationshipResults(); });
  const reset = () => {
    state.filters = resetFilters();
    state.suggestionsOpen = false;
    renderDiscovery();
    renderRelationshipResults();
  };
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.getElementById('clear-filters').addEventListener('click', reset);
}

function selectSuggestion(machine) {
  if (!machine) return;
  state.selectedMachineId = machine.machine_id;
  state.filters = { ...state.filters, search: '' };
  state.suggestionsOpen = false;
  state.suggestionIndex = 0;
  renderDiscovery();
  renderRelationshipResults();
}

function handleControlChange(event) {
  const control = event.target;
  const cursorPosition = control.name === 'search' ? control.selectionStart : null;
  if (control.name === 'relationshipPercentage') state.relationshipPercentage = Number(control.value);
  else if (control.dataset.filterKey) {
    const key = control.dataset.filterKey;
    if (key === 'topSpeed') state.filters = { ...state.filters, [key]: control.checked ? control.value : '' };
    else {
      const current = Array.isArray(state.filters[key]) ? state.filters[key] : [];
      const next = control.checked ? [...new Set([...current, control.value])] : current.filter((value) => value !== control.value);
      state.filters = { ...state.filters, [key]: next };
    }
  }
  renderDiscovery();
  renderRelationshipResults();
  if (control.name === 'search') {
    const searchControl = document.getElementById('search');
    searchControl.focus();
    searchControl.setSelectionRange(cursorPosition, cursorPosition);
  }
}

async function render() {
  try {
    statusNode.textContent = 'Loading generated catalogue…';
    state.data = await loadRuntimeData();
    const publishedCount = state.data.machines.length;
    const manufacturerCount = new Set(state.data.machines.map((machine) => machine.manufacturer)).size;
    const latestYear = Math.max(...state.data.machines.map((machine) => Number(machine.model_year) || 0));
    const buildInfo = state.data.buildInfo || {};
    summaryNode.innerHTML = `<p><strong>Published machines:</strong> ${publishedCount}</p><p><strong>Manufacturers:</strong> ${manufacturerCount}</p><p><strong>Latest model year:</strong> ${latestYear}</p><p><strong>Build:</strong> ${escapeHtml(buildInfo.buildDate || 'n/a')}</p>`;
    renderDiscovery();
    renderRelationshipResults();
    renderComparison();
    statusNode.textContent = 'Generated catalogue loaded successfully.';
  } catch (error) {
    statusNode.textContent = 'Data load failed.';
    summaryNode.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
    discoveryNode.innerHTML = '<p class="error">Discovery controls are unavailable because required data did not load.</p>';
    resultsNode.innerHTML = '<p class="error">Relationship results are unavailable because required data did not load.</p>';
    comparisonNode.innerHTML = '<p class="error">Comparison is unavailable because required data did not load.</p>';
  }
}

render();
