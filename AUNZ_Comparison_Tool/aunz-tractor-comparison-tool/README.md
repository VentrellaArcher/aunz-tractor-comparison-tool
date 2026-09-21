# AU/NZ Tractor Comparison Tool

Static GitHub Pages implementation of the AU/NZ tractor comparison product.

## Current milestone

This starter repository implements the complete CSV schema, validation, JSON generation, derived power-to-weight metrics, automated tests, GitHub Actions deployment, and a minimal proof page that loads generated data.

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
npm run dev
```

Open `http://localhost:4173`.

## Data source

`data-source/machines.csv` is the only manually maintained machine-data source. Generated JSON under `dist/data/` must not be edited manually.

## Power-to-weight

The build calculates hp/t and kW/t using Max HP and a clean scalar unladen weight. Ambiguous weight strings do not produce ratios.
