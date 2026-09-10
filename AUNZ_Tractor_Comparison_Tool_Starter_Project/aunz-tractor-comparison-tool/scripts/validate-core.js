import { expectedHeaders, fieldDefinitions } from './schema.js';
import { cleanText, scalarNumber } from './csv-utils.js';
export function validateData(headers, records, rowNumbers) {
  const errors = [], warnings = [];
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  const extraHeaders = headers.filter(h => !expectedHeaders.includes(h));
  if (missingHeaders.length) errors.push({ row: 1, code: 'missing_headers', message: missingHeaders.join(', ') });
  if (extraHeaders.length) errors.push({ row: 1, code: 'unexpected_headers', message: extraHeaders.join(', ') });
  const ids = new Map(), identities = new Map();
  records.forEach((record, index) => {
    const row = rowNumbers[index];
    for (const [name, def] of Object.entries(fieldDefinitions)) if (def.required && cleanText(record[name]) === null) errors.push({ row, machineId: record.machine_id, code: 'required', field: name, message: `${name} is required` });
    const id = cleanText(record.machine_id);
    if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push({ row, machineId: id, code: 'invalid_id', message: 'machine_id must use lowercase letters, numbers and hyphens' });
    if (id) { if (ids.has(id)) errors.push({ row, machineId: id, code: 'duplicate_id', message: `Duplicate of row ${ids.get(id)}` }); else ids.set(id, row); }
    const pub = cleanText(record.published); if (pub && !['TRUE','FALSE'].includes(pub.toUpperCase())) errors.push({ row, machineId: id, code: 'invalid_published', message: 'published must be TRUE or FALSE' });
    const market = cleanText(record.market); if (market && !fieldDefinitions.market.values.includes(market)) errors.push({ row, machineId: id, code: 'invalid_market', message: `Unsupported market ${market}` });
    const year = scalarNumber(record.model_year); if (!Number.isInteger(year) || year < 1900 || year > 2100) errors.push({ row, machineId: id, code: 'invalid_model_year', message: 'model_year must be a four-digit year' });
    const identity = [record.manufacturer, record.machine, record.model_year, record.market].map(v => cleanText(v)?.toLowerCase()).join('|');
    if (identity && identities.has(identity)) errors.push({ row, machineId: id, code: 'duplicate_identity', message: `Duplicate machine identity from row ${identities.get(identity)}` }); else identities.set(identity, row);
    if (cleanText(record.image_filename) && !cleanText(record.image_alt_text)) errors.push({ row, machineId: id, code: 'missing_alt_text', message: 'image_alt_text is required when image_filename is provided' });
    if (!cleanText(record.source_url)) warnings.push({ row, machineId: id, code: 'missing_source_url', message: 'source_url is blank' });
  });
  return { errors, warnings, summary: { rows: records.length, errors: errors.length, warnings: warnings.length } };
}
