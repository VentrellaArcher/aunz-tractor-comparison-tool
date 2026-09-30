import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RESOURCE_PATHS, PREFETCH_KEY, isRenderableMachine, loadRuntimeData, sanitizeMachines } from '../src/js/data-loader.js';

function okResponse(payload) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => payload };
}

const payloads = {
  './data/machines.json': [{ machine_id: 'a', machine: 'A', manufacturer: 'Demo' }],
  './data/manufacturers.json': ['Demo'],
  './data/model-years.json': [2025],
  './data/filter-options.json': {},
  './data/build-info.json': { buildDate: '2026-01-01T00:00:00.000Z' }
};

test('all five resources are requested together rather than one after another', async () => {
  const requested = [];
  const release = [];
  const fetchImpl = (resource) => new Promise((resolve) => {
    requested.push(resource);
    release.push(() => resolve(okResponse(payloads[resource])));
  });
  const pending = loadRuntimeData(fetchImpl);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requested, Object.values(DEFAULT_RESOURCE_PATHS), 'every request starts before any response arrives');
  release.forEach((resolve) => resolve());
  const data = await pending;
  assert.equal(data.machines.length, 1);
  assert.equal(data.loadedFromGeneratedData, true);
});

test('a network failure names the resource that could not be loaded', async () => {
  const fetchImpl = async (resource) => {
    if (resource.endsWith('build-info.json')) throw new TypeError('Failed to fetch');
    return okResponse(payloads[resource]);
  };
  await assert.rejects(() => loadRuntimeData(fetchImpl), /Failed to load buildInfo from \.\/data\/build-info\.json: Failed to fetch/);
});

test('a file that is not valid JSON produces an actionable message', async () => {
  const fetchImpl = async (resource) => (resource.endsWith('machines.json') ? { ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } } : okResponse(payloads[resource]));
  await assert.rejects(() => loadRuntimeData(fetchImpl), /Failed to read machines from \.\/data\/machines\.json: the file is not valid JSON/);
});

test('shape checks still run in a fixed order after the parallel load', async () => {
  const fetchImpl = async () => okResponse({ not: 'an array' });
  await assert.rejects(() => loadRuntimeData(fetchImpl), /machines/i);
});

test('an early page request for the catalogue is reused once instead of downloading it twice', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (resource) => { calls.push(resource); return okResponse(payloads[resource]); };
  globalThis[PREFETCH_KEY] = Promise.resolve(okResponse(payloads['./data/machines.json']));
  try {
    const data = await loadRuntimeData();
    assert.equal(data.machines.length, 1);
    assert.equal(calls.includes('./data/machines.json'), false, 'machines.json was not requested again');
    assert.equal(calls.length, 4, 'the other resources are still loaded');
    assert.equal(PREFETCH_KEY in globalThis, false, 'the early request is consumed once');
    await loadRuntimeData();
    assert.equal(calls.includes('./data/machines.json'), true, 'a retry downloads it normally');
  } finally {
    globalThis.fetch = original;
    delete globalThis[PREFETCH_KEY];
  }
});

test('a failed early request falls back to a normal download, and injected fetches ignore it', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (resource) => { calls.push(resource); return okResponse(payloads[resource]); };
  globalThis[PREFETCH_KEY] = Promise.resolve(null);
  try {
    assert.equal((await loadRuntimeData()).machines.length, 1);
    assert.equal(calls.includes('./data/machines.json'), true);
    globalThis[PREFETCH_KEY] = Promise.resolve(okResponse([{ machine_id: 'wrong', machine: 'Wrong', manufacturer: 'Demo' }]));
    const injected = await loadRuntimeData(async (resource) => okResponse(payloads[resource]));
    assert.equal(injected.machines[0].machine_id, 'a', 'a custom fetch never uses the page request');
  } finally {
    globalThis.fetch = original;
    delete globalThis[PREFETCH_KEY];
  }
});

test('records the interface cannot identify are skipped instead of breaking rendering', () => {
  assert.equal(isRenderableMachine({ machine_id: 'a', machine: 'A', manufacturer: 'Demo' }), true);
  for (const bad of [null, undefined, 'text', 42, [], {}, { machine_id: '', machine: 'A', manufacturer: 'Demo' }, { machine_id: 'a', machine: '  ', manufacturer: 'Demo' }, { machine_id: 'a', machine: 'A' }, { machine_id: 7, machine: 'A', manufacturer: 'Demo' }]) {
    assert.equal(isRenderableMachine(bad), false, JSON.stringify(bad));
  }
  const result = sanitizeMachines([
    { machine_id: 'a', machine: 'A', manufacturer: 'Demo' },
    null,
    { machine_id: 'a', machine: 'A again', manufacturer: 'Demo' },
    { machine_id: 'b', machine: 'B', manufacturer: 'Demo', max_hp: null }
  ]);
  assert.deepEqual(result.machines.map((machine) => machine.machine_id), ['a', 'b']);
  assert.equal(result.skipped, 2);
  assert.deepEqual(sanitizeMachines([]), { machines: [], skipped: 0 });
});
