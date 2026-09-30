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

function foldText(value) {
  return value == null ? '' : String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function searchTokens(value) {
  return foldText(value).split(/[^a-z0-9]+/).filter(Boolean);
}

// "MY25", "MY 25" and "MY2025" name a model year. A bare two-digit number is left alone because it may be part of a model name.
const MODEL_YEAR_NOTATION = /\bmy[\s'\u2019.-]*(\d{4}|\d{2})\b/g;
const MODEL_YEAR_IN_PROGRESS = /\bmy[\s'\u2019.-]*\d{0,3}$/;

function splitModelYears(query) {
  const years = [];
  const notation = [];
  const rest = query
    .replace(MODEL_YEAR_NOTATION, (match, digits) => {
      years.push(digits.length === 2 ? 2000 + Number(digits) : Number(digits));
      notation.push(match);
      return ' ';
    })
    .replace(MODEL_YEAR_IN_PROGRESS, ' ') // "my" or "my2" while the year is still being typed
    .replace(/\s+/g, ' ')
    .trim();
  return { years, notation: notation.join(' '), rest };
}

// Contiguous substring on name/brand (original behaviour), plus typeahead tokens (whole words, the last one a
// prefix) and spacing-insensitive matching, so "8r 3", "t8 410" and "8r340" all find the intended machine.
function machineMatchesSearch(machine, search) {
  const { years, rest: query } = splitModelYears(normalized(search));
  if (years.length > 0 && !years.includes(Number(machine.model_year))) return false;
  if (!query) return true;
  if ([machine.machine, machine.manufacturer].some((value) => normalized(value).includes(query))) return true;
  const queryTokens = searchTokens(query);
  if (queryTokens.length === 0) return false;
  const words = searchTokens(`${machine.manufacturer ?? ''} ${machine.machine ?? ''} ${machine.model_year ?? ''}`);
  const lastIndex = queryTokens.length - 1;
  const typeahead = queryTokens.every((token, index) => words.some((word) => (index === lastIndex ? word.startsWith(token) : word === token)));
  return typeahead || words.join('').includes(queryTokens.join(''));
}

export function searchMachines(machines, search) {
  if (!normalized(search)) return [...machines];
  return machines.filter((machine) => machineMatchesSearch(machine, search));
}

export function filterMachines(machines, filters = DEFAULT_FILTERS) {
  const active = { ...DEFAULT_FILTERS, ...filters };
  return machines.filter((machine) => {
    return machineMatchesSearch(machine, active.search)
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

function tally(values) {
  const counts = {};
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const key = String(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// For each group: how many machines would be eligible per option, given every other active filter.
export function getFacetCounts(machines, filters = DEFAULT_FILTERS) {
  const active = { ...DEFAULT_FILTERS, ...filters };
  const scopedTo = (key, emptyValue) => filterMachines(machines, { ...active, [key]: emptyValue });
  const speedScope = scopedTo('topSpeed', '');
  return {
    manufacturer: tally(scopedTo('manufacturer', []).map((machine) => machine.manufacturer)),
    modelYear: tally(scopedTo('modelYear', []).map((machine) => machine.model_year)),
    transmission: tally(scopedTo('transmission', []).flatMap((machine) => [...new Set(machine.transmission_filter_tags ?? [])])),
    topSpeed: Object.fromEntries(TOP_SPEED_THRESHOLDS.map((threshold) => [String(threshold), speedScope.filter((machine) => {
      const speed = topSpeedValue(machine);
      return speed !== null && speed >= threshold;
    }).length])),
    cylinders: tally(scopedTo('cylinders', []).map((machine) => machine.cylinders_filter ?? machine.number_of_cylinders)),
    rearPto: tally(scopedTo('rearPto', []).flatMap((machine) => [...new Set(machine.rear_pto_filter_tags ?? [])]))
  };
}

export function resetFilters() {
  return Object.fromEntries(Object.entries(DEFAULT_FILTERS).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}

// One collator for every comparison: localeCompare builds a new one each call, which dominates sorting on large catalogues.
const selectionCollator = new Intl.Collator(undefined, { numeric: true });

// Manufacturer, name, model year, then ID, so near-identical records always sort the same way.
export function getSelectionOptions(machines) {
  return machines
    .map((machine) => ({ machine, key: `${machine.manufacturer} ${machine.machine} ${machine.model_year} ${machine.machine_id}` }))
    .sort((left, right) => selectionCollator.compare(left.key, right.key))
    .map((entry) => entry.machine);
}

export function resolveSelectedMachine(machines, machineId) {
  if (!machineId) return null;
  return machines.find((machine) => machine.machine_id === machineId) ?? null;
}

// Names that start with, then contain, the typed text come first; input order is otherwise preserved.
export function rankBySearch(machines, search) {
  const query = splitModelYears(normalized(search)).rest;
  if (!query) return [...machines];
  const rankOf = (machine) => {
    const name = normalized(machineName(machine));
    if (name.startsWith(query)) return 0;
    return name.includes(query) ? 1 : 2;
  };
  return machines
    .map((machine, index) => ({ machine, index, rank: rankOf(machine) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.machine);
}

// Source names usually repeat the brand ("John Deere 8R 340"); avoid printing it twice.
export function machineName(machine) {
  if (!machine) return '';
  const name = String(machine.machine ?? '').trim();
  const maker = String(machine.manufacturer ?? '').trim();
  if (!maker) return name;
  if (!name) return maker;
  const lowerName = name.toLowerCase();
  const lowerMaker = maker.toLowerCase();
  return lowerName === lowerMaker || lowerName.startsWith(`${lowerMaker} `) ? name : `${maker} ${name}`;
}

// Model portion only, for compact spaces where the brand is shown separately.
export function machineModel(machine) {
  if (!machine) return '';
  const name = String(machine.machine ?? '').trim();
  const maker = String(machine.manufacturer ?? '').trim();
  if (maker && name.toLowerCase().startsWith(`${maker.toLowerCase()} `)) return name.slice(maker.length).trim();
  return name;
}

// Annotated machines (see identity.js) carry a label that stays unique when a name is shared across years or markets.
export function selectionLabel(machine) {
  if (!machine) return '';
  if (machine.identityLabel) return machine.identityLabel;
  const year = machine.model_year;
  return year === null || year === undefined || year === '' ? machineName(machine) : `${machineName(machine)} (${year})`;
}

function editDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}

function correctionLimit(token) {
  if (token.length <= 3) return 0;
  return token.length <= 5 ? 1 : 2;
}

function buildVocabulary(machines) {
  const vocabulary = new Map();
  for (const machine of machines) {
    const words = `${machine.manufacturer ?? ''} ${machine.machine ?? ''} ${machine.model_year ?? ''}`.split(/[^A-Za-z0-9]+/).filter(Boolean);
    for (const word of words) {
      const key = foldText(word);
      const entry = vocabulary.get(key) ?? { display: word, count: 0 };
      entry.count += 1;
      vocabulary.set(key, entry);
    }
  }
  return vocabulary;
}

// Offers a "did you mean" query when a search finds nothing; the caller decides whether to apply it.
export function suggestSearchCorrection(machines, search) {
  const query = normalized(search);
  if (!query || searchMachines(machines, query).length > 0) return null;
  const { rest, notation } = splitModelYears(query);
  const tokens = searchTokens(rest);
  if (tokens.length === 0) return null;
  const vocabulary = buildVocabulary(machines);
  const corrected = [];
  for (const token of tokens) {
    if ([...vocabulary.keys()].some((known) => known.includes(token))) {
      corrected.push(token);
      continue;
    }
    const limit = correctionLimit(token);
    let best = null;
    for (const [known, entry] of vocabulary) {
      const distance = editDistance(token, known, limit);
      if (distance > limit) continue;
      if (!best || distance < best.distance || (distance === best.distance && entry.count > best.count)) best = { distance, count: entry.count, display: entry.display };
    }
    if (!best) return null;
    corrected.push(best.display);
  }
  const candidate = [corrected.join(' '), notation].filter(Boolean).join(' ');
  if (foldText(corrected.join(' ')) === tokens.join(' ')) return null;
  const count = searchMachines(machines, candidate).length;
  return count > 0 ? { query: candidate, count } : null;
}
