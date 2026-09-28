import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(appRoot, '..', '..');
const ciPath = path.join(repositoryRoot, '.github/workflows/validate-and-build.yml');
const pagesPath = path.join(repositoryRoot, '.github/workflows/deploy-pages.yml');

function readWorkflow(filePath) {
  assert.equal(existsSync(filePath), true, `missing workflow ${filePath}`);
  return readFileSync(filePath, 'utf8');
}

test('validation workflow gates pull requests and builds from the inner app root', () => {
  const workflow = readWorkflow(ciPath);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /working-directory: AUNZ_Comparison_Tool\/aunz-tractor-comparison-tool/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run validate/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run smoke/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /deploy-pages|openai|generative|enrichment/i);
});

test('Pages workflow deploys only a validated inner dist artifact on main', () => {
  const workflow = readWorkflow(pagesPath);
  assert.match(workflow, /push:\s*\n\s+branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /AUNZ_Comparison_Tool\/aunz-tractor-comparison-tool\/dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /data-source\/machines\.csv.*write|Set-Content|Out-File/i);
});

test('human-data workflow tests and docs state the governance boundary', () => {
  const testSource = readFileSync(path.join(appRoot, 'tests/human-data-workflow.test.js'), 'utf8');
  const guide = readFileSync(path.join(appRoot, 'docs/DATA_MAINTENANCE_GUIDE.md'), 'utf8');
  assert.match(testSource, /JCB/);
  assert.match(testSource, /productionHash/);
  assert.match(guide, /human collected, human entered, human reviewed and human maintained/i);
  assert.match(guide, /AI must never invent or populate/i);
  assert.match(guide, /JCB onboarding/i);
});
