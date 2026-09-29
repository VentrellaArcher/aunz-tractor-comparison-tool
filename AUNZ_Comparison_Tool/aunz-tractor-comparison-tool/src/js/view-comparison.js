import { MAX_COMPARISON_MACHINES } from './comparison.js';
import { selectionLabel } from './filters.js';
import { deltaMarkup, escapeHtml, icon, plural, slotBadge, valueMarkup } from './view-html.js';

export function emptyComparisonMarkup() {
  return `<div class="empty-state comparison-empty"><span class="empty-icon" aria-hidden="true">${icon('columns')}</span><p>No machines are currently compared.</p><p class="hint">Add machines from the Max HP results above, or search for one below. You can compare up to ${MAX_COMPARISON_MACHINES} machines side by side.</p></div>`;
}

export function comparisonPickerMarkup(query, isFull) {
  const hint = isFull ? `Comparison is full (${MAX_COMPARISON_MACHINES} of ${MAX_COMPARISON_MACHINES}). Remove a machine to add another.` : 'Type a brand or model, then choose a machine to add.';
  return `<div class="comparison-picker"><label for="comparison-search">Add a machine directly</label><div class="comparison-picker-input"><span class="field-icon" aria-hidden="true">${icon('search')}</span><input id="comparison-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="comparison-suggestions" aria-describedby="comparison-search-hint" autocomplete="off" spellcheck="false" placeholder="Search by manufacturer or model" value="${escapeHtml(query)}" data-focus-key="picker"${isFull ? ' disabled' : ''} /><ul id="comparison-suggestions" class="comparison-suggestions" role="listbox" aria-label="Machines to add" hidden></ul></div><p id="comparison-search-hint" class="hint">${escapeHtml(hint)}</p></div>`;
}

export function pickerSuggestionsMarkup(machines, activeIndex) {
  return machines.map((machine, index) => `<li id="picker-option-${index}" role="option" class="comparison-suggestion" aria-selected="${index === activeIndex}" data-action="add-suggestion" data-machine-id="${escapeHtml(machine.machine_id)}">${escapeHtml(selectionLabel(machine))}<span aria-hidden="true">Add</span></li>`).join('');
}

export function actionsMarkup() {
  return `<div class="comparison-actions" role="group" aria-label="Comparison actions">
      <button type="button" id="copy-comparison" class="btn btn-secondary" data-action="copy-comparison" data-focus-key="copy">${icon('copy')}<span>Copy Comparison</span></button>
      <button type="button" id="export-csv" class="btn btn-secondary" data-action="export-csv" data-focus-key="export">${icon('download')}<span>Export CSV</span></button>
      <button type="button" id="print-comparison" class="btn btn-secondary" data-action="print-comparison" data-focus-key="print">${icon('print')}<span>Print Comparison</span></button>
      <button type="button" id="copy-link" class="btn btn-secondary" data-action="copy-link" data-focus-key="link">${icon('link')}<span>Copy link</span></button>
    </div>`;
}

export function machineCardsMarkup(cards) {
  const items = cards.map((card) => {
    const meta = [card.year, card.market].filter((part) => part !== null && part !== undefined && part !== '').join(' · ');
    const highlights = card.highlights.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${valueMarkup(item.text, item.missing)}</dd></div>`).join('');
    const baselineButton = card.isBaseline ? '' : `<button type="button" class="btn btn-small btn-quiet" data-action="make-baseline" data-machine-id="${escapeHtml(card.id)}" data-focus-key="baseline:${escapeHtml(card.id)}" aria-label="Make ${escapeHtml(card.label)} the baseline machine">Make baseline</button>`;
    return `<li class="machine-card${card.isBaseline ? ' is-baseline' : ''}">
        <div class="machine-card-head">${slotBadge(card.letter, card.isBaseline)}<span class="machine-card-role"><span class="visually-hidden">Machine ${card.letter}</span>${card.isBaseline ? '<span class="baseline-label">Baseline</span>' : `<span aria-hidden="true">Machine ${card.letter}</span>`}</span></div>
        <p class="machine-brand">${escapeHtml(card.manufacturer)}</p>
        <h3 class="machine-title">${escapeHtml(card.model || card.name)}</h3>
        ${meta ? `<p class="machine-meta">${escapeHtml(meta)}</p>` : ''}
        <dl class="machine-highlights">${highlights}</dl>
        <div class="machine-actions">${baselineButton}<button type="button" class="btn btn-small btn-quiet remove-comparison" data-action="remove-from-comparison" data-machine-id="${escapeHtml(card.id)}" data-focus-key="remove:${escapeHtml(card.id)}" aria-label="Remove ${escapeHtml(card.label)} from comparison">${icon('close')}<span>Remove</span></button></div>
      </li>`;
  }).join('');
  return `<div class="comparison-controls">
      <ol class="machine-cards" aria-label="Machines in the comparison">${items}</ol>
      <button type="button" id="clear-comparison" class="btn btn-quiet" data-action="clear-comparison" data-focus-key="clear">${icon('reset')}<span>Clear Comparison</span></button>
    </div>`;
}

export function hiddenRowsNote(totals) {
  const notes = [];
  if (totals.hiddenEmpty > 0) notes.push(`${plural(totals.hiddenEmpty, 'row')} with no published value for these machines ${totals.hiddenEmpty === 1 ? 'is' : 'are'} hidden`);
  if (totals.hiddenSame > 0) notes.push(`${plural(totals.hiddenSame, 'row')} with identical values ${totals.hiddenSame === 1 ? 'is' : 'are'} hidden`);
  return notes.length ? `${notes.join('. ')}.` : '';
}

export function viewOptionsMarkup(view, machineCount, totals) {
  const note = hiddenRowsNote(totals);
  return `<div class="view-options" role="group" aria-label="Table view options">
      <label class="switch"><input type="checkbox" data-action="toggle-differences" data-focus-key="diff"${view.differencesOnly ? ' checked' : ''}${machineCount < 2 ? ' disabled' : ''}><span class="switch-track" aria-hidden="true"></span><span class="switch-label">Show only differences</span></label>
      <label class="switch"><input type="checkbox" data-action="toggle-empty" data-focus-key="empty"${view.showEmpty ? ' checked' : ''}><span class="switch-track" aria-hidden="true"></span><span class="switch-label">Show rows with no published value</span></label>
      <div class="view-options-sections"><button type="button" class="btn btn-small btn-quiet" data-action="collapse-all" data-focus-key="collapse">Collapse all</button><button type="button" class="btn btn-small btn-quiet" data-action="expand-all" data-focus-key="expand">Expand all</button></div>
    </div>
    <p class="rows-note" role="status">${escapeHtml(note)}</p>`;
}

function cellMarkup(cell) {
  const note = cell.note ? `<span class="cell-note">${escapeHtml(cell.note)}</span>` : '';
  const flag = cell.differs ? '<span class="visually-hidden">Differs from baseline. </span>' : '';
  const delta = cell.delta && (cell.delta.available || !cell.missing) ? deltaMarkup(cell.delta) : '';
  return `${flag}${valueMarkup(cell.text, cell.missing)}${note}${delta}`;
}

function rowMarkup(row) {
  const cells = row.cells.map((cell) => `<td class="value-cell${cell.differs ? ' differs' : ''}">${cellMarkup(cell)}</td>`).join('');
  const classes = [row.priority ? 'priority-row' : '', row.allSame ? '' : 'row-differs'].filter(Boolean).join(' ');
  return `<tr${classes ? ` class="${classes}"` : ''}><th scope="row">${escapeHtml(row.label)}${row.priority ? ' <span class="priority">Priority</span>' : ''}</th>${cells}</tr>`;
}

function sectionToggle(section, isCollapsed, keyPrefix) {
  return `<button type="button" class="section-toggle" data-action="toggle-section" data-section="${escapeHtml(section.name)}" data-focus-key="${keyPrefix}:${escapeHtml(section.id)}" aria-expanded="${!isCollapsed}">${icon('chevron-down', 'chevron')}<span class="section-title">${escapeHtml(section.name)}</span><span class="section-count">${plural(section.visibleRows.length, 'row')}</span></button>`;
}

function sectionBody(section, columnCount, isCollapsed) {
  const rows = isCollapsed ? '' : section.visibleRows.map(rowMarkup).join('');
  const note = section.note && !isCollapsed ? `<p class="section-note">${escapeHtml(section.note)}</p>` : '';
  return `<tbody class="comparison-section${isCollapsed ? ' is-collapsed' : ''}" data-section="${escapeHtml(section.name)}"><tr class="section-row"><th colspan="${columnCount + 1}" scope="colgroup">${sectionToggle(section, isCollapsed, 'section')}${note}</th></tr>${rows}</tbody>`;
}

export function comparisonTableMarkup(model, collapsed) {
  const headers = model.machines.map((card) => `<th scope="col" class="machine-col${card.isBaseline ? ' is-baseline' : ''}">${slotBadge(card.letter, card.isBaseline)}<span class="visually-hidden">Machine ${card.letter}${card.isBaseline ? ' (baseline): ' : ': '}</span><span class="col-name">${escapeHtml(card.name)}</span>${card.isBaseline ? '<span class="baseline-label">Baseline</span>' : ''}</th>`).join('');
  const sections = model.sections.filter((section) => !section.hidden).map((section) => sectionBody(section, model.machines.length, collapsed.has(section.name))).join('');
  return `<div class="comparison-scroll" role="region" aria-label="Detailed comparison table" tabindex="0"><table class="comparison-table"><caption class="visually-hidden">Detailed side-by-side tractor comparison. Machine A is the baseline for differences.</caption><thead><tr><th scope="col" class="spec-col">Specification</th>${headers}</tr></thead>${sections}</table></div>`;
}

function specCardMarkup(row, cards) {
  const values = row.cells.map((cell, index) => `<div class="spec-value${cards[index].isBaseline ? ' is-baseline' : ''}${cell.differs ? ' differs' : ''}"><dt>${slotBadge(cards[index].letter, cards[index].isBaseline)}<span class="visually-hidden">Machine ${cards[index].letter}: </span><span class="spec-machine">${escapeHtml(cards[index].name)}</span></dt><dd>${cellMarkup(cell)}</dd></div>`).join('');
  return `<article class="spec-card${row.priority ? ' priority-row' : ''}${row.allSame ? '' : ' row-differs'}"><h4>${escapeHtml(row.label)}${row.priority ? ' <span class="priority">Priority</span>' : ''}</h4><dl class="spec-values">${values}</dl></article>`;
}

export function specListMarkup(model, collapsed) {
  const sections = model.sections.filter((section) => !section.hidden).map((section) => {
    const isCollapsed = collapsed.has(section.name);
    const cards = isCollapsed ? '' : `<div class="spec-cards">${section.visibleRows.map((row) => specCardMarkup(row, model.machines)).join('')}</div>`;
    const note = section.note && !isCollapsed ? `<p class="section-note">${escapeHtml(section.note)}</p>` : '';
    return `<section class="spec-section${isCollapsed ? ' is-collapsed' : ''}" aria-labelledby="spec-${escapeHtml(section.id)}"><h3 id="spec-${escapeHtml(section.id)}">${sectionToggle(section, isCollapsed, 'section-list')}</h3>${note}${cards}</section>`;
  }).join('');
  return `<div class="spec-list" role="region" aria-label="Detailed comparison by specification">${sections}</div>`;
}

// Filled comparison: cards, view options, then the table (wide screens and print) and spec list (narrow screens).
export function comparisonMarkup(context) {
  const { model, pickerQuery, collapsed } = context;
  const isFull = model.machines.length >= MAX_COMPARISON_MACHINES;
  return `${comparisonPickerMarkup(pickerQuery, isFull)}
    ${actionsMarkup()}
    <p class="comparison-count" role="status">${model.machines.length} of ${MAX_COMPARISON_MACHINES} comparison slots in use.</p>
    ${machineCardsMarkup(model.machines)}
    ${viewOptionsMarkup(model.options, model.machines.length, model.totals)}
    <p class="table-note">Differences show each machine minus the baseline (Machine A). A dash means no published value.</p>
    ${comparisonTableMarkup(model, collapsed)}
    ${specListMarkup(model, collapsed)}`;
}

export function emptyComparisonWithPickerMarkup(pickerQuery) {
  return `${comparisonPickerMarkup(pickerQuery, false)}${emptyComparisonMarkup()}`;
}

export function trayMarkup(cards) {
  const slots = cards.map((card) => `<li class="tray-slot${card.isBaseline ? ' is-baseline' : ''}">${slotBadge(card.letter, card.isBaseline)}<span class="tray-name">${escapeHtml(card.name)}</span><button type="button" class="tray-remove" data-action="remove-from-comparison" data-machine-id="${escapeHtml(card.id)}" data-focus-key="tray-remove:${escapeHtml(card.id)}" aria-label="Remove ${escapeHtml(card.label)} from comparison">${icon('close')}</button></li>`).join('');
  const remaining = MAX_COMPARISON_MACHINES - cards.length;
  return `<div class="tray-inner">
      <p class="tray-count"><strong>${cards.length}</strong> of ${MAX_COMPARISON_MACHINES} selected${remaining === 0 ? ' · full' : ''}</p>
      <ol class="tray-slots" aria-label="Machines selected for comparison">${slots}</ol>
      <div class="tray-actions"><button type="button" class="btn btn-quiet" data-action="clear-comparison" data-focus-key="tray-clear">Clear</button><a class="btn btn-primary" href="#comparison-heading">View comparison</a></div>
    </div>`;
}
