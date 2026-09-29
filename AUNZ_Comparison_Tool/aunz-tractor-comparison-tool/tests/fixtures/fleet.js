// Synthetic machines for interface tests. These are fixtures only and never appear in the catalogue.
export function makeMachine(overrides = {}) {
  return {
    machine_id: 'demo-100-2025-au',
    published: true,
    market: 'AU',
    manufacturer: 'Demo',
    machine: 'Demo 100',
    model_year: 2025,
    max_hp: 100,
    rated_hp: 90,
    max_hp_with_ipm: null,
    max_torque_nm: 400,
    transmission: 'CVT / IVT / EVT',
    transmission_filter_tags: ['CVT / IVT / EVT'],
    top_speed_kmh: 50,
    cylinders_filter: '4',
    number_of_cylinders: 4,
    rear_pto_option: '540/1000',
    rear_pto_filter_tags: ['540', '1000'],
    unladen_weight_kg: 5000,
    max_permissible_weight_40_kmh_kg: 8000,
    notes: null,
    source_url: null,
    powerToWeightAvailable: true,
    powerToWeightHpPerTonne: 20,
    powerToWeightKwPerTonne: 14.91,
    powerToWeightUnavailableReason: null,
    powerBasis: 'maxHp',
    weightBasis: 'unladenWeightKg',
    ...overrides
  };
}

export const fleet = [
  makeMachine({ machine_id: 'jd-8r-340-2025-au', manufacturer: 'John Deere', machine: 'John Deere 8R 340', max_hp: 374, max_torque_nm: 1600, top_speed_kmh: 50, cylinders_filter: '6', number_of_cylinders: 6, powerToWeightHpPerTonne: 29.45, powerToWeightKwPerTonne: 21.96 }),
  makeMachine({ machine_id: 'jd-8rt-340-2025-au', manufacturer: 'John Deere', machine: 'John Deere 8RT 340', max_hp: 374, max_torque_nm: 1580, top_speed_kmh: 40, cylinders_filter: '6', number_of_cylinders: 6, transmission_filter_tags: ['Full powershift'], transmission: 'e23 PowerShift', powerToWeightHpPerTonne: 22.53, powerToWeightKwPerTonne: 16.8 }),
  makeMachine({ machine_id: 'nh-t8-410-2024-us', manufacturer: 'New Holland', machine: 'New Holland T8.410 *US SPEC*', model_year: 2024, market: 'US', max_hp: 380, max_torque_nm: null, top_speed_kmh: 40, cylinders_filter: '6', number_of_cylinders: 6, powerToWeightAvailable: false, powerToWeightHpPerTonne: null, powerToWeightKwPerTonne: null, powerToWeightUnavailableReason: 'unladen_weight_not_scalar', unladen_weight_kg: '24639 (narrow), 25546 (wide)' }),
  makeMachine({ machine_id: 'fendt-942-2025-au', manufacturer: 'Fendt', machine: 'Fendt 942 Vario', max_hp: 420, cylinders_filter: '6', number_of_cylinders: 6, top_speed_kmh: 60 }),
  makeMachine({ machine_id: 'mf-8s-265-2023-au', manufacturer: 'Massey Ferguson', machine: 'Massey Ferguson 8S.265', model_year: 2023, max_hp: 265, transmission_filter_tags: ['CVT / IVT / EVT'], rear_pto_filter_tags: ['1000'] }),
  makeMachine({ machine_id: 'deutz-6170-2025-au', manufacturer: 'Deutz-Fahr', machine: 'Deutz-Fahr 6170 RC-Shift Warrior', max_hp: 170, transmission_filter_tags: ['Semi-powershift'], top_speed_kmh: 40, cylinders_filter: '4' }),
  makeMachine({ machine_id: 'case-puma-150-2025-au', manufacturer: 'Case IH', machine: 'Case IH Puma 150', max_hp: 150, transmission_filter_tags: ['Semi-powershift'], top_speed_kmh: 40, cylinders_filter: '4' })
];
