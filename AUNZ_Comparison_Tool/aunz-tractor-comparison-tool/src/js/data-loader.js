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

export async function loadRuntimeData(fetchImpl = fetch) {
  const resources = {};

  for (const [key, resourcePath] of Object.entries(DEFAULT_RESOURCE_PATHS)) {
    const response = await fetchImpl(resourcePath);
    if (!response || !response.ok) {
      throw new Error(`Failed to load ${key} from ${resourcePath}: ${response?.statusText || 'Request failed'}`);
    }

    const payload = await response.json();
    resources[key] = payload;
  }

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
