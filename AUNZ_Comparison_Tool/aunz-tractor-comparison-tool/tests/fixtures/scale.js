import { makeMachine } from './fleet.js';

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Small deterministic generator so a failing run can be reproduced exactly.
function sequence(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// A synthetic future catalogue: many manufacturers (some with very long names), families with several power
// variants, uneven model-year history, and machines that share a name and year across markets.
// It exists only inside tests and is never written to any data file.
export function makeGrowthCatalogue({ brands = 30, familiesPerBrand = 8, variantsPerFamily = 5, seed = 7 } = {}) {
  const random = sequence(seed);
  const years = [2015, 2017, 2019, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
  const machines = [];
  const add = (brand, name, year, market, hp) => machines.push(makeMachine({
    machine_id: `${slug(name)}-${year}-${market.toLowerCase()}`,
    manufacturer: brand,
    machine: name,
    model_year: year,
    market,
    max_hp: hp,
    rated_hp: hp - 10,
    transmission_filter_tags: [random() < 0.5 ? 'CVT / IVT / EVT' : 'Semi-powershift'],
    top_speed_kmh: [40, 50, 60][Math.floor(random() * 3)],
    cylinders_filter: String(4 + 2 * Math.floor(random() * 2)),
    unladen_weight_kg: 4000 + hp * 20
  }));
  for (let b = 0; b < brands; b += 1) {
    const brand = b % 9 === 0 ? `International Agricultural Machinery Works ${b}` : `Marque${b}`;
    for (let f = 0; f < familiesPerBrand; f += 1) {
      const family = `${String.fromCharCode(65 + (f % 26))}${f + 1}`;
      for (let v = 0; v < variantsPerFamily; v += 1) {
        const hp = 90 + f * 30 + v * 12;
        const name = `${brand} ${family}.${hp}`;
        const yearCount = 1 + Math.floor(random() * 4);
        const start = Math.floor(random() * (years.length - yearCount + 1));
        for (const year of years.slice(start, start + yearCount)) {
          add(brand, name, year, 'AU', hp);
          if (random() < 0.08) add(brand, name, year, 'NZ', hp);
        }
      }
    }
  }
  return machines;
}
