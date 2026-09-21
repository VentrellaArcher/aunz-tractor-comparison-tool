import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RESOURCE_PATHS, loadRuntimeData } from '../src/js/data-loader.js';

test('required JSON resources use relative GitHub Pages-compatible paths', () => {
  for (const resourcePath of Object.values(DEFAULT_RESOURCE_PATHS)) {
    assert.ok(resourcePath.startsWith('../data/') || resourcePath.startsWith('./data/'));
    assert.ok(!resourcePath.startsWith('/'));
    assert.ok(!resourcePath.startsWith('file:'));
    assert.ok(!/https?:\/\/localhost|127\.0\.0\.1/i.test(resourcePath));
  }
});

test('successful mocked responses return the documented structured data result', async () => {
  const fetchImpl = async (resource) => {
    const payloads = {
      './data/machines.json': [{ machine_id: 'demo-tractor', manufacturer: 'Demo', model_year: 2025, published: true, machine: 'Demo Tractor', powerToWeightHpPerTonne: 25, powerToWeightKwPerTonne: 18.64, powerToWeightAvailable: true, powerToWeightUnavailableReason: null }],
      './data/manufacturers.json': ['Demo'],
      './data/model-years.json': [2025],
      './data/filter-options.json': { transmission: ['Auto'], countries: ['AU'] },
      './data/build-info.json': { buildDate: '2026-01-01T00:00:00.000Z', version: 'test-build', publishedRecordCount: 1 }
    };
    const response = { ok: true, status: 200, statusText: 'OK', json: async () => payloads[resource] };
    return response;
  };

  const result = await loadRuntimeData(fetchImpl);
  assert.equal(Array.isArray(result.machines), true);
  assert.deepEqual(result.manufacturers, ['Demo']);
  assert.deepEqual(result.modelYears, [2025]);
  assert.equal(typeof result.filterOptions, 'object');
  assert.equal(typeof result.buildInfo, 'object');
  assert.equal(result.machines[0].machine_id, 'demo-tractor');
});

test('machines payload must be an array and invalid payloads fail clearly', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ not: 'an array' }) });
  await assert.rejects(() => loadRuntimeData(fetchImpl), /machines/i);
});

test('failed machines request produces an actionable resource-specific error', async () => {
  const fetchImpl = async (resource) => {
    if (resource.endsWith('machines.json')) {
      return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) };
    }
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({}) };
  };

  await assert.rejects(() => loadRuntimeData(fetchImpl), /machines\.json|Failed to load machines/i);
});

test('loadRuntimeData does not embed any fallback catalogue', async () => {
  const fetchImpl = async (resource) => {
    const payloads = {
      './data/machines.json': [],
      './data/manufacturers.json': [],
      './data/model-years.json': [],
      './data/filter-options.json': { transmission: [], countries: [] },
      './data/build-info.json': { buildDate: '2026-01-01T00:00:00.000Z', version: 'test-build', publishedRecordCount: 0 }
    };
    return { ok: true, status: 200, statusText: 'OK', json: async () => payloads[resource] };
  };

  const result = await loadRuntimeData(fetchImpl);
  assert.deepEqual(result.machines, []);
  assert.equal(result.loadedFromGeneratedData, true);
});
