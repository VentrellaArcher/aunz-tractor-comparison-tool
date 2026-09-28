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
