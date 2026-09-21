export const RELATIONSHIP_PERCENTAGES = [0, 5, 10, 15, 20];

function safeMaxHp(machine) {
  const value = machine?.max_hp;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function validateRelationshipPercentage(value) {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || !RELATIONSHIP_PERCENTAGES.includes(percentage)) {
    throw new Error(`Relationship percentage must be one of: ${RELATIONSHIP_PERCENTAGES.join(', ')}.`);
  }
  return percentage;
}

export function calculateRelationshipBounds(selectedMaxHp, percentage) {
  const power = Number(selectedMaxHp);
  const band = validateRelationshipPercentage(percentage);
  if (!Number.isFinite(power) || power <= 0) {
    return null;
  }
  return {
    lowerBound: power * (1 - band / 100),
    upperBound: power * (1 + band / 100)
  };
}

function resultRow(machine, selectedMaxHp, isSelected) {
  const maxHp = safeMaxHp(machine);
  const difference = maxHp === null || selectedMaxHp === null ? null : Math.abs(maxHp - selectedMaxHp);
  return {
    machine,
    machineId: machine.machine_id,
    isSelected,
    maxHp,
    absoluteMaxHpDifference: difference,
    percentageMaxHpDifference: difference === null || selectedMaxHp === null ? null : (difference / selectedMaxHp) * 100
  };
}

export function findRelationshipResults(machines, selectedMachine, percentage) {
  const band = validateRelationshipPercentage(percentage);
  const selectedMaxHp = safeMaxHp(selectedMachine);
  if (!selectedMachine) {
    return { available: false, reason: 'selected_machine_unavailable', percentage: band, rows: [] };
  }
  if (selectedMaxHp === null) {
    return { available: false, reason: 'selected_max_hp_unavailable', percentage: band, rows: [] };
  }

  const bounds = calculateRelationshipBounds(selectedMaxHp, band);
  const candidates = machines
    .filter((machine) => machine.machine_id !== selectedMachine.machine_id)
    .filter((machine) => {
      const maxHp = safeMaxHp(machine);
      return maxHp !== null && maxHp >= bounds.lowerBound && maxHp <= bounds.upperBound;
    })
    .map((machine) => resultRow(machine, selectedMaxHp, false))
    .sort((left, right) => left.absoluteMaxHpDifference - right.absoluteMaxHpDifference || left.machineId.localeCompare(right.machineId));

  return {
    available: true,
    reason: null,
    percentage: band,
    lowerBound: bounds.lowerBound,
    upperBound: bounds.upperBound,
    rows: [resultRow(selectedMachine, selectedMaxHp, true), ...candidates]
  };
}
