export const MAX_COMPARISON_MACHINES = 4;

export function createComparisonState() {
  return { machineIds: [], message: null };
}

function validMachineId(machineId) {
  return typeof machineId === 'string' && machineId.trim().length > 0;
}

export function addMachineToComparison(state, machineId, machines, options = {}) {
  const nextState = { machineIds: [...state.machineIds], message: null };
  const maxMachines = options.maxMachines ?? MAX_COMPARISON_MACHINES;
  if (!validMachineId(machineId) || !machines.some((machine) => machine.machine_id === machineId)) {
    nextState.message = 'That machine is not available for comparison.';
    return nextState;
  }
  if (nextState.machineIds.includes(machineId)) {
    nextState.message = 'That machine is already in the comparison.';
    return nextState;
  }
  if (nextState.machineIds.length >= maxMachines) {
    nextState.message = `Comparison is limited to ${maxMachines} machines.`;
    return nextState;
  }
  nextState.machineIds.push(machineId);
  return nextState;
}

export function addSelectedAndCandidate(state, selectedMachineId, candidateMachineId, machines) {
  let nextState = createComparisonState();
  nextState = addMachineToComparison(nextState, selectedMachineId, machines);
  return addMachineToComparison(nextState, candidateMachineId, machines);
}

export function removeMachineFromComparison(state, machineId) {
  return { machineIds: state.machineIds.filter((id) => id !== machineId), message: null };
}

export function clearComparison() {
  return createComparisonState();
}

export function resolveComparisonMachines(state, machines) {
  return state.machineIds
    .map((machineId) => machines.find((machine) => machine.machine_id === machineId))
    .filter(Boolean);
}

function safeNumeric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function calculateDelta(field, baselineMachine, candidateMachine) {
  if (!field?.numericDeltaEligible) return { available: false, reason: 'field_not_delta_eligible', value: null };
  const baseline = safeNumeric(baselineMachine?.[field.propertyPath]);
  const candidate = safeNumeric(candidateMachine?.[field.propertyPath]);
  if (baseline === null || candidate === null) return { available: false, reason: 'value_not_scalar', value: null };
  return { available: true, reason: null, value: candidate - baseline };
}

export function comparePowerToWeight(baselineMachine, candidateMachine) {
  const basis = {
    powerBasis: baselineMachine?.powerBasis ?? candidateMachine?.powerBasis ?? 'maxHp',
    weightBasis: baselineMachine?.weightBasis ?? candidateMachine?.weightBasis ?? 'unladenWeightKg'
  };
  if (baselineMachine?.powerToWeightAvailable !== true || candidateMachine?.powerToWeightAvailable !== true) {
    return { available: false, reason: 'power_to_weight_unavailable', ...basis, hpPerTonneDelta: null, kwPerTonneDelta: null };
  }
  const hpPerTonneDelta = safeNumeric(candidateMachine.powerToWeightHpPerTonne) - safeNumeric(baselineMachine.powerToWeightHpPerTonne);
  const kwPerTonneDelta = safeNumeric(candidateMachine.powerToWeightKwPerTonne) - safeNumeric(baselineMachine.powerToWeightKwPerTonne);
  if (!Number.isFinite(hpPerTonneDelta) || !Number.isFinite(kwPerTonneDelta)) {
    return { available: false, reason: 'power_to_weight_value_not_scalar', ...basis, hpPerTonneDelta: null, kwPerTonneDelta: null };
  }
  return { available: true, reason: null, ...basis, hpPerTonneDelta, kwPerTonneDelta };
}

export function formatDelta(delta, unit) {
  if (!delta?.available) return '—';
  const sign = delta.value > 0 ? '+' : '';
  return `${sign}${delta.value} ${unit ?? ''}`.trim();
}
