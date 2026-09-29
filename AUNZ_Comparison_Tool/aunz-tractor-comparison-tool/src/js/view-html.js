const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v5h5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  columns: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  'arrow-up': '<path d="M12 6 5 18h14z" fill="currentColor" stroke="none"/>',
  'arrow-down': '<path d="M12 18 5 6h14z" fill="currentColor" stroke="none"/>',
  equal: '<path d="M6 9h12M6 15h12"/>'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

export function icon(name, className = '') {
  return `<svg class="icon${className ? ` ${className}` : ''}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] ?? ''}</svg>`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function slotBadge(letter, isBaseline = false) {
  return `<span class="slot-badge${isBaseline ? ' is-baseline' : ''}" aria-hidden="true">${escapeHtml(letter)}</span>`;
}

// Direction is shown with a shape and words, never with a good/bad colour: a higher value is not a better one.
const DELTA_GLYPHS = { 'delta-positive': '▲', 'delta-negative': '▼', 'delta-neutral': '=' };

export function deltaMarkup(delta) {
  if (!delta) return '';
  if (!delta.available) return '<span class="delta delta-neutral delta-unavailable"><span aria-hidden="true">Δ —</span><span class="visually-hidden">Difference unavailable</span></span>';
  return `<span class="delta ${escapeHtml(delta.direction)}"><span class="delta-glyph" aria-hidden="true">${DELTA_GLYPHS[delta.direction] ?? DELTA_GLYPHS['delta-neutral']}</span><span class="visually-hidden">Difference from baseline: </span><span class="delta-text">${escapeHtml(delta.text)}</span></span>`;
}

// A missing value keeps the same dash everywhere and says what it means to assistive technology.
export function valueMarkup(text, missing) {
  if (!missing) return `<span class="value">${escapeHtml(text)}</span>`;
  return `<span class="value is-missing"><span aria-hidden="true">${escapeHtml(text)}</span><span class="visually-hidden">No published value</span></span>`;
}

// Used where a dash means "not applicable" (for example the selected machine's own difference), not "unpublished".
export function notApplicableMarkup(text) {
  return `<span class="value is-missing"><span aria-hidden="true">—</span><span class="visually-hidden">${escapeHtml(text)}</span></span>`;
}
