#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schema, expectedCsvHeader } from './schema.js';
import { parseCsv, transformSourceRows } from './data-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const csvPath = path.join(projectRoot, 'data-source', 'machines.csv');
const artifactsDir = path.join(projectRoot, 'artifacts');
const reportPath = path.join(artifactsDir, 'validation-report.json');

export function validateCsv(csvTextInput) {
  const rows = parseCsv(csvTextInput);
  const errors = [];
  const warnings = [];
  const info = [];

  if (rows.length < 2) {
    errors.push({ row: 1, field: 'header', reason: 'CSV does not contain a header and data rows.' });
  }

  const header = rows[0] || [];
  if (header.length !== expectedCsvHeader.length || header.join(',') !== expectedCsvHeader.join(',')) {
    errors.push({ row: 1, field: 'header', reason: 'Unexpected or missing CSV header.', expected: expectedCsvHeader, actual: header });
  }

  const schemaMap = new Map(schema.map((field) => [field.source, field]));
  const duplicateSchemaSources = header.filter((name, index) => header.indexOf(name) !== index);
  if (duplicateSchemaSources.length > 0) {
    errors.push({ row: 1, field: 'header', reason: 'Duplicate CSV columns detected.', invalidValue: duplicateSchemaSources });
  }

  const invalidHeaderMappings = header.filter((name) => !schemaMap.has(name));
  if (invalidHeaderMappings.length > 0) {
    errors.push({ row: 1, field: 'header', reason: 'Unexpected CSV column names.', invalidValue: invalidHeaderMappings });
  }

  const records = transformSourceRows(rows.slice(1), header);
  const machineIds = new Map();
  const identityKeys = new Map();

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const record = transformSourceRows([row], header)[0] || {};
    if (!record.machine_id) {
      errors.push({ row: index + 1, field: 'machine_id', reason: 'Missing required identity field.' });
    }
    if (record.machine_id && !/^[a-z0-9-]+$/.test(record.machine_id)) {
      errors.push({ row: index + 1, field: 'machine_id', invalidValue: record.machine_id, reason: 'Machine ID must use lowercase ASCII letters, numbers and hyphens only.' });
    }
    if (record.machine_id) {
      if (machineIds.has(record.machine_id)) {
        errors.push({ row: index + 1, field: 'machine_id', invalidValue: record.machine_id, reason: 'Duplicate machine ID.' });
      } else {
        machineIds.set(record.machine_id, index + 1);
      }
    }

    const identityKey = `${record.machine || ''}|${record.model_year || ''}|${record.market || ''}`;
    if (record.machine && record.model_year && record.market) {
      if (identityKeys.has(identityKey)) {
        errors.push({ row: index + 1, field: 'machine_id', reason: 'Duplicate machine, model year and market identity.', invalidValue: identityKey });
      } else {
        identityKeys.set(identityKey, index + 1);
      }
    }

    const publishedCell = row[1] == null ? '' : String(row[1]).trim();
    if (publishedCell && !['TRUE', 'FALSE'].includes(publishedCell.toUpperCase())) {
      errors.push({ row: index + 1, field: 'published', invalidValue: row[1], reason: 'Published field must be TRUE or FALSE.' });
    }
    if (record.published !== true && record.published !== false && record.published !== null) {
      errors.push({ row: index + 1, field: 'published', invalidValue: row[1], reason: 'Published field must be TRUE or FALSE.' });
    }

    if (record.model_year != null && (!Number.isInteger(record.model_year) || record.model_year <= 0)) {
      errors.push({ row: index + 1, field: 'model_year', invalidValue: record.model_year, reason: 'Model year must be a positive integer.' });
    }

    const imageFilename = record.image_filename;
    const imageAltText = record.image_alt_text;
    if (imageFilename && !imageAltText) {
      errors.push({ row: index + 1, field: 'image_alt_text', invalidValue: imageAltText, reason: 'Image filename without alt text is invalid.' });
    }

    if (record.transmission_filter_tags && !Array.isArray(record.transmission_filter_tags)) {
      warnings.push({ row: index + 1, field: 'transmission_filter_tags', invalidValue: record.transmission_filter_tags, reason: 'Helper field should be an array of values.' });
    }

    if (!record.source_url) {
      warnings.push({ row: index + 1, field: 'source_url', reason: 'Missing source URL metadata.' });
    }

    if (record.published === false) {
      info.push({ row: index + 1, field: 'published', reason: 'Record is unpublished and excluded from public output.' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFile: csvPath,
    errors,
    warnings,
    info,
    rowCount: rows.length - 1,
    publishedRecordCount: records.filter((record) => record.published === true).length
  };
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const csvText = readFileSync(csvPath, 'utf8');
  const result = validateCsv(csvText);
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(result, null, 2));

  if (result.errors.length > 0) {
    console.error(JSON.stringify({ errors: result.errors, warnings: result.warnings, info: result.info }, null, 2));
    process.exit(1);
  }

  console.log(`Validation passed with ${result.warnings.length} warnings and ${result.info.length} informational messages.`);
}
