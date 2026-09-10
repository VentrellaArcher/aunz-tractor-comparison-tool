import fs from 'node:fs';

export function parseCsvText(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
}

export function readCsv(path) {
  const rows = parseCsvText(fs.readFileSync(path, 'utf8'));
  const headers = rows.shift().map(v => v.trim());
  return { headers, records: rows.map((values, index) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))), rowNumbers: rows.map((_, i) => i + 2) };
}

const missing = new Set(['', 'na', 'n/a', 'no data', '~']);
export function cleanText(value) {
  const text = String(value ?? '').replace(/\u00a0/g, ' ').replace(/\u200b/g, '').trim();
  return missing.has(text.toLowerCase()) ? null : text;
}
export function scalarNumber(value) {
  const text = cleanText(value);
  if (text === null || !/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
export function transformValue(value, definition) {
  const text = cleanText(value);
  if (text === null) return null;
  switch (definition.type) {
    case 'boolean': return text.toUpperCase() === 'TRUE';
    case 'integer': { const n = scalarNumber(text); return n === null ? null : Math.trunc(n); }
    case 'number': return scalarNumber(text);
    case 'list': return [...new Set(text.split('|').map(v => v.trim()).filter(Boolean))];
    case 'flex': { const n = scalarNumber(text); return n === null ? text : n; }
    default: return text;
  }
}
