export const DEFAULT_FILTERS = Object.freeze({
  search: '',
  manufacturer: [],
  modelYear: [],
  transmission: [],
  topSpeed: '',
  cylinders: [],
  rearPto: []
});

export const TOP_SPEED_THRESHOLDS = [30, 40, 50, 60, 70];

function normalized(value) {
  return value == null ? '' : String(value).trim().toLowerCase();
}

function matchesScalar(value, selected) {
  const selections = Array.isArray(selected) ? selected : [selected];
  return !selections.filter(Boolean).length || selections.some((item) => normalized(value) === normalized(item));
}

function matchesList(values, selected) {
  const selections = Array.isArray(selected) ? selected.filter(Boolean) : [selected].filter(Boolean);
  return !selections.length || (Array.isArray(values) && selections.some((selectedValue) => values.some((value) => normalized(value) === normalized(selectedValue))));
}

function cleanScalarNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^\s*\d+(?:\.\d+)?\s*$/.test(value)) return null;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

function topSpeedValue(machine) {
  return cleanScalarNumber(machine?.top_speed_kmh);
}

export function searchMachines(machines, search) {
  const query = normalized(search);
  if (!query) return [...machines];
  return machines.filter((machine) => [machine.machine, machine.manufacturer].some((value) => normalized(value).includes(query)));
}

export function filterMachines(machines, filters = DEFAULT_FILTERS) {
  const active = { ...DEFAULT_FILTERS, ...filters };
  return machines.filter((machine) => {
    const matchesSearch = !normalized(active.search) || [machine.machine, machine.manufacturer].some((value) => normalized(value).includes(normalized(active.search)));
    return matchesSearch
      && matchesScalar(machine.manufacturer, active.manufacturer)
      && matchesScalar(machine.model_year, active.modelYear)
      && matchesList(machine.transmission_filter_tags, active.transmission)
      && (!active.topSpeed || (topSpeedValue(machine) !== null && topSpeedValue(machine) >= Number(active.topSpeed)))
      && matchesScalar(machine.cylinders_filter ?? machine.number_of_cylinders, active.cylinders)
      && matchesList(machine.rear_pto_filter_tags, active.rearPto);
  });
}

function sortedUnique(values, numericDescending = false) {
  const unique = [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '').map((value) => String(value)))];
  return unique.sort((left, right) => numericDescending ? Number(right) - Number(left) || left.localeCompare(right) : left.localeCompare(right, undefined, { numeric: true }));
}

export function getFilterOptions(machines) {
  return {
    manufacturers: sortedUnique(machines.map((machine) => machine.manufacturer)),
    modelYears: sortedUnique(machines.map((machine) => machine.model_year), true),
    transmission: sortedUnique(machines.flatMap((machine) => machine.transmission_filter_tags ?? [])),
    topSpeed: TOP_SPEED_THRESHOLDS.map((value) => String(value)),
    cylinders: sortedUnique(machines.map((machine) => machine.cylinders_filter ?? machine.number_of_cylinders), true),
    rearPto: sortedUnique(machines.flatMap((machine) => machine.rear_pto_filter_tags ?? [])),
  };
}

export function resetFilters() {
  return { ...DEFAULT_FILTERS };
}

export function getSelectionOptions(machines) {
  return [...machines].sort((left, right) => `${left.manufacturer} ${left.machine} ${left.model_year} ${left.machine_id}`.localeCompare(`${right.manufacturer} ${right.machine} ${right.model_year} ${right.machine_id}`, undefined, { numeric: true }));
}

export function resolveSelectedMachine(machines, machineId) {
  if (!machineId) return null;
  return machines.find((machine) => machine.machine_id === machineId) ?? null;
}

export function selectionLabel(machine) {
  return machine ? `${machine.manufacturer} ${machine.machine} (${machine.model_year})` : '';
}
