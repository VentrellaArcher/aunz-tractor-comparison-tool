#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync, cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMachineDataset } from './data-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const csvPath = path.join(projectRoot, 'data-source', 'machines.csv');
const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(distDir, 'data');
const csvText = readFileSync(csvPath, 'utf8');
const dataset = buildMachineDataset(csvText);

mkdirSync(dataDir, { recursive: true });

writeFileSync(path.join(dataDir, 'machines.json'), JSON.stringify(dataset.publishedMachines, null, 2));
writeFileSync(path.join(dataDir, 'manufacturers.json'), JSON.stringify(dataset.manufacturers, null, 2));
writeFileSync(path.join(dataDir, 'model-years.json'), JSON.stringify(dataset.modelYears, null, 2));
writeFileSync(path.join(dataDir, 'filter-options.json'), JSON.stringify(dataset.filterOptions, null, 2));
writeFileSync(path.join(dataDir, 'build-info.json'), JSON.stringify({
  buildDate: dataset.buildInfo.buildDate,
  sourceRowCount: dataset.buildInfo.sourceRowCount,
  publishedRecordCount: dataset.buildInfo.publishedRecordCount,
  powerToWeightAvailableCount: dataset.buildInfo.powerToWeightAvailableCount,
  version: dataset.buildInfo.version
}, null, 2));

const srcDir = path.join(projectRoot, 'src');
if (existsSync(srcDir)) {
  cpSync(srcDir, distDir, { recursive: true, force: true });
}

console.log('Generated data files in dist/data and front-end files under dist');
