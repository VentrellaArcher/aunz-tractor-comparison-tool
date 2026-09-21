import { displaySchema, displaySections, formatDisplayValue } from './display-schema.js';
import { calculateDelta, formatDelta, resolveComparisonMachines } from './comparison.js';

export const OUTPUT_TITLE = 'AU/NZ Tractor Comparison Tool';
export const MISSING_VALUE = '—';

export function createOutputModel(state, machines, buildInfo = {}) {
  const comparedMachines = resolveComparisonMachines(state, machines);
  if (comparedMachines.length === 0) return { available: false, reason: 'comparison_empty' };
  const baseline = comparedMachines[0];
  const fields = displaySections.flatMap((section) => displaySchema
    .filter((field) => field.section === section)
    .sort((left, right) => left.order - right.order)
    .map((field) => ({
      section,
      key: field.key,
      label: field.label,
      unit: field.unit,
      priority: field.priority,
      values: comparedMachines.map((machine) => formatDisplayValue(machine[field.propertyPath], field.unit, field.blankValue)),
      deltas: comparedMachines.slice(1).map((machine) => formatDelta(calculateDelta(field, baseline, machine), field.unit))
    })));
  return {
    available: true,
    title: OUTPUT_TITLE,
    outputType: 'comparison',
    buildInfo: { buildDate: buildInfo.buildDate ?? null, version: buildInfo.version ?? null },
    comparedMachineCount: comparedMachines.length,
    baselineMachineId: baseline.machine_id,
    machines: comparedMachines.map((machine, index) => ({
      machineId: machine.machine_id,
      manufacturer: machine.manufacturer,
      machine: machine.machine,
      modelYear: machine.model_year,
      market: machine.market,
      baseline: index === 0
    })),
    sections: displaySections.map((section) => ({ section, fields: fields.filter((field) => field.section === section) }))
  };
}

export function outputAvailability(state, machines) {
  return { available: resolveComparisonMachines(state, machines).length > 0, reason: resolveComparisonMachines(state, machines).length > 0 ? null : 'comparison_empty' };
}

export function createPlainText(model) {
  if (!model.available) return '';
  const lines = [model.title, `Compared machines: ${model.comparedMachineCount}`, ''];
  for (const machine of model.machines) {
    lines.push(`${machine.baseline ? 'Machine A (baseline)' : 'Compared machine'}: ${machine.manufacturer} ${machine.machine} (${machine.modelYear}), market ${machine.market ?? MISSING_VALUE}, ID ${machine.machineId}`);
  }
  lines.push('');
  for (const section of model.sections) {
    lines.push(`[${section.section}]`);
    for (const field of section.fields) {
      lines.push(`${field.label}: ${field.values.map((value, index) => `Machine ${String.fromCharCode(65 + index)} = ${value}`).join('; ')}${field.deltas.map((delta, index) => `; Delta ${String.fromCharCode(66 + index)} - A = ${delta}`).join('')}`);
    }
    lines.push('');
  }
  if (model.buildInfo.buildDate) lines.push(`Build date: ${model.buildInfo.buildDate}`);
  if (model.buildInfo.version) lines.push(`Build version: ${model.buildInfo.version}`);
  return lines.join('\n').trim();
}

function protectCsvText(value) {
  const text = String(value ?? '');
  if (/^\s*[=+@]/.test(text)) return `'${text}`;
  if (/^\s*-/.test(text) && !/^\s*-?\d+(?:\.\d+)?(?:\s+.*)?$/.test(text)) return `'${text}`;
  return text;
}

export function escapeCsvCell(value) {
  const text = protectCsvText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createCsvText(model) {
  if (!model.available) return '';
  const headings = model.machines.map((machine, index) => `Machine ${String.fromCharCode(65 + index)}${machine.baseline ? ' (baseline)' : ''}: ${machine.manufacturer} ${machine.machine} (${machine.modelYear})`);
  const header = ['Section', 'Specification', 'Unit', ...headings, ...model.machines.slice(1).map((_, index) => `Delta ${String.fromCharCode(66 + index)} - A`)].map(escapeCsvCell);
  const rows = [header];
  for (const section of model.sections) {
    for (const field of section.fields) {
      rows.push([section.section, field.label, field.unit ?? '', ...field.values, ...field.deltas].map(escapeCsvCell));
    }
  }
  return rows.map((row) => row.join(',')).join('\r\n') + '\r\n';
}

export function createSafeFilename(date = new Date()) {
  const iso = new Date(date).toISOString().slice(0, 10);
  return `aunz-tractor-comparison-${iso}.csv`;
}

export async function copyComparison(model, clipboard = globalThis.navigator?.clipboard) {
  if (!model.available) return { ok: false, message: 'Copy unavailable: no machines are compared.' };
  try {
    if (!clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
    await clipboard.writeText(createPlainText(model));
    return { ok: true, message: 'Comparison copied successfully.' };
  } catch {
    return { ok: false, message: 'Copy failed. Check clipboard permissions and try again.' };
  }
}

export function downloadCsv(model, browser = globalThis) {
  if (!model.available) return { ok: false, message: 'CSV export unavailable: no machines are compared.' };
  try {
    const blob = new browser.Blob([`\uFEFF${createCsvText(model)}`], { type: 'text/csv;charset=utf-8' });
    const url = browser.URL.createObjectURL(blob);
    const anchor = browser.document.createElement('a');
    anchor.href = url;
    anchor.download = createSafeFilename();
    anchor.click();
    browser.URL.revokeObjectURL(url);
    return { ok: true, message: 'CSV export started.' };
  } catch {
    return { ok: false, message: 'CSV export failed. Try again.' };
  }
}

export function printComparison(model, printBoundary = () => globalThis.print?.()) {
  if (!model.available) return { ok: false, message: 'Print unavailable: no machines are compared.' };
  try {
    printBoundary();
    return { ok: true, message: 'Print dialog initiated.' };
  } catch {
    return { ok: false, message: 'Print failed. Try again.' };
  }
}
