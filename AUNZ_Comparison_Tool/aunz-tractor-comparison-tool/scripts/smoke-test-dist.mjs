#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const requiredFiles = [
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/data-loader.js',
  'js/filters.js',
  'js/relationships.js',
  'js/comparison.js',
  'js/comparison-output.js',
  'data/machines.json',
  'data/manufacturers.json',
  'data/model-years.json',
  'data/filter-options.json',
  'data/build-info.json'
];

function fail(message) {
  throw new Error(`Smoke check failed: ${message}`);
}

function readJson(relativePath) {
  const absolutePath = path.join(distRoot, relativePath);
  if (!existsSync(absolutePath)) fail(`missing ${relativePath}`);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(distRoot, relativePath))) fail(`missing ${relativePath}`);
}

const html = readFileSync(path.join(distRoot, 'index.html'), 'utf8');
if (!/<script type="module" src="\.\/js\/app\.js"><\/script>/.test(html)) fail('index.html does not use the relative app module path');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) fail('index.html contains a root-absolute asset path');

const machines = readJson('data/machines.json');
const manufacturers = readJson('data/manufacturers.json');
const modelYears = readJson('data/model-years.json');
const filterOptions = readJson('data/filter-options.json');
const buildInfo = readJson('data/build-info.json');

if (!Array.isArray(machines) || machines.length === 0) fail('machines.json is not a non-empty array');
if (!Array.isArray(manufacturers) || !Array.isArray(modelYears)) fail('manufacturer/model-year indexes are not arrays');
if (!filterOptions || typeof filterOptions !== 'object') fail('filter-options.json is not an object');
if (!buildInfo || typeof buildInfo !== 'object') fail('build-info.json is not an object');
if (buildInfo.publishedRecordCount !== machines.length) fail('build-info published count does not match machines.json');

const derivedManufacturers = [...new Set(machines.map((machine) => machine.manufacturer).filter(Boolean))].sort();
const derivedModelYears = [...new Set(machines.map((machine) => machine.model_year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
if (JSON.stringify(manufacturers) !== JSON.stringify(derivedManufacturers)) fail('manufacturer index does not match published machines');
if (JSON.stringify(modelYears) !== JSON.stringify(derivedModelYears)) fail('model-year index does not match published machines');
if (!Array.isArray(filterOptions.manufacturers) || !Array.isArray(filterOptions.modelYears)) fail('filter options lack generated manufacturer/model-year arrays');
if (machines.some((machine) => /synthetic|unofficial/i.test(JSON.stringify(machine)))) fail('synthetic test data entered production output');

const productionText = requiredFiles
  .filter((file) => file.endsWith('.html') || file.endsWith('.js'))
  .map((file) => readFileSync(path.join(distRoot, file), 'utf8'))
  .join('\n');
if (/localhost|file:\/\//i.test(productionText)) fail('production output contains localhost or file paths');
if (/BEGIN (?:RSA|OPENSSH) PRIVATE KEY|api[_-]?key|secret[_-]?key/i.test(productionText)) fail('production output contains a secret-like value');

console.log(`Smoke check passed: ${machines.length} published machines, ${manufacturers.length} manufacturers, version ${buildInfo.version}.`);
