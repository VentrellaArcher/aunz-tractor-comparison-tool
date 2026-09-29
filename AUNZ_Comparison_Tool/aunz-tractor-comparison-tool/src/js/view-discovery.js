import { escapeHtml, icon, plural } from './view-html.js';
import { machineName } from './filters.js';

export const SUGGESTION_LIMIT = 40;

export const FILTER_GROUPS = [
  { key: 'manufacturer', label: 'Manufacturer', optionsKey: 'manufacturers', type: 'checkbox' },
  { key: 'modelYear', label: 'Model year', optionsKey: 'modelYears', type: 'checkbox' },
  { key: 'transmission', label: 'Transmission', optionsKey: 'transmission', type: 'checkbox' },
  { key: 'topSpeed', label: 'Top Speed', optionsKey: 'topSpeed', type: 'radio', formatter: (value) => `${value} km/h and up` },
  { key: 'cylinders', label: 'Cylinders', optionsKey: 'cylinders', type: 'checkbox' },
  { key: 'rearPto', label: 'Rear PTO option', optionsKey: 'rearPto', type: 'checkbox' }
];

export function resultCountText(count) {
  return `${count} eligible machine${count === 1 ? '' : 's'}`;
}

// One filter group: labelled chips with live counts. Options that would return nothing are disabled unless already chosen.
export function filterGroup(key, label, values, type = 'checkbox', formatter = (value) => value, selected = [], counts = {}) {
  const selectedValues = (Array.isArray(selected) ? selected : [selected]).map(String);
  const anyOption = type === 'radio'
    ? `<label class="filter-option"><input type="radio" name="${escapeHtml(key)}" data-filter-key="${escapeHtml(key)}" data-focus-key="filter:${escapeHtml(key)}:any" value=""${selectedValues.filter(Boolean).length === 0 ? ' checked' : ''}><span class="chip"><span class="chip-label">Any</span></span></label>`
    : '';
  const chips = values.map((value) => {
    const text = String(value);
    const count = counts[text] ?? 0;
    const checked = selectedValues.includes(text);
    const disabled = count === 0 && !checked;
    return `<label class="filter-option${disabled ? ' is-empty' : ''}"><input type="${type}" name="${escapeHtml(key)}" data-filter-key="${escapeHtml(key)}" data-focus-key="filter:${escapeHtml(key)}:${escapeHtml(text)}" value="${escapeHtml(text)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span class="chip"><span class="chip-label">${escapeHtml(formatter(text))}</span><span class="chip-count" data-count>${count}</span></span></label>`;
  }).join('');
  return `<fieldset class="filter-group" data-group="${escapeHtml(key)}"><legend>${escapeHtml(label)}</legend><div class="filter-options">${anyOption}${chips}</div></fieldset>`;
}

export function filterGroupsMarkup(options, filters, counts) {
  return FILTER_GROUPS.map((group) => filterGroup(group.key, group.label, options[group.optionsKey] ?? [], group.type, group.formatter, filters[group.key], counts[group.key] ?? {})).join('');
}

export function activeFilterEntries(filters) {
  const entries = [];
  if (String(filters.search ?? '').trim()) entries.push({ key: 'search', value: String(filters.search).trim(), label: `Search: “${String(filters.search).trim()}”`, group: 'Search' });
  for (const group of FILTER_GROUPS) {
    const values = Array.isArray(filters[group.key]) ? filters[group.key] : [filters[group.key]];
    for (const value of values.filter(Boolean)) {
      entries.push({ key: group.key, value: String(value), label: group.formatter ? group.formatter(String(value)) : String(value), group: group.label });
    }
  }
  return entries;
}

export function activeFiltersMarkup(filters) {
  return activeFilterEntries(filters).map((entry) => `<li><button type="button" class="pill" data-action="remove-filter" data-filter-key="${escapeHtml(entry.key)}" data-value="${escapeHtml(entry.value)}" aria-label="Remove filter: ${escapeHtml(entry.group)} ${escapeHtml(entry.label)}"><span>${escapeHtml(entry.label)}</span>${icon('close', 'pill-icon')}</button></li>`).join('');
}

export function suggestionMeta(machine) {
  const parts = [];
  if (machine.model_year !== null && machine.model_year !== undefined && machine.model_year !== '') parts.push(String(machine.model_year));
  if (machine.market) parts.push(String(machine.market));
  if (typeof machine.max_hp === 'number' && Number.isFinite(machine.max_hp)) parts.push(`${machine.max_hp} hp`);
  return parts.join(' · ');
}

export function suggestionsMarkup(machines, activeIndex, total = machines.length) {
  return machines.map((machine, index) => `<li id="suggestion-${index}" role="option" class="suggestion" aria-selected="${index === activeIndex}" data-action="select-suggestion" data-machine-id="${escapeHtml(machine.machine_id)}"><span class="suggestion-name">${escapeHtml(machineName(machine))}</span><span class="suggestion-meta">${escapeHtml(suggestionMeta(machine))}</span></li>`).join('') + (total > machines.length ? `<li class="suggestion-more" role="presentation">Showing ${machines.length} of ${total}. Keep typing to narrow the list.</li>` : '');
}

export function onboardingMarkup() {
  return `<div class="onboarding" role="group" aria-labelledby="onboarding-title"><div class="onboarding-copy"><h3 id="onboarding-title">How it works</h3><ol class="onboarding-steps"><li><strong>Pick a machine.</strong> Search by brand or model, or narrow the list with filters.</li><li><strong>See what is in range.</strong> Machines with a similar Max HP appear in the next section.</li><li><strong>Compare up to four.</strong> Add machines, then review differences, copy, export or print.</li></ol></div><button type="button" class="btn btn-secondary" data-action="dismiss-onboarding">Got it</button></div>`;
}

export function discoveryMarkup(context) {
  const { options, counts, filters, inputValue, hasSelection, filtersOpen, onboardingVisible } = context;
  return `${onboardingVisible ? onboardingMarkup() : ''}<form id="discovery-form" class="discovery-form" role="search" novalidate>
      <div class="control primary-machine">
        <label for="search">Primary machine</label>
        <div class="combobox-wrap">
          <span class="field-icon">${icon('search')}</span>
          <input id="search" name="search" type="search" role="combobox" aria-autocomplete="list" aria-controls="machine-suggestions" aria-expanded="false" aria-describedby="search-hint search-note" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="Search by brand or model, for example 8R 340" value="${escapeHtml(inputValue)}" />
          <button type="button" id="clear-machine" class="combobox-clear" data-action="clear-machine" aria-label="Clear selected machine"${hasSelection ? '' : ' hidden'}>${icon('close')}</button>
          <ul id="machine-suggestions" class="suggestions" role="listbox" aria-label="Matching machines" hidden></ul>
        </div>
        <p id="search-hint" class="hint">Choose the machine to compare against. Filters below narrow which machines you can choose. Press <kbd>/</kbd> to jump here.</p>
        <p id="search-note" class="search-note" role="status"></p>
      </div>
      <details class="filter-panel" id="filter-panel"${filtersOpen ? ' open' : ''}>
        <summary><span class="filter-summary-label">${icon('filter')}<span>Filters</span></span><span class="filter-badge" id="filter-badge" hidden></span></summary>
        <div class="filter-groups" id="filter-groups">${filterGroupsMarkup(options, filters, counts)}</div>
      </details>
    </form>
    <div class="discovery-summary">
      <p id="result-count" role="status" class="result-count">${escapeHtml(resultCountText(context.eligibleCount))}</p>
      <ul id="active-filters" class="active-filters" aria-label="Active filters">${activeFiltersMarkup(filters)}</ul>
      <button id="reset-filters" type="button" class="btn btn-quiet" data-action="reset-filters"${activeFilterEntries(filters).length ? '' : ' hidden'}>${icon('reset')}<span>Reset Filters</span></button>
    </div>`;
}

export function filterBadgeText(activeCount) {
  return activeCount > 0 ? `${plural(activeCount, 'filter')} active` : '';
}

// Explains an empty search and, when a close match exists, offers it as a one-click correction.
export function searchNoteMarkup(search, correction) {
  const text = String(search ?? '').trim();
  if (!text) return '';
  const lead = `No machines match “${escapeHtml(text)}”.`;
  if (!correction) return `${lead} Check the spelling or reset the filters.`;
  return `${lead} Did you mean <button type="button" class="link-button" data-action="apply-correction" data-query="${escapeHtml(correction.query)}">${escapeHtml(correction.query)}</button> (${correction.count})?`;
}
