import { filterMachines, resetFilters, resolveSelectedMachine } from './filters.js';
import { RELATIONSHIP_PERCENTAGES } from './relationships.js';
import { addMachineToComparison, clearComparison, createComparisonState, makeBaseline, removeMachineFromComparison, restoreComparisonIds } from './comparison.js';

export const DEFAULT_RELATIONSHIP_PERCENTAGE = 10;

// Everything the user has chosen. Transient UI (open menus, focus, toasts) lives outside this object.
export function createInitialState() {
  return {
    filters: resetFilters(),
    selectedMachineId: '',
    relationshipPercentage: DEFAULT_RELATIONSHIP_PERCENTAGE,
    results: { sort: 'closest', brands: [], columns: 'key' },
    comparison: createComparisonState(),
    view: { differencesOnly: false, showEmpty: false }
  };
}

// Documented rules: an ineligible primary machine clears safely, and comparison IDs must exist.
export function reconcile(state, machines) {
  const eligible = filterMachines(machines, state.filters);
  const selectedMachineId = state.selectedMachineId && resolveSelectedMachine(eligible, state.selectedMachineId) ? state.selectedMachineId : '';
  const relationshipPercentage = RELATIONSHIP_PERCENTAGES.includes(state.relationshipPercentage) ? state.relationshipPercentage : DEFAULT_RELATIONSHIP_PERCENTAGE;
  const comparison = restoreComparisonIds(state.comparison.machineIds, machines).state;
  return { ...state, selectedMachineId, relationshipPercentage, comparison };
}

export function withFilterChange(state, machines, key, value, checked) {
  let next;
  if (key === 'topSpeed') next = checked ? String(value) : '';
  else {
    const current = Array.isArray(state.filters[key]) ? state.filters[key] : [];
    next = checked ? [...new Set([...current, String(value)])] : current.filter((item) => item !== String(value));
  }
  return reconcile({ ...state, filters: { ...state.filters, [key]: next } }, machines);
}

// Typing starts a new search, so the previous primary machine is released.
export function withSearch(state, machines, text) {
  return reconcile({ ...state, filters: { ...state.filters, search: text }, selectedMachineId: '' }, machines);
}

export function withMachineSelected(state, machines, machineId) {
  return reconcile({ ...state, selectedMachineId: machineId, filters: { ...state.filters, search: '' } }, machines);
}

export function withSelectionCleared(state) {
  return { ...state, selectedMachineId: '', filters: { ...state.filters, search: '' } };
}

export function withFiltersReset(state, machines) {
  return reconcile({ ...state, filters: resetFilters() }, machines);
}

export function withStartOver() {
  return createInitialState();
}

export function withRelationshipPercentage(state, percentage) {
  return RELATIONSHIP_PERCENTAGES.includes(Number(percentage)) ? { ...state, relationshipPercentage: Number(percentage) } : state;
}

export function withResultsChange(state, patch) {
  return { ...state, results: { ...state.results, ...patch } };
}

export function withViewChange(state, patch) {
  return { ...state, view: { ...state.view, ...patch } };
}

export function withComparisonAdded(state, machines, machineId) {
  return { ...state, comparison: addMachineToComparison(state.comparison, machineId, machines) };
}

// Adding the first candidate also adds the selected machine as Machine A (documented behaviour).
export function withComparisonToggled(state, machines, machineId) {
  if (state.comparison.machineIds.includes(machineId)) {
    return { ...state, comparison: removeMachineFromComparison(state.comparison, machineId) };
  }
  let comparison = state.comparison;
  if (comparison.machineIds.length === 0 && state.selectedMachineId && machineId !== state.selectedMachineId) {
    comparison = addMachineToComparison(comparison, state.selectedMachineId, machines);
  }
  return { ...state, comparison: addMachineToComparison(comparison, machineId, machines) };
}

export function withComparisonRemoved(state, machineId) {
  return { ...state, comparison: removeMachineFromComparison(state.comparison, machineId) };
}

export function withComparisonCleared(state) {
  return { ...state, comparison: clearComparison() };
}

export function withBaseline(state, machineId) {
  return { ...state, comparison: makeBaseline(state.comparison, machineId) };
}
