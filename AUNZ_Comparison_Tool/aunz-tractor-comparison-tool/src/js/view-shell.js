import { escapeHtml, icon } from './view-html.js';

export function formatBuildDate(value, options = {}) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', ...options }).format(date);
}

export function yearRange(years) {
  const usable = years.map(Number).filter((year) => Number.isFinite(year) && year > 0);
  if (usable.length === 0) return 'Not available';
  const low = Math.min(...usable);
  const high = Math.max(...usable);
  return low === high ? String(low) : `${low}–${high}`;
}

export function catalogueSummaryMarkup(facts) {
  const items = [
    ['Published machines', String(facts.machineCount)],
    ['Manufacturers', String(facts.manufacturerCount)],
    ['Model years', yearRange(facts.years)],
    ['Data updated', facts.buildDate ?? 'Not available']
  ];
  return `<dl class="facts">${items.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}

export function toastMarkup(message, actionLabel) {
  return `<div class="toast"><span class="toast-message">${escapeHtml(message)}</span>${actionLabel ? `<button type="button" class="toast-action" data-action="toast-action">${escapeHtml(actionLabel)}</button>` : ''}<button type="button" class="toast-close" data-action="toast-close" aria-label="Dismiss message">${icon('close')}</button></div>`;
}
