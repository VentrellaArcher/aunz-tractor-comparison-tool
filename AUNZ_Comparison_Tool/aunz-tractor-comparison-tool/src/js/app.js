import { loadRuntimeData } from './data-loader.js';
import { displaySchema, displaySections, formatDisplayValue } from './display-schema.js';
import { filterMachines, getFilterOptions, getSelectionOptions, resetFilters, resolveSelectedMachine, selectionLabel } from './filters.js';
import { findRelationshipResults, RELATIONSHIP_PERCENTAGES } from './relationships.js';
import { addMachineToComparison, calculateDelta, clearComparison, comparePowerToWeight, createComparisonState, formatDelta, removeMachineFromComparison, resolveComparisonMachines, MAX_COMPARISON_MACHINES } from './comparison.js';
import { copyComparison, createCsvText, createOutputModel, downloadCsv, printComparison } from './comparison-output.js';

const statusNode = document.getElementById('status');
const summaryNode = document.getElementById('summary');
const discoveryNode = document.getElementById('discovery');
const resultsNode = document.getElementById('relationship-results');
const comparisonNode = document.getElementById('comparison');
const comparisonStatusNode = document.getElementById('comparison-status');
const outputStatusNode = document.getElementById('output-status');

const state = {
  data: null,
  filters: resetFilters(),
  selectedMachineId: '',
  relationshipPercentage: 10,
  comparison: createComparisonState()
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function optionMarkup(values, selected) {
  return ['<option value="">All</option>', ...values.map((value) => `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(value)}</option>`)].join('');
}

function comparisonValue(field, machine) {
  return formatDisplayValue(machine[field.propertyPath], field.unit, field.blankValue);
}

function machineHeading(machine, index) {
  return `<div class="comparison-machine-heading"><strong>Machine ${String.fromCharCode(65 + index)}${index === 0 ? ' (baseline)' : ''}</strong><span>${escapeHtml(selectionLabel(machine))}</span><button type="button" class="remove-comparison" data-machine-id="${escapeHtml(machine.machine_id)}" aria-label="Remove ${escapeHtml(selectionLabel(machine))} from comparison">Remove</button></div>`;
}

function renderComparison() {
  const machines = resolveComparisonMachines(state.comparison, state.data.machines);
  const comparisonMessage = state.comparison.message ? `<p class="error" role="alert">${escapeHtml(state.comparison.message)}</p>` : '';
  if (machines.length === 0) {
    comparisonNode.innerHTML = `${comparisonMessage}<div class="comparison-actions"><button type="button" id="copy-comparison" disabled>Copy Comparison</button><button type="button" id="export-csv" disabled>Export CSV</button><button type="button" id="print-comparison" disabled>Print Comparison</button></div><p>No machines are currently compared.</p>`;
    comparisonStatusNode.textContent = state.comparison.message || 'Comparison is empty.';
    return;
  }

  const baseline = machines[0];
  const powerToWeight = machines.length > 1 ? comparePowerToWeight(baseline, machines[1]) : null;
  const sections = displaySections.map((section) => {
    const fields = displaySchema.filter((field) => field.section === section).sort((left, right) => left.order - right.order);
    const rows = fields.map((field) => {
      const values = machines.map((machine, index) => {
        const value = comparisonValue(field, machine);
        const delta = index === 0 ? '<span class="baseline-label">Baseline</span>' : `<span class="delta">Delta: ${escapeHtml(formatDelta(calculateDelta(field, baseline, machine), field.unit))}</span>`;
        return `<td>${escapeHtml(value)}<small>${delta}</small></td>`;
      }).join('');
      return `<tr class="${field.priority ? 'priority-row' : ''}"><th scope="row">${escapeHtml(field.label)}${field.priority ? ' <span class="priority">Priority</span>' : ''}</th>${values}</tr>`;
    }).join('');
    return `<tbody class="comparison-section"><tr><th colspan="${machines.length + 1}" scope="colgroup">${escapeHtml(section)}</th></tr>${rows}</tbody>`;
  }).join('');

  const powerNote = powerToWeight ? `<p class="comparison-note">Power-to-weight basis: ${escapeHtml(powerToWeight.powerBasis)} / ${escapeHtml(powerToWeight.weightBasis)}. hp/t delta: ${escapeHtml(formatDelta({ available: powerToWeight.available, value: powerToWeight.hpPerTonneDelta }, 'hp/t'))}; kW/t delta: ${escapeHtml(formatDelta({ available: powerToWeight.available, value: powerToWeight.kwPerTonneDelta }, 'kW/t'))}.</p>` : '';
  const headings = machines.map(machineHeading).join('');
  const headers = machines.map((machine, index) => `<th scope="col">Machine ${String.fromCharCode(65 + index)}${index === 0 ? ' (baseline)' : ''}<br>${escapeHtml(selectionLabel(machine))}</th>`).join('');
  comparisonNode.innerHTML = `${comparisonMessage}<div class="comparison-actions"><button type="button" id="copy-comparison">Copy Comparison</button><button type="button" id="export-csv">Export CSV</button><button type="button" id="print-comparison">Print Comparison</button></div><p role="status">${machines.length} of ${MAX_COMPARISON_MACHINES} comparison slots in use.</p><div class="comparison-controls">${headings}<button type="button" id="clear-comparison">Clear Comparison</button></div>${powerNote}<div class="comparison-scroll" role="region" aria-label="Detailed comparison table" tabindex="0"><table><caption>Detailed side-by-side tractor comparison. Machine A is the baseline for deltas.</caption><thead><tr><th scope="col">Specification</th>${headers}</tr></thead>${sections}</table></div>`;
  comparisonStatusNode.textContent = `${machines.length} machines are in the comparison.`;
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

  const rows = relationship.rows.map((row) => `
    <tr${row.isSelected ? ' class="selected-row"' : ''}>
      <td>${row.isSelected ? '<strong>Selected machine</strong>' : 'Related machine'}</td>
      <td>${escapeHtml(row.machine.machine)}</td>
      <td>${escapeHtml(row.machine.manufacturer)}</td>
      <td>${escapeHtml(row.machine.model_year)}</td>
      <td>${row.maxHp ?? '—'}</td>
      <td>${row.absoluteMaxHpDifference ?? '—'}</td>
      <td>${row.percentageMaxHpDifference === null ? '—' : `${row.percentageMaxHpDifference.toFixed(2)}%`}</td>
      <td>${row.isSelected ? '—' : `<button type="button" class="compare-candidate" data-machine-id="${escapeHtml(row.machineId)}">Compare with selected machine</button>`}</td>
    </tr>
  `).join('');

  resultsNode.innerHTML = `
    <p role="status">${relationship.rows.length} result${relationship.rows.length === 1 ? '' : 's'} within ${relationship.percentage}% of Max HP.</p>
    <table>
      <caption>Max HP relationship results for ${escapeHtml(selectionLabel(selectedMachine))}</caption>
      <thead><tr><th scope="col">Role</th><th scope="col">Machine</th><th scope="col">Manufacturer</th><th scope="col">Model year</th><th scope="col">Max HP</th><th scope="col">Absolute difference</th><th scope="col">Percentage difference</th><th scope="col">Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  resultsNode.querySelectorAll('.compare-candidate').forEach((button) => button.addEventListener('click', () => {
    state.comparison = addMachineToComparison(state.comparison, selectedMachine.machine_id, state.data.machines);
    state.comparison = addMachineToComparison(state.comparison, button.dataset.machineId, state.data.machines);
    renderComparison();
    comparisonNode.scrollIntoView({ block: 'start' });
    document.getElementById('comparison-heading').focus();
  }));
}

function renderDiscovery() {
  const eligibleMachines = filterMachines(state.data.machines, state.filters);
  if (state.selectedMachineId && !resolveSelectedMachine(eligibleMachines, state.selectedMachineId)) state.selectedMachineId = '';
  const options = getFilterOptions(state.data.machines);
  const selectionOptions = getSelectionOptions(eligibleMachines);
  discoveryNode.innerHTML = `
    <form id="discovery-form" class="discovery-form">
      <div class="control"><label for="search">Search machine or manufacturer</label><input id="search" name="search" type="search" value="${escapeHtml(state.filters.search)}" /></div>
      <div class="control"><label for="manufacturer">Manufacturer</label><select id="manufacturer" name="manufacturer">${optionMarkup(options.manufacturers, state.filters.manufacturer)}</select></div>
      <div class="control"><label for="model-year">Model year</label><select id="model-year" name="modelYear">${optionMarkup(options.modelYears, state.filters.modelYear)}</select></div>
      <div class="control"><label for="transmission">Transmission</label><select id="transmission" name="transmission">${optionMarkup(options.transmission, state.filters.transmission)}</select></div>
      <div class="control"><label for="top-speed">Top Speed</label><select id="top-speed" name="topSpeed">${optionMarkup(options.topSpeed, state.filters.topSpeed)}</select></div>
      <div class="control"><label for="cylinders">Cylinders</label><select id="cylinders" name="cylinders">${optionMarkup(options.cylinders, state.filters.cylinders)}</select></div>
      <div class="control"><label for="rear-pto">Rear PTO</label><select id="rear-pto" name="rearPto">${optionMarkup(options.rearPto, state.filters.rearPto)}</select></div>
      <div class="control"><label for="market">Market</label><select id="market" name="market">${optionMarkup(options.market, state.filters.market)}</select></div>
      <div class="control"><label for="machine-select">Selected machine</label><select id="machine-select" name="machineId"><option value="">Choose a machine</option>${selectionOptions.map((machine) => `<option value="${escapeHtml(machine.machine_id)}"${machine.machine_id === state.selectedMachineId ? ' selected' : ''}>${escapeHtml(selectionLabel(machine))}</option>`).join('')}</select></div>
      <div class="control"><label for="relationship-band">Max HP relationship band</label><select id="relationship-band" name="relationshipPercentage">${RELATIONSHIP_PERCENTAGES.map((value) => `<option value="${value}"${value === state.relationshipPercentage ? ' selected' : ''}>${value}%</option>`).join('')}</select></div>
      <button id="reset-filters" type="button">Reset Filters</button>
    </form>
    <p role="status" class="result-count">${eligibleMachines.length} eligible machine${eligibleMachines.length === 1 ? '' : 's'}</p>
  `;
  const form = document.getElementById('discovery-form');
  form.addEventListener('input', handleControlChange);
  form.addEventListener('change', handleControlChange);
  document.getElementById('reset-filters').addEventListener('click', () => {
    state.filters = resetFilters();
    renderDiscovery();
    renderRelationshipResults();
  });
}

function handleControlChange(event) {
  const control = event.target;
  const cursorPosition = control.name === 'search' ? control.selectionStart : null;
  if (control.name === 'machineId') state.selectedMachineId = control.value;
  else if (control.name === 'relationshipPercentage') state.relationshipPercentage = Number(control.value);
  else if (control.name in state.filters) state.filters = { ...state.filters, [control.name]: control.value };
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
