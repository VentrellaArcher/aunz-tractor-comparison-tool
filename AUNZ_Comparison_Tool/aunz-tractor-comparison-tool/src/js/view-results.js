import { CARD_HIGHLIGHT_KEYS, RESULT_COLUMNS, RESULT_SORTS, columnsForMode, resultCell } from './results-model.js';
import { RELATIONSHIP_PERCENTAGES } from './relationships.js';
import { machineModel, machineName, selectionLabel } from './filters.js';
import { deltaMarkup, escapeHtml, icon, notApplicableMarkup, valueMarkup } from './view-html.js';

const NUMERIC_KEYS = new Set(['model_year', 'number_of_cylinders']);

const UNAVAILABLE_TEXT = {
  selected_max_hp_unavailable: 'This machine has no published Max HP, so a Max HP range cannot be calculated. Choose another machine.',
  selected_machine_unavailable: 'Select a machine to view Max HP relationships.'
};

export function noEligibleMarkup() {
  return '<div class="empty-state"><p>No eligible machines match the active search and filters.</p><button type="button" class="btn btn-secondary" data-action="reset-filters">Reset Filters</button></div>';
}

export function noSelectionMarkup() {
  return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">${icon('columns')}</span><p>Select a machine to view Max HP relationships.</p><p class="hint">Machines with a similar Max HP will be listed here, ready to add to your comparison.</p></div>`;
}

export function unavailableMarkup(reason) {
  return `<p class="error" role="alert">Relationship results unavailable: ${escapeHtml(UNAVAILABLE_TEXT[reason] ?? 'the selected machine cannot be used as a baseline.')}</p>`;
}

function isNumericColumn(column) {
  return column.unit !== null || column.key.startsWith('delta') || NUMERIC_KEYS.has(column.key);
}

// Native checkbox: its checked state is the comparison membership, so the label never has to change.
// The tick and plus are drawn by CSS to keep long result lists light.
export function compareToggleMarkup(machine, added, withText = false) {
  const label = selectionLabel(machine);
  return `<label class="compare-toggle${added ? ' is-added' : ''}"><input type="checkbox" class="compare-toggle-input" data-action="toggle-compare" data-machine-id="${escapeHtml(machine.machine_id)}" data-focus-key="toggle:${escapeHtml(machine.machine_id)}" aria-label="Add ${escapeHtml(label)} to comparison"${added ? ' checked' : ''}><span class="compare-toggle-box" aria-hidden="true"></span>${withText ? '<span class="compare-toggle-text" aria-hidden="true">Add</span>' : ''}</label>`;
}

function machineIdentity(row) {
  const machine = row.machine;
  const meta = [machine.model_year, machine.market].filter((part) => part !== null && part !== undefined && part !== '').join(' · ');
  return `<span class="machine-name">${escapeHtml(machineName(machine))}</span>${meta ? `<span class="machine-sub">${escapeHtml(meta)}</span>` : ''}${row.isSelected ? '<span class="selected-row-label">Selected machine</span>' : ''}`;
}

function cellMarkup(row, column) {
  const cell = resultCell(row, column);
  if (column.key === 'deltaMaxHp' || column.key === 'deltaMaxHpPercent') {
    if (row.isSelected) return notApplicableMarkup('Selected machine');
    return cell.missing ? valueMarkup(cell.text, true) : deltaMarkup({ available: true, direction: cell.direction, text: cell.text });
  }
  return valueMarkup(cell.text, cell.missing);
}

function tableMarkup(rows, columns, comparisonIds, title) {
  const head = columns.map((column) => {
    const classes = [isNumericColumn(column) ? 'num' : '', column.priority ? 'is-priority' : ''].filter(Boolean).join(' ');
    return `<th scope="col"${classes ? ` class="${classes}"` : ''}>${escapeHtml(column.label)}</th>`;
  }).join('');
  const body = rows.map((row) => {
    const added = comparisonIds.includes(row.machineId);
    const classes = [row.isSelected ? 'selected-row' : '', added ? 'in-comparison-row' : ''].filter(Boolean).join(' ');
    const cells = columns.map((column) => {
      if (column.key === 'machine') {
        return `<td class="machine-cell"><div class="machine-cell-inner">${compareToggleMarkup(row.machine, added)}<div class="machine-cell-text">${machineIdentity(row)}</div></div></td>`;
      }
      const cell = resultCell(row, column);
      const direction = cell.direction && !cell.missing ? ` delta-cell ${escapeHtml(cell.direction)}` : '';
      return `<td class="${isNumericColumn(column) ? 'num' : 'text'}${direction}">${cellMarkup(row, column)}</td>`;
    }).join('');
    return `<tr${classes ? ` class="${classes}"` : ''} data-machine-id="${escapeHtml(row.machineId)}"${row.isSelected ? ' aria-current="true"' : ''}>${cells}</tr>`;
  }).join('');
  return `<div class="relationship-scroll" role="region" aria-label="Max HP relationship results" tabindex="0"><table class="results-table">
      <caption class="visually-hidden">${escapeHtml(title)}</caption>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
}

function cardStat(row, column) {
  return `<div class="result-stat"><dt>${escapeHtml(column.label)}</dt><dd>${cellMarkup(row, column)}</dd></div>`;
}

const CARD_ONLY_KEYS = new Set(['machine', 'manufacturer', 'model_year', 'deltaMaxHp', 'deltaMaxHpPercent', ...CARD_HIGHLIGHT_KEYS]);

// The long tail of a card is filled in the first time it is opened, which keeps big result lists fast.
export function cardMoreMarkup(row) {
  return RESULT_COLUMNS.filter((column) => !CARD_ONLY_KEYS.has(column.key)).map((column) => cardStat(row, column)).join('');
}

function cardsMarkup(rows, comparisonIds, title) {
  const byKey = new Map(RESULT_COLUMNS.map((column) => [column.key, column]));
  const cards = rows.map((row) => {
    const added = comparisonIds.includes(row.machineId);
    const classes = ['result-card', row.isSelected ? 'selected-row' : '', added ? 'in-comparison-row' : ''].filter(Boolean).join(' ');
    const meta = [row.machine.model_year, row.machine.market].filter((part) => part !== null && part !== undefined && part !== '').join(' · ');
    const differenceKeys = row.isSelected ? [] : ['deltaMaxHp', 'deltaMaxHpPercent'];
    const stats = [...differenceKeys, ...CARD_HIGHLIGHT_KEYS].map((key) => cardStat(row, byKey.get(key))).join('');
    return `<li class="${classes}" data-machine-id="${escapeHtml(row.machineId)}"${row.isSelected ? ' aria-current="true"' : ''}>
        <div class="result-card-head">
          <div class="result-card-title"><p class="result-brand">${escapeHtml(row.machine.manufacturer)}</p><h3>${escapeHtml(machineModel(row.machine) || machineName(row.machine))}</h3>${meta ? `<p class="result-meta">${escapeHtml(meta)}</p>` : ''}${row.isSelected ? '<span class="selected-row-label">Selected machine</span>' : ''}</div>
          ${compareToggleMarkup(row.machine, added, true)}
        </div>
        <dl class="result-stats">${stats}</dl>
        <details class="result-more" data-machine-id="${escapeHtml(row.machineId)}"><summary>All specifications</summary><dl class="result-stats result-stats-all"></dl></details>
      </li>`;
  }).join('');
  return `<ul class="results-cards" aria-label="${escapeHtml(title)}">${cards}</ul>`;
}

export function bandControlMarkup(percentage) {
  const segments = RELATIONSHIP_PERCENTAGES.map((value) => `<label class="segment"><input type="radio" name="relationshipPercentage" value="${value}" data-focus-key="band:${value}"${value === percentage ? ' checked' : ''}><span>${value}%</span></label>`).join('');
  return `<fieldset class="band-control"><legend>Relationship percentage</legend><div class="segments">${segments}</div><p class="hint">Lists machines whose Max HP is within this share of the selected machine’s Max HP.</p></fieldset>`;
}

export function summaryMarkup(selectedMachine, relationship, candidateCount) {
  const market = selectedMachine.market ? ` · ${escapeHtml(selectedMachine.market)}` : '';
  return `<div class="relationship-summary" role="group" aria-label="Relationship summary">
      <div class="summary-primary"><strong>Selected machine</strong><span class="summary-machine">${escapeHtml(selectionLabel(selectedMachine))}${market}</span></div>
      <div><strong>Selected Max HP</strong><span>${escapeHtml(String(selectedMachine.max_hp))} hp</span></div>
      <div><strong>Rule</strong><span>Within ${relationship.percentage}% of Max HP</span></div>
      <div><strong>Max HP range</strong><span>${relationship.lowerBound.toFixed(2)}–${relationship.upperBound.toFixed(2)} hp</span></div>
      <div><strong>In range</strong><span>${candidateCount} machine${candidateCount === 1 ? '' : 's'}</span></div>
    </div>`;
}

function toolbarMarkup(results, brands, layout) {
  const sortOptions = RESULT_SORTS.map((sort) => `<option value="${escapeHtml(sort.key)}"${sort.key === results.sort ? ' selected' : ''}>${escapeHtml(sort.label)}</option>`).join('');
  const chosen = results.brands.map((brand) => brand.toLowerCase());
  const brandChips = brands.length > 1
    ? `<fieldset class="brand-filter"><legend>Show only</legend><div class="filter-options">${brands.map((brand) => `<label class="filter-option"><input type="checkbox" name="resultBrand" value="${escapeHtml(brand.name)}" data-focus-key="brand:${escapeHtml(brand.name)}"${chosen.includes(brand.name.toLowerCase()) ? ' checked' : ''}><span class="chip"><span class="chip-label">${escapeHtml(brand.name)}</span><span class="chip-count">${brand.count}</span></span></label>`).join('')}</div></fieldset>`
    : '';
  const modes = [['key', 'Key specs'], ['all', 'All specifications']].map(([mode, label]) => `<label class="segment"><input type="radio" name="resultColumns" value="${mode}" data-focus-key="cols:${mode}"${results.columns === mode ? ' checked' : ''}><span>${label}</span></label>`).join('');
  return `<div class="results-toolbar">
      <div class="control sort-control"><label for="results-sort">Sort by</label><select id="results-sort" name="resultsSort" data-focus-key="sort">${sortOptions}</select></div>
      ${layout === 'table' ? `<fieldset class="columns-toggle"><legend>Columns</legend><div class="segments">${modes}</div></fieldset>` : ''}
      ${brandChips}
    </div>`;
}

// Everything below the discovery form: summary, band control, view controls and the result list.
// `layout` is "table" on wide screens and "cards" on narrow ones; only one is ever rendered.
export function resultsMarkup(context) {
  const { selectedMachine, relationship, rows, visibleRows, brands, results, comparisonIds, layout = 'table' } = context;
  const candidateCount = rows.filter((row) => !row.isSelected).length;
  const shownCount = visibleRows.filter((row) => !row.isSelected).length;
  const narrowed = results.brands.length > 0;
  const title = `Max HP relationship results for ${selectionLabel(selectedMachine)}`;
  const countText = narrowed
    ? `Showing ${shownCount} of ${candidateCount} machines in range`
    : `${candidateCount} machine${candidateCount === 1 ? '' : 's'} in range`;
  let body;
  if (narrowed && shownCount === 0) {
    body = '<div class="empty-state"><p>No machines from the chosen manufacturers are in this range.</p><button type="button" class="btn btn-secondary" data-action="clear-brands">Show all manufacturers</button></div>';
  } else if (layout === 'cards') {
    body = cardsMarkup(visibleRows, comparisonIds, title);
  } else {
    body = tableMarkup(visibleRows, columnsForMode(results.columns), comparisonIds, title);
  }
  return `${summaryMarkup(selectedMachine, relationship, candidateCount)}
    ${bandControlMarkup(relationship.percentage)}
    ${toolbarMarkup(results, brands, layout)}
    <p class="results-count" role="status">${escapeHtml(countText)}${narrowed ? ' <button type="button" class="link-button" data-action="clear-brands">Show all</button>' : ''}</p>
    ${body}`;
}
