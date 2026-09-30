import { machineName } from './filters.js';

const clean = (value) => (value === null || value === undefined ? '' : String(value).trim());

// Adds display-only identity text to a copy of each record; published values are never changed.
// A name that appears once keeps its plain label. A shared name gains its model year, and its market as
// well when two records of that name share a year, so no two machines in the catalogue read the same.
// identityDetail is the short form for tight spaces ("2027" or "2025 · NZ"); it is empty for unique names.
export function annotateIdentity(machines) {
  const groups = new Map();
  for (const machine of machines) {
    const key = machineName(machine).toLowerCase();
    const group = groups.get(key);
    if (group) group.push(machine);
    else groups.set(key, [machine]);
  }

  const notes = new Map();
  for (const group of groups.values()) {
    if (group.length === 1) continue;
    const yearsAreDistinct = new Set(group.map((machine) => clean(machine.model_year))).size === group.length;
    const parts = group.map((machine) => [clean(machine.model_year), yearsAreDistinct ? '' : clean(machine.market)].filter(Boolean));
    // Records that still read the same (only possible with malformed data) fall back to their permanent ID.
    const repeats = new Map();
    for (const entry of parts) repeats.set(entry.join('|'), (repeats.get(entry.join('|')) ?? 0) + 1);
    group.forEach((machine, index) => {
      const shown = repeats.get(parts[index].join('|')) > 1 ? [...parts[index], machine.machine_id] : parts[index];
      notes.set(machine, {
        identityDetail: shown.join(' \u00b7 '),
        identityLabel: shown.length ? `${machineName(machine)} (${shown.join(', ')})` : machineName(machine)
      });
    });
  }

  return machines.map((machine) => ({ ...machine, ...(notes.get(machine) ?? { identityDetail: '', identityLabel: undefined }) }));
}
