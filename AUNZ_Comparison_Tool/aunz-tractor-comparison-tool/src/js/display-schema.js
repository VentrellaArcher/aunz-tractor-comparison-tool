export const displaySections = [
  'Machine',
  'Power and engine',
  'Derived performance',
  'Transmission and speed',
  'Dimensions and weights',
  'Hydraulics and hitch',
  'Cab and capacities',
  'PTO',
  'Source and review'
];

export const displaySchema = [
  { key: 'manufacturer', propertyPath: 'manufacturer', label: 'Manufacturer', section: 'Machine', order: 1, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: false },
  { key: 'machine', propertyPath: 'machine', label: 'Machine', section: 'Machine', order: 2, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: false },
  { key: 'model_year', propertyPath: 'model_year', label: 'Model year', section: 'Machine', order: 3, unit: null, valueType: 'integer', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: false },
  { key: 'market', propertyPath: 'market', label: 'Market', section: 'Machine', order: 4, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: false },
  { key: 'country_of_manufacture', propertyPath: 'country_of_manufacture', label: 'Country of manufacture', section: 'Machine', order: 5, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'rated_hp', propertyPath: 'rated_hp', label: 'Rated HP', section: 'Power and engine', order: 1, unit: 'hp', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_hp', propertyPath: 'max_hp', label: 'Max HP', section: 'Power and engine', order: 2, unit: 'hp', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: true, sourceType: 'source', formatter: 'number', nullable: false },
  { key: 'max_hp_with_ipm', propertyPath: 'max_hp_with_ipm', label: 'Max HP with IPM', section: 'Power and engine', order: 3, unit: 'hp', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_torque_nm', propertyPath: 'max_torque_nm', label: 'Max Torque', section: 'Power and engine', order: 4, unit: 'Nm', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: true, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'engine_capacity_l', propertyPath: 'engine_capacity_l', label: 'Engine capacity', section: 'Power and engine', order: 5, unit: 'L', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'number_of_cylinders', propertyPath: 'number_of_cylinders', label: 'Number of cylinders', section: 'Power and engine', order: 6, unit: null, valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'engine_manufacturer', propertyPath: 'engine_manufacturer', label: 'Engine manufacturer', section: 'Power and engine', order: 7, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'engine_stage_tier', propertyPath: 'engine_stage_tier', label: 'Engine stage / tier', section: 'Power and engine', order: 8, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'powerToWeightHpPerTonne', propertyPath: 'powerToWeightHpPerTonne', label: 'Power-to-weight ratio (hp/t)', section: 'Derived performance', order: 1, unit: 'hp/t', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'derived', formatter: 'number', nullable: true },
  { key: 'powerToWeightKwPerTonne', propertyPath: 'powerToWeightKwPerTonne', label: 'Power-to-weight ratio (kW/t)', section: 'Derived performance', order: 2, unit: 'kW/t', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'derived', formatter: 'number', nullable: true },
  { key: 'transmission', propertyPath: 'transmission', label: 'Transmission', section: 'Transmission and speed', order: 1, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'transmission_class', propertyPath: 'transmission_class', label: 'Transmission class', section: 'Transmission and speed', order: 2, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'top_speed_kmh', propertyPath: 'top_speed_kmh', label: 'Top Speed', section: 'Transmission and speed', order: 3, unit: 'km/h', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: true, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'wheelbase_mm', propertyPath: 'wheelbase_mm', label: 'Wheelbase', section: 'Dimensions and weights', order: 1, unit: 'mm', valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'unladen_weight_kg', propertyPath: 'unladen_weight_kg', label: 'Unladen weight', section: 'Dimensions and weights', order: 2, unit: 'kg', valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_permissible_weight_40_kmh_kg', propertyPath: 'max_permissible_weight_40_kmh_kg', label: 'Maximum permissible weight at 40 km/h', section: 'Dimensions and weights', order: 3, unit: 'kg', valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: true, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_permissible_weight_50_kmh_kg', propertyPath: 'max_permissible_weight_50_kmh_kg', label: 'Maximum permissible weight at 50 km/h', section: 'Dimensions and weights', order: 4, unit: 'kg', valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_permissible_weight_60_kmh_kg', propertyPath: 'max_permissible_weight_60_kmh_kg', label: 'Maximum permissible weight at 60 km/h', section: 'Dimensions and weights', order: 5, unit: 'kg', valueType: 'number', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'rated_hydraulic_flow_lpm', propertyPath: 'rated_hydraulic_flow_lpm', label: 'Rated hydraulic flow', section: 'Hydraulics and hitch', order: 1, unit: 'L/min', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_hydraulic_flow_lpm', propertyPath: 'max_hydraulic_flow_lpm', label: 'Maximum hydraulic flow', section: 'Hydraulics and hitch', order: 2, unit: 'L/min', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'max_scvs', propertyPath: 'max_scvs', label: 'Maximum SCVs', section: 'Hydraulics and hitch', order: 3, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'rear_hitch_capacity_kg', propertyPath: 'rear_hitch_capacity_kg', label: 'Rear hitch capacity', section: 'Hydraulics and hitch', order: 4, unit: 'kg', valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'front_hitch_capacity_kg', propertyPath: 'front_hitch_capacity_kg', label: 'Front hitch capacity', section: 'Hydraulics and hitch', order: 5, unit: 'kg', valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'cab_suspension', propertyPath: 'cab_suspension', label: 'Cab suspension', section: 'Cab and capacities', order: 1, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'fuel_capacity_l', propertyPath: 'fuel_capacity_l', label: 'Fuel capacity', section: 'Cab and capacities', order: 2, unit: 'L', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'adblue_tank_l', propertyPath: 'adblue_tank_l', label: 'AdBlue tank capacity', section: 'Cab and capacities', order: 3, unit: 'L', valueType: 'number', blankValue: '—', numericDeltaEligible: true, priority: false, sourceType: 'source', formatter: 'number', nullable: true },
  { key: 'rear_pto_option', propertyPath: 'rear_pto_option', label: 'Rear PTO option', section: 'PTO', order: 1, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'source_title', propertyPath: 'source_title', label: 'Source title', section: 'Source and review', order: 1, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true },
  { key: 'source_url', propertyPath: 'source_url', label: 'Source URL', section: 'Source and review', order: 2, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'link', nullable: true },
  { key: 'last_reviewed_date', propertyPath: 'last_reviewed_date', label: 'Last reviewed date', section: 'Source and review', order: 3, unit: null, valueType: 'date', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'date', nullable: true },
  { key: 'notes', propertyPath: 'notes', label: 'Notes', section: 'Source and review', order: 4, unit: null, valueType: 'string', blankValue: '—', numericDeltaEligible: false, priority: false, sourceType: 'source', formatter: 'text', nullable: true }
];

export function formatDisplayValue(value, unit, blankValue = '—') {
  if (value === null || value === undefined || value === '') {
    return blankValue;
  }
  if (unit && value !== null && value !== undefined && value !== '') {
    return `${value} ${unit}`;
  }
  return String(value);
}
