import fs from 'node:fs'; import path from 'node:path'; import { readCsv } from './csv-utils.js'; import { validateData } from './validate-core.js';
const root = path.resolve(import.meta.dirname, '..'); const { headers, records, rowNumbers } = readCsv(path.join(root, 'data-source/machines.csv'));
const report = validateData(headers, records, rowNumbers); fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true }); fs.writeFileSync(path.join(root, 'artifacts/validation-report.json'), JSON.stringify(report, null, 2));
console.log(`Validated ${report.summary.rows} rows: ${report.summary.errors} errors, ${report.summary.warnings} warnings.`);
for (const e of report.errors) console.error(`ERROR row ${e.row}${e.machineId ? ` [${e.machineId}]` : ''}: ${e.message}`);
if (report.errors.length) process.exit(1);
