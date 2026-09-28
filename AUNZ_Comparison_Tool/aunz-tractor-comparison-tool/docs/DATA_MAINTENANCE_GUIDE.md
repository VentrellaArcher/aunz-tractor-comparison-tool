# Human-Maintained Data Guide

> All machine data is human collected, human entered, human reviewed and human maintained. AI must never invent or populate tractor specifications.

## Source of truth

`data-source/machines.csv` is the only manually maintained machine-data source. Never edit `dist/data/*.json` or put machine records in frontend code.

Normal workflow:

1. A human edits `data-source/machines.csv` in GitHub or an approved local editor.
2. The human commits to a branch or opens a pull request.
3. GitHub Actions validates, tests, builds and smoke-tests the change.
4. A human reviews errors, warnings and the generated result.
5. The approved pull request is merged to `main`.
6. GitHub Pages deploys the validated static site.
7. A human verifies the live update.

## Row checklist

- Preserve the exact CSV header.
- Use a stable lowercase ASCII `machine_id` containing machine identity, model year and market.
- Do not reuse an ID for another machine.
- Use `TRUE` or `FALSE` for `published`.
- Use blank, `NA`, `N/A`, `No Data` or `~` only when the human source review confirms the value is unknown.
- Enter clean scalar numbers only in numeric fields.
- Keep ranges, options and qualifiers as complete descriptive text.
- Separate documented helper arrays with `|`.
- Provide source and review metadata where available.
- Provide image alt text whenever an image filename is entered.

## Existing-row edit

Edit only the human-reviewed value, preserve identity fields, run `npm run validate`, `npm run build`, `npm run smoke` and review the generated count and comparison behavior.

## New row and manufacturer

Add a complete human-reviewed row with a new stable ID. No manufacturer allowlist is required: manufacturers and model years are derived automatically from published rows. A new manufacturer checklist is:

- confirm the human source review and approval;
- choose a stable ID without redundant manufacturer tokens;
- enter all applicable fields without estimates;
- set `published` deliberately;
- run validation, tests, build and smoke;
- inspect discovery, relationships, comparison and outputs.

JCB onboarding is a data-entry checklist only. Do not add specifications until a human has collected, entered, reviewed and approved them.

## Derived values

Power-to-weight is calculated only from positive scalar Max HP and unladen weight. The build must never choose one value from a range or descriptive value.

## Commands

From `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool`:

```powershell
npm ci
npm test
npm run validate
npm run build
npm run smoke
npm run dev
```

`artifacts/validation-report.json` contains blocking errors, warnings and informational messages. Errors stop the build and deployment. Warnings require human review but are not automatically corrected.

## Never edit or commit

Never manually edit `dist/`, `artifacts/`, generated JSON, dependency folders, secrets or temporary fixtures. Never use AI or external enrichment to populate specifications.
