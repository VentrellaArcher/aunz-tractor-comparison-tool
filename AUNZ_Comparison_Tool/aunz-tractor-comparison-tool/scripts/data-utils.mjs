import { schema } from './schema.js';

const MISSING_VALUES = new Set(['', 'NA', 'N/A', 'No Data', '~']);

export function parseCsv(csvText) {
  const lines = csvText.replace(/\r\n/g, '\n').split('\n');
  const rows = [];
  let current = [];
  let value = '';
  let inQuotes = false;

  for (const line of lines) {
    if (line === '') {
      if (current.length || rows.length === 0) {
        current.push(value);
        rows.push(current);
        current = [];
        value = '';
      }
      continue;
    }

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        current.push(value);
        value = '';
      } else {
        value += char;
      }
    }

    if (inQuotes) {
      value += '\n';
    } else {
      current.push(value);
      rows.push(current);
      current = [];
      value = '';
    }
  }

  if (value !== '' || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  const cleanedRows = rows.filter((row) => row.length > 0 && row.some((cell) => cell !== ''));
  if (cleanedRows.length > 0 && cleanedRows[0].length > 0) {
    cleanedRows[0][0] = cleanedRows[0][0].replace(/^\uFEFF/, '');
  }
  return cleanedRows;
}

function normalizeString(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/^\uFEFF/, '').trim();
  if (cleaned === '') return null;
  if (MISSING_VALUES.has(cleaned)) return null;
  return cleaned;
}

function isMissing(value) {
  return value == null || (typeof value === 'string' && MISSING_VALUES.has(value.trim()));
}

function parseScalar(value) {
  if (isMissing(value)) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return null;
}

function parseBoolean(value) {
  if (isMissing(value)) return null;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'TRUE') return true;
  if (normalized === 'FALSE') return false;
  return null;
}

function parseList(value) {
  if (isMissing(value)) return null;
  return String(value)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function transformSourceRows(rawRows, header) {
  const fieldMap = new Map(schema.map((field) => [field.source, field]));
  const records = [];

  for (const row of rawRows) {
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      const key = header[i];
      const field = fieldMap.get(key);
      const raw = row[i] ?? '';
      if (!field) continue;
      const value = normalizeString(raw);
      if (field.type === 'boolean') {
        obj[field.output] = parseBoolean(value);
      } else if (field.type === 'number' || field.type === 'integer') {
        const parsed = parseScalar(value);
        obj[field.output] = parsed == null ? null : Number(parsed);
      } else if (field.type === 'list') {
        obj[field.output] = parseList(value);
      } else {
        obj[field.output] = value;
      }
    }

    if (obj.machine_id) {
      records.push(obj);
    }
  }

  return records;
}

export function calculatePowerToWeight(machine) {
  const maxHp = Number(machine.max_hp);
  const weightKg = Number(machine.unladen_weight_kg);
  const powerToWeightHpPerTonne = Number.isFinite(maxHp) && Number.isFinite(weightKg) && weightKg > 0 && maxHp > 0
    ? (maxHp / weightKg) * 1000
    : null;

  const powerToWeightKwPerTonne = powerToWeightHpPerTonne == null
    ? null
    : powerToWeightHpPerTonne * 0.745699872;

  return {
    powerToWeightHpPerTonne: powerToWeightHpPerTonne == null ? null : Number(powerToWeightHpPerTonne.toFixed(2)),
    powerToWeightKwPerTonne: powerToWeightKwPerTonne == null ? null : Number(powerToWeightKwPerTonne.toFixed(2)),
    powerBasis: 'maxHp',
    weightBasis: 'unladenWeightKg',
    powerToWeightAvailable: powerToWeightHpPerTonne != null,
    powerToWeightUnavailableReason: powerToWeightHpPerTonne == null ? 'unladen_weight_not_scalar' : null
  };
}

export function buildMachineDataset(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { publishedMachines: [], allMachines: [], manufacturers: [], modelYears: [], filterOptions: [], buildInfo: {} };
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const allMachines = transformSourceRows(dataRows, header).map((machine) => ({ ...machine, ...calculatePowerToWeight(machine) }));
  const publishedMachines = allMachines.filter((machine) => machine.published === true);

  const manufacturers = [...new Set(publishedMachines.map((machine) => machine.manufacturer).filter(Boolean))].sort();
  const modelYears = [...new Set(publishedMachines.map((machine) => machine.model_year).filter((year) => Number.isFinite(Number(year)) && Number(year) > 0))].sort((a, b) => Number(b) - Number(a));
  const filterOptions = {
    manufacturers,
    modelYears,
    transmission: [...new Set(publishedMachines.flatMap((machine) => Array.isArray(machine.transmission_filter_tags) ? machine.transmission_filter_tags : []))].sort()
  };

  return {
    allMachines,
    publishedMachines,
    manufacturers,
    modelYears,
    filterOptions,
    buildInfo: {
      buildDate: new Date().toISOString(),
      sourceRowCount: dataRows.length,
      publishedRecordCount: publishedMachines.length,
      powerToWeightAvailableCount: publishedMachines.filter((machine) => machine.powerToWeightAvailable).length,
      version: 'local-build'
    }
  };
}
