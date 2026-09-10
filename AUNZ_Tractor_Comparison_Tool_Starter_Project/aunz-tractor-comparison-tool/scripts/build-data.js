import fs from 'node:fs'; import path from 'node:path'; import { readCsv, transformValue } from './csv-utils.js'; import { fieldDefinitions } from './schema.js'; import { calculatePowerToWeight } from './derived-metrics.js';
const root = path.resolve(import.meta.dirname, '..'); const { records } = readCsv(path.join(root, 'data-source/machines.csv')); const out = path.join(root, 'dist/data'); fs.mkdirSync(out, { recursive: true });
function mapRecord(record) {
  const machine = { specifications: {}, filters: {}, image: {}, source: {} };
  for (const [source, def] of Object.entries(fieldDefinitions)) {
    const value = transformValue(record[source], def);
    if (def.group === 'control' || def.group === 'identity') machine[def.output] = value;
    else if (def.group === 'specifications') machine.specifications[def.output] = value;
    else if (def.group === 'filters') machine.filters[def.output] = value;
    else if (def.group === 'image') machine.image[def.output] = value;
    else if (def.group === 'source') machine.source[def.output] = value;
  }
  machine.derived = calculatePowerToWeight(record);
  if (!machine.image.filename) machine.image = null;
  return machine;
}
const all = records.map(mapRecord); const machines = all.filter(m => m.published).sort((a,b) => a.manufacturer.localeCompare(b.manufacturer) || b.modelYear-a.modelYear || a.machine.localeCompare(b.machine));
const manufacturers = [...new Set(machines.map(m => m.manufacturer))].sort();
const modelYears = [...new Set(machines.map(m => m.modelYear).filter(Number.isFinite))].sort((a,b)=>b-a);
const flatten = key => [...new Set(machines.flatMap(m => Array.isArray(m.filters[key]) ? m.filters[key] : m.filters[key] == null ? [] : [m.filters[key]]))].sort((a,b)=>String(a).localeCompare(String(b), undefined, {numeric:true}));
const filterOptions = { manufacturers, modelYears, markets: [...new Set(machines.map(m=>m.market))].sort(), transmissionTags: flatten('transmissionTags'), transmissionClasses: flatten('transmissionClass'), topSpeeds: flatten('topSpeed'), cylinders: flatten('cylinders'), rearPtoTags: flatten('rearPtoTags') };
const buildInfo = { builtAt: new Date().toISOString(), version: process.env.GITHUB_SHA?.slice(0,7) ?? 'local', sourceRows: records.length, publishedMachines: machines.length, powerToWeightAvailable: machines.filter(m => m.derived.powerToWeightAvailable).length };
for (const [name,data] of Object.entries({ 'machines.json': machines, 'manufacturers.json': manufacturers, 'model-years.json': modelYears, 'filter-options.json': filterOptions, 'build-info.json': buildInfo })) fs.writeFileSync(path.join(out,name), JSON.stringify(data,null,2)+'\n');
console.log(`Built ${machines.length} published machines; ${buildInfo.powerToWeightAvailable} have power-to-weight ratios.`);
