# AU/NZ Tractor Comparison Tool

Static GitHub Pages implementation of the AU/NZ tractor comparison product.

## Current milestone

This repository implements a deterministic CSV schema, validation, generated JSON, derived power-to-weight metrics, automated tests, a static proof page and GitHub Actions validation/build and Pages deployment workflows.

All machine data is human collected, human entered, human reviewed and human maintained. AI must never invent or populate tractor specifications. See [DATA_MAINTENANCE_GUIDE.md](docs/DATA_MAINTENANCE_GUIDE.md), [RELEASE_AND_ROLLBACK_GUIDE.md](docs/RELEASE_AND_ROLLBACK_GUIDE.md) and [MARKET_POLICY_DECISION_REQUIRED.md](docs/MARKET_POLICY_DECISION_REQUIRED.md).

## Requirements

- Git
- Node.js 20 or newer
- Visual Studio Code

## Run locally

```powershell
npm install
npm test
npm run validate
npm run build
npm run smoke
npm run dev
```

Open `http://localhost:4173`.

## Data source

`data-source/machines.csv` is the only manually maintained machine-data source. Generated JSON under `dist/data/` must not be edited manually.

Pull requests validate and build without deploying. A merge or manual run on `main` can deploy the generated `dist` artifact after tests, validation, build and smoke checks pass. GitHub Pages repository settings and a real live deployment still require external verification.

## Power-to-weight

The build calculates hp/t and kW/t using Max HP and a clean scalar unladen weight. Ambiguous weight strings do not produce ratios.

## Interface

The front end is plain HTML, one stylesheet and ES modules with no runtime dependencies.

- `src/js/app.js` wires events and rendering. Testable logic lives in `filters.js`, `state.js`, `results-model.js`, `comparison-model.js`, `comparison.js`, `comparison-output.js` and `url-state.js`. `view-*.js` build markup strings.
- Selections are kept in the address so a comparison can be shared, for example `?m=<machine_id>&c=<machine_id>,<machine_id>&band=15&diff=1`, and in `sessionStorage` for the current tab. Every value is validated against the loaded catalogue, so links to machines that were later removed are skipped with a notice.
- The interface only displays published values. Differences are neutral (each machine minus Machine A) and nothing is ranked, estimated or filled in.
- Discovery filters narrow which machines can be chosen as the primary machine; the Max HP results always draw on the complete published catalogue.
- `tests/design-system.test.js` guards colour contrast, touch targets, print rules and the absence of external resources.
