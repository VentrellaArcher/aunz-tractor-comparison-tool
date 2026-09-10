import { scalarNumber } from './csv-utils.js';
const HP_TO_KW = 0.745699872;
export function calculatePowerToWeight(record) {
  const power = scalarNumber(record.max_hp);
  const rawWeight = record.unladen_weight_kg;
  const weight = scalarNumber(rawWeight);
  let reason = null;
  if (!(power > 0)) reason = 'power_missing_or_invalid';
  else if (rawWeight == null || String(rawWeight).trim() === '') reason = 'unladen_weight_missing_or_invalid';
  else if (!(weight > 0)) reason = /[A-Za-z,/()]/.test(String(rawWeight)) ? 'unladen_weight_not_scalar' : 'unladen_weight_missing_or_invalid';
  if (reason) return { powerToWeightHpPerTonne: null, powerToWeightKwPerTonne: null, powerBasis: 'maxHp', weightBasis: 'unladenWeightKg', powerToWeightAvailable: false, powerToWeightUnavailableReason: reason };
  const hpPerTonne = power / weight * 1000;
  return { powerToWeightHpPerTonne: Number(hpPerTonne.toFixed(2)), powerToWeightKwPerTonne: Number((hpPerTonne * HP_TO_KW).toFixed(2)), powerBasis: 'maxHp', weightBasis: 'unladenWeightKg', powerToWeightAvailable: true, powerToWeightUnavailableReason: null };
}
