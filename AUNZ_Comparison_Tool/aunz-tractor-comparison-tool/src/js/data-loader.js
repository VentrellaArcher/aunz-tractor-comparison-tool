export const DEFAULT_RESOURCE_PATHS = {
  machines: './data/machines.json',
  manufacturers: './data/manufacturers.json',
  modelYears: './data/model-years.json',
  filterOptions: './data/filter-options.json',
  buildInfo: './data/build-info.json'
};

function assertShape(label, payload, expectedType, resourceId) {
  if (expectedType === 'array' && !Array.isArray(payload)) {
    throw new Error(`Invalid ${label} payload for ${resourceId}: expected an array.`);
  }

  if (expectedType === 'object' && (payload === null || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new Error(`Invalid ${label} payload for ${resourceId}: expected an object.`);
  }
}

async function fetchResource(fetchImpl, key, resourcePath) {
  let response;
  try {
    response = await fetchImpl(resourcePath);
  } catch (error) {
    throw new Error(`Failed to load ${key} from ${resourcePath}: ${error?.message || 'Network request failed'}`);
  }
  if (!response || !response.ok) {
    throw new Error(`Failed to load ${key} from ${resourcePath}: ${response?.statusText || 'Request failed'}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`Failed to read ${key} from ${resourcePath}: the file is not valid JSON.`);
  }
}

export async function loadRuntimeData(fetchImpl = fetch) {
  const entries = Object.entries(DEFAULT_RESOURCE_PATHS);
  const payloads = await Promise.all(entries.map(([key, resourcePath]) => fetchResource(fetchImpl, key, resourcePath)));
  const resources = Object.fromEntries(entries.map(([key], index) => [key, payloads[index]]));

  assertShape('machines', resources.machines, 'array', 'machines.json');
  assertShape('manufacturers', resources.manufacturers, 'array', 'manufacturers.json');
  assertShape('modelYears', resources.modelYears, 'array', 'model-years.json');
  assertShape('filterOptions', resources.filterOptions, 'object', 'filter-options.json');
  assertShape('buildInfo', resources.buildInfo, 'object', 'build-info.json');

  return {
    machines: resources.machines,
    manufacturers: resources.manufacturers,
    modelYears: resources.modelYears,
    filterOptions: resources.filterOptions,
    buildInfo: resources.buildInfo,
    loadedFromGeneratedData: true,
    resourcePaths: { ...DEFAULT_RESOURCE_PATHS }
  };
}

// A record the interface cannot identify or label is skipped rather than allowed to break rendering.
export function isRenderableMachine(record) {
  return record !== null
    && typeof record === 'object'
    && !Array.isArray(record)
    && typeof record.machine_id === 'string'
    && record.machine_id.trim() !== ''
    && typeof record.machine === 'string'
    && record.machine.trim() !== ''
    && typeof record.manufacturer === 'string'
    && record.manufacturer.trim() !== '';
}

export function sanitizeMachines(records) {
  const seen = new Set();
  const usable = [];
  for (const record of records) {
    if (isRenderableMachine(record) && !seen.has(record.machine_id)) {
      seen.add(record.machine_id);
      usable.push(record);
    }
  }
  return { machines: usable, skipped: records.length - usable.length };
}
