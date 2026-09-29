import { displaySchema, displaySections, formatDisplayValue } from './display-schema.js';
import { calculateDelta, deltaDirection, formatDelta } from './comparison.js';
import { machineModel, machineName, selectionLabel } from './filters.js';

export const MISSING_MARK = '—';

const SECTION_NOTES = {
  'Derived performance': 'Calculated from Max HP and unladen weight, and only when both are single published values. It is not a loaded, ballasted or operating measure.'
};

const POWER_TO_WEIGHT_UNAVAILABLE = 'Not calculated: needs Max HP and one published unladen weight value.';

export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function slotLetter(index) {
  return String.fromCharCode(65 + index);
}

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function unavailableNote(field, machine) {
  if (field.sourceType === 'derived' && machine.powerToWeightAvailable === false) return POWER_TO_WEIGHT_UNAVAILABLE;
  return null;
}

export function normalizeViewOptions(options = {}, machineCount = 0) {
  return {
    differencesOnly: options.differencesOnly === true && machineCount >= 2,
    showEmpty: options.showEmpty === true
  };
}

// Pure model behind the comparison table and the mobile spec list. Only published values are shown.
export function buildComparisonModel(machines, options = {}) {
  const view = normalizeViewOptions(options, machines.length);
  const baseline = machines[0];
  const priorityFields = displaySchema.filter((field) => field.priority);

  const cards = machines.map((machine, index) => ({
    id: machine.machine_id,
    letter: slotLetter(index),
    isBaseline: index === 0,
    label: selectionLabel(machine),
    name: machineName(machine),
    manufacturer: machine.manufacturer ?? '',
    model: machineModel(machine),
    year: machine.model_year ?? null,
    market: machine.market ?? null,
    highlights: priorityFields.map((field) => ({ key: field.key, label: field.label, unit: field.unit, text: formatDisplayValue(machine[field.propertyPath], field.unit, field.blankValue), missing: isBlank(machine[field.propertyPath]) }))
  }));

  let hiddenEmpty = 0;
  let hiddenSame = 0;
  let totalRows = 0;
  const sections = displaySections.map((sectionName) => {
    const fields = displaySchema.filter((field) => field.section === sectionName).sort((left, right) => left.order - right.order);
    const rows = fields.map((field) => {
      const cells = machines.map((machine, index) => {
        const raw = machine[field.propertyPath];
        const text = formatDisplayValue(raw, field.unit, field.blankValue);
        const missing = isBlank(raw);
        let delta = null;
        if (index > 0 && field.numericDeltaEligible) {
          const result = calculateDelta(field, baseline, machine);
          delta = { available: result.available, text: formatDelta(result, field.unit), direction: deltaDirection(result), value: result.value };
        }
        return { machineId: machine.machine_id, text, missing, delta, note: missing ? unavailableNote(field, machine) : null, differs: false };
      });
      const allMissing = cells.every((cell) => cell.missing);
      const allSame = cells.every((cell) => cell.text === cells[0].text);
      cells.forEach((cell, index) => { cell.differs = index > 0 && cell.text !== cells[0].text; });
      let hiddenReason = null;
      if (allMissing && !view.showEmpty) hiddenReason = 'empty';
      else if (view.differencesOnly && allSame) hiddenReason = 'same';
      if (hiddenReason === 'empty') hiddenEmpty += 1;
      if (hiddenReason === 'same') hiddenSame += 1;
      totalRows += 1;
      return { key: field.key, label: field.label, unit: field.unit, priority: field.priority === true, section: sectionName, cells, allMissing, allSame, hidden: hiddenReason !== null, hiddenReason };
    });
    const visibleRows = rows.filter((row) => !row.hidden);
    return { name: sectionName, id: slugify(sectionName), note: SECTION_NOTES[sectionName] ?? null, rows, visibleRows, hidden: visibleRows.length === 0 };
  });

  return {
    machines: cards,
    sections,
    options: view,
    totals: { rows: totalRows, visible: totalRows - hiddenEmpty - hiddenSame, hiddenEmpty, hiddenSame }
  };
}
