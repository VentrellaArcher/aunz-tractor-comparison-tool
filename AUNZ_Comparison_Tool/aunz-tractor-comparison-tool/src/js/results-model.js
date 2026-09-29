import { formatDisplayValue } from './display-schema.js';
import { deltaDirection, formatDelta } from './comparison.js';
import { machineName } from './filters.js';

export const MISSING_MARK = '—';

// Full relationship column contract. `essential` columns form the focused default view.
export const RESULT_COLUMNS = [
  { key: 'machine', label: 'Machine', unit: null, essential: true },
  { key: 'deltaMaxHp', label: 'Δ Max HP', unit: 'hp', essential: true },
  { key: 'deltaMaxHpPercent', label: 'Δ Max HP %', unit: null, essential: true },
  { key: 'powerToWeightHpPerTonne', label: 'Power to Weight', unit: 'hp/t', essential: true },
  { key: 'manufacturer', label: 'Manufacturer', unit: null, essential: false },
  { key: 'model_year', label: 'Model Year', unit: null, essential: false },
  { key: 'rated_hp', label: 'Rated HP', unit: 'hp', essential: false },
  { key: 'max_hp', label: 'Max HP', unit: 'hp', essential: true, priority: true },
  { key: 'max_hp_with_ipm', label: 'Max HP (With IPM)', unit: 'hp', essential: false },
  { key: 'max_torque_nm', label: 'Max Torque', unit: 'Nm', essential: true, priority: true },
  { key: 'transmission', label: 'Transmission', unit: null, essential: true },
  { key: 'top_speed_kmh', label: 'Top Speed (km/h)', unit: 'km/h', essential: true, priority: true },
  { key: 'wheelbase_mm', label: 'Wheelbase (mm)', unit: 'mm', essential: false },
  { key: 'unladen_weight_kg', label: 'Unladen weight', unit: 'kg', essential: true },
  { key: 'max_permissible_weight_40_kmh_kg', label: 'Max permissible weight @ 40 km/h', unit: 'kg', essential: true, priority: true },
  { key: 'max_permissible_weight_50_kmh_kg', label: 'Max permissible weight @ 50 km/h', unit: 'kg', essential: false },
  { key: 'max_permissible_weight_60_kmh_kg', label: 'Max permissible weight @ 60 km/h', unit: 'kg', essential: false },
  { key: 'rated_hydraulic_flow_lpm', label: 'Rated hydraulic pump flow', unit: 'L/min', essential: false },
  { key: 'max_hydraulic_flow_lpm', label: 'Max hydraulic pump flow', unit: 'L/min', essential: false },
  { key: 'max_scvs', label: 'Max SCVs', unit: null, essential: false },
  { key: 'rear_hitch_capacity_kg', label: 'Rear hitch lift capacity', unit: 'kg', essential: false },
  { key: 'front_hitch_capacity_kg', label: 'Front hitch lift capacity', unit: 'kg', essential: false },
  { key: 'engine_capacity_l', label: 'Engine Capacity (L)', unit: 'L', essential: false },
  { key: 'number_of_cylinders', label: 'No. of cylinders', unit: null, essential: false },
  { key: 'engine_manufacturer', label: 'Engine manufacturer', unit: null, essential: false },
  { key: 'cab_suspension', label: 'Cab suspension', unit: null, essential: false },
  { key: 'fuel_capacity_l', label: 'Fuel capacity', unit: 'L', essential: false },
  { key: 'engine_stage_tier', label: 'Engine stage / tier', unit: null, essential: false },
  { key: 'adblue_tank_l', label: 'AdBlue tank', unit: 'L', essential: false },
  { key: 'rear_pto_option', label: 'Rear PTO option', unit: null, essential: false }
];

export const RESULT_COLUMN_MODES = ['key', 'all'];

export function columnsForMode(mode) {
  return mode === 'all' ? RESULT_COLUMNS : RESULT_COLUMNS.filter((column) => column.essential);
}

// Compact card content on narrow screens: label and unit come from the column contract.
export const CARD_HIGHLIGHT_KEYS = ['max_hp', 'max_torque_nm', 'powerToWeightHpPerTonne', 'top_speed_kmh', 'unladen_weight_kg', 'max_permissible_weight_40_kmh_kg'];

export const RESULT_SORTS = [
  { key: 'closest', label: 'Closest Max HP first' },
  { key: 'max_hp-desc', label: 'Max HP, high to low', field: 'max_hp', direction: 'desc' },
  { key: 'max_hp-asc', label: 'Max HP, low to high', field: 'max_hp', direction: 'asc' },
  { key: 'max_torque_nm-desc', label: 'Max Torque, high to low', field: 'max_torque_nm', direction: 'desc' },
  { key: 'powerToWeightHpPerTonne-desc', label: 'Power to weight, high to low', field: 'powerToWeightHpPerTonne', direction: 'desc' },
  { key: 'top_speed_kmh-desc', label: 'Top Speed, high to low', field: 'top_speed_kmh', direction: 'desc' },
  { key: 'unladen_weight_kg-asc', label: 'Unladen weight, low to high', field: 'unladen_weight_kg', direction: 'asc' },
  { key: 'model_year-desc', label: 'Model year, newest first', field: 'model_year', direction: 'desc' },
  { key: 'name-asc', label: 'Machine name, A to Z' }
];

export function isKnownSort(key) {
  return RESULT_SORTS.some((sort) => sort.key === key);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Adds signed differences to the rows produced by findRelationshipResults; the selected row has none.
export function buildResultRows(relationship, selectedMachine) {
  if (!relationship?.available) return [];
  const selectedMaxHp = finiteNumber(selectedMachine?.max_hp);
  return relationship.rows.map((row) => {
    const delta = row.isSelected || selectedMaxHp === null || row.maxHp === null ? null : row.maxHp - selectedMaxHp;
    return { ...row, deltaMaxHp: delta, deltaMaxHpPercent: delta === null ? null : (delta / selectedMaxHp) * 100 };
  });
}

export function sortResultRows(rows, sortKey) {
  const sort = RESULT_SORTS.find((candidate) => candidate.key === sortKey);
  if (!sort || sort.key === 'closest') return [...rows];
  const pinned = rows.filter((row) => row.isSelected);
  const rest = rows.filter((row) => !row.isSelected).map((row, index) => ({ row, index }));
  rest.sort((left, right) => {
    if (sort.field) {
      const leftValue = finiteNumber(left.row.machine[sort.field]);
      const rightValue = finiteNumber(right.row.machine[sort.field]);
      if (leftValue === null && rightValue !== null) return 1;
      if (leftValue !== null && rightValue === null) return -1;
      if (leftValue !== null && rightValue !== null && leftValue !== rightValue) return sort.direction === 'desc' ? rightValue - leftValue : leftValue - rightValue;
    } else {
      const byName = machineName(left.row.machine).localeCompare(machineName(right.row.machine), undefined, { numeric: true, sensitivity: 'base' });
      if (byName !== 0) return byName;
    }
    return left.index - right.index;
  });
  return [...pinned, ...rest.map((entry) => entry.row)];
}

// View-level narrowing only: the selected machine stays pinned and the Max HP band itself is unchanged.
export function filterResultRows(rows, brands = []) {
  const wanted = brands.map((brand) => String(brand).trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return [...rows];
  return rows.filter((row) => row.isSelected || wanted.includes(String(row.machine.manufacturer ?? '').trim().toLowerCase()));
}

export function summariseBrands(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.isSelected) continue;
    const brand = String(row.machine.manufacturer ?? '').trim();
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function formatPercentDelta(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}%`;
}

export function resultCell(row, column) {
  if (column.key === 'machine') return { text: machineName(row.machine), missing: false, direction: null };
  if (column.key === 'deltaMaxHp') {
    if (row.deltaMaxHp === null) return { text: MISSING_MARK, missing: true, direction: 'delta-neutral' };
    const delta = { available: true, value: row.deltaMaxHp };
    return { text: formatDelta(delta, column.unit), missing: false, direction: deltaDirection(delta) };
  }
  if (column.key === 'deltaMaxHpPercent') {
    if (row.deltaMaxHpPercent === null) return { text: MISSING_MARK, missing: true, direction: 'delta-neutral' };
    return { text: formatPercentDelta(row.deltaMaxHpPercent), missing: false, direction: deltaDirection({ available: true, value: row.deltaMaxHpPercent }) };
  }
  const raw = row.machine[column.key];
  const missing = raw === null || raw === undefined || raw === '';
  return { text: formatDisplayValue(raw, column.unit, MISSING_MARK), missing, direction: null };
}
