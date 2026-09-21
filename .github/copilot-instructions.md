# AU/NZ Tractor Comparison Tool

## Purpose

This repository contains the AU/NZ Tractor Comparison Tool, a static, data-driven web application for comparing published tractor specifications.

The product is intended to help approved users:

- identify tractors operating in a broadly comparable horsepower range;
- filter machines by relevant attributes;
- complete detailed side-by-side comparisons;
- review safe numeric differences where appropriate;
- copy, print and export comparison information;
- understand the source and review status of machine data.

The application is not a pricing tool, recommendation engine, authenticated portal or source of confidential benchmarking.

## Project roles

- Product owner and final approval: Archie Ventrella
- Project planning, scope and review: Product owner, supported by Microsoft 365 Copilot
- Primary code builder: GitHub Copilot in Visual Studio Code
- Source control and deployment: GitHub
- Hosting target: GitHub Pages

GitHub Copilot is the implementation assistant. It must follow the documented architecture and must not silently redesign the product, alter the data contract or expand the task scope.

## Required reading

Before making structural, data-contract, build, deployment or comparison-logic changes, review:

- `docs/Tractor_Comparison_Tool_GitHub_Project_Documentation.pdf`
- `docs/AUNZ_Tractor_Comparison_Tool_Technical_Implementation_v1.1.pdf`
- `README.md`
- `data-source/machines.csv`
- `scripts/schema.js`, when available
- relevant tests
- `legacy/current-tool.html`, when available

If a request conflicts with the project documentation, identify the conflict before implementing the change.

Do not assume that a general coding convention overrides an explicit project decision.

## Current implementation priority

The first implementation milestone is the complete data pipeline.

Do not rebuild or substantially refactor the full user interface until the following are working against the complete source CSV:

1. complete schema definition;
2. CSV parsing;
3. source-data validation;
4. complete CSV-to-JSON transformation;
5. derived power-to-weight calculations;
6. generated indexes and build metadata;
7. automated tests;
8. a small local page proving that the generated data loads correctly.

The initial milestone must prove the data contract before the existing interface is migrated.

Do not begin a later implementation stage unless the current task explicitly requests it. Complete only the requested scope, run the relevant checks and report the recommended next task.

## Non-negotiable data rules

### Single source of truth

`data-source/machines.csv` is the only manually maintained source of machine data.

Never:

- manually edit generated JSON to correct machine data;
- duplicate the machine catalogue in JavaScript;
- embed fallback machine records in the front end;
- modify the source CSV during validation or building;
- introduce another competing machine-data source without an approved architecture change;
- infer or invent a missing tractor specification.

Generated files are build artifacts, not source files.

### Complete field support

Every CSV column must be represented exactly once in `scripts/schema.js`.

The schema must define, as applicable:

- source column name;
- output property or output path;
- source type;
- required status;
- controlled values;
- display, filter, control or source-metadata classification;
- numeric-delta eligibility;
- missing-value behaviour.

Validation and transformation must import and use the same schema.

All display-relevant CSV fields must flow through to the generated machine records and remain available to the detailed comparison.

Do not reduce generated records to a small set of headline specifications.

### Record identity

One CSV row represents one:

- machine or configuration;
- model year;
- market.

`machine_id` is a permanent technical identifier.

Machine IDs must:

- be unique;
- use lowercase ASCII letters, numbers and hyphens only;
- remain stable after publication;
- include the machine identity, model year and market;
- avoid redundant brand tokens.

Do not reuse an ID for a different machine.

Do not change an existing published ID merely to improve its wording. If an ID must change, identify and update every reference in the same change.

A previous valid model-year record must not be overwritten when a new model year is added.

### Missing values

Treat the following source values as missing:

- blank
- `NA`
- `N/A`
- `No Data`
- `~`

Generated output for a missing value must be `null`.

Do not replace an unknown specification with zero, an estimate, a similar model's value or an AI-generated value.

### Numeric and descriptive values

Only convert a value to a JSON number when the schema identifies the field as numeric and the complete source value is a valid clean scalar number.

Preserve the complete source text when a value contains:

- options;
- ranges;
- qualifiers;
- configuration descriptions;
- multiple possible values;
- explanatory wording.

Do not extract a convenient number from descriptive text for comparison or calculation.

Pipe-separated helper fields must become trimmed arrays.

Examples:

- `Semi-powershift|CVT / IVT / EVT` becomes `['Semi-powershift', 'CVT / IVT / EVT']`
- `540E|540|1000E|1000` becomes `['540E', '540', '1000E', '1000']`

### Publication

Only records with `published = TRUE` belong in the public `machines.json`.

Records with `published = FALSE` must still be available to validation but must not appear in the published machine output.

Do not treat an unpublished record as invalid solely because it is unpublished.

## Derived power-to-weight metric

Power-to-weight is derived during the build.

It must not be added as a manually maintained CSV column.

### Formula

```text
powerToWeightHpPerTonne =
  (maxHp / unladenWeightKg) * 1000

powerToWeightKwPerTonne =
  powerToWeightHpPerTonne * 0.745699872
```

### Basis

- Power basis: `max_hp`
- Weight basis: `unladen_weight_kg`
- Primary unit: hp/t
- Secondary unit: kW/t
- Display precision: two decimal places

### Eligibility

Calculate the ratios only when both inputs are finite positive scalar numbers.

Do not calculate a ratio when the weight is:

- missing;
- zero or negative;
- a range;
- a list of configurations;
- qualified with descriptive text;
- otherwise not one clean scalar value.

Examples that must not produce a ratio:

```text
24639 (narrow), 25546 (wide)
8000 / 8900
```

Never silently select the:

- first value;
- lowest value;
- highest value;
- average value;
- most likely value.

An ineligible record must return null ratios and a machine-readable unavailable reason.

The generated derived object should include:

```javascript
{
  powerToWeightHpPerTonne: null,
  powerToWeightKwPerTonne: null,
  powerBasis: "maxHp",
  weightBasis: "unladenWeightKg",
  powerToWeightAvailable: false,
  powerToWeightUnavailableReason: "unladen_weight_not_scalar"
}
```

An eligible record should use the same object structure with calculated values, `powerToWeightAvailable: true`, and a null unavailable reason.

Do not imply that this calculation represents ballasted, loaded, operating or maximum permissible weight performance.

## Required generated outputs

The build must produce:

```text
dist/data/machines.json
dist/data/manufacturers.json
dist/data/model-years.json
dist/data/filter-options.json
dist/data/build-info.json
artifacts/validation-report.json
```

### `machines.json`

Must contain complete published machine records, including:

- identity;
- specifications;
- helper and filter data;
- source metadata;
- image metadata;
- derived metrics.

### `manufacturers.json`

Must be derived from published machine records.

Do not hard-code a manufacturer catalogue.

### `model-years.json`

Must contain unique published model years sorted newest first.

Do not hard-code model years.

### `filter-options.json`

Must be derived from published records and helper fields.

Do not hard-code filter values.

### `build-info.json`

Should include the documented build information, including:

- build date;
- source row count;
- published record count;
- version or commit reference where available;
- power-to-weight availability count.

### `validation-report.json`

Must contain structured errors, warnings and informational messages with source row context where applicable.

## Validation behaviour

Validation must:

1. verify the exact expected CSV header;
2. confirm every header has exactly one schema mapping;
3. report the original source row number;
4. validate required identity fields;
5. validate `machine_id` format and uniqueness;
6. detect duplicate record identity combinations;
7. validate publication and controlled values;
8. validate numeric values only according to schema rules;
9. validate pipe-separated helper fields;
10. validate image filename and alt-text pairing;
11. report source and optional-data quality warnings;
12. report derived-metric ineligibility without treating normal unavailability as a publication error;
13. write `artifacts/validation-report.json`;
14. exit with a non-zero status when blocking errors exist.

Validation must not silently repair serious identity, schema or publication errors.

Error messages should be actionable and identify:

- source row;
- field;
- invalid value where safe;
- reason;
- expected correction.

## Error and warning policy

### Blocking errors

Blocking errors include:

- unexpected or missing CSV headers;
- missing required identity fields;
- duplicate machine IDs;
- duplicate machine, model-year and market identities;
- invalid `published` values;
- invalid model years;
- invalid controlled values;
- malformed required helper data;
- image filename without alt text;
- invalid or empty generated public JSON;
- published records that cannot support mandatory relationship logic.

### Warnings or informational messages

Non-blocking messages may include:

- missing image;
- missing source information;
- missing optional specifications;
- missing lifecycle status;
- torque not available;
- non-AU market records in an AU-focused catalogue;
- legacy missing-value markers;
- derived power-to-weight unavailable;
- values outside configured expected ranges.

Do not convert ordinary optional-data gaps into blocking errors unless the documented data contract requires it.

## Front-end rules

The front end must use:

- vanilla HTML;
- CSS;
- modern JavaScript;
- ES modules;
- generated JSON;
- relative paths compatible with a GitHub Pages project URL.

Do not introduce a front-end framework unless the product owner explicitly approves an architecture change.

Do not connect the browser directly to a database.

Do not include write-capable credentials or tokens in the browser.

Do not embed stale fallback machine data.

### Required existing behaviour

The migrated application must preserve:

- machine selection;
- dynamic filtering;
- Max HP relationship bands;
- selected-machine pinning;
- relationship ordering by absolute Max HP difference;
- detailed side-by-side comparison;
- safe numeric deltas;
- copy;
- CSV export;
- print output;
- consistent missing-value display.

Use `legacy/current-tool.html`, when available, as the behavioural reference.

Do not modify the legacy file as part of the initial data-pipeline milestone.

### Display schema

`src/js/display-schema.js` must define:

- sections;
- labels;
- units;
- display order;
- blank behaviour;
- numeric-delta eligibility.

Every display-relevant CSV specification must have an appropriate display-schema entry.

Helper fields may support filters without appearing as duplicate specification rows.

Keep the following priority specifications visually prominent:

- Max HP;
- Max Torque;
- maximum permissible weight at 40 km/h;
- Top Speed.

### Numeric deltas

Calculate a delta only when both compared values are suitable clean scalar numbers and the field is marked as delta eligible.

Do not extract numbers from descriptive values to create a delta.

Only compare power-to-weight ratios when both generated ratios are available.

## Relationship logic

The first version uses Max HP relationship bands.

```text
lowerBound = selected.maxHp * (1 - percentage / 100)
upperBound = selected.maxHp * (1 + percentage / 100)
```

A candidate matches when its Max HP is within the selected bounds.

The selected machine remains pinned.

Unless the user applies another supported sort, results should be ordered by absolute Max HP difference.

Do not replace this behaviour with an AI recommendation or undocumented scoring system.

## Testing requirements

Every material change must include or update appropriate tests.

### Data and schema tests

Test that:

- every CSV header maps exactly once;
- every display field reaches generated JSON;
- every display field has a display-schema entry when the front end is implemented;
- helper fields become arrays or filter data correctly;
- missing markers become null;
- complex source values remain strings;
- duplicate IDs fail validation;
- invalid controlled values fail validation;
- unpublished records are excluded from public output;
- manufacturers and years are derived automatically;
- Massey Ferguson names and IDs do not gain a redundant `MF` token.

### Power-to-weight tests

Include at least this case:

```text
Max HP 443 and unladen weight 12700
Expected: 34.88 hp/t and 26.01 kW/t at display precision
```

Also test:

- missing Max HP;
- missing unladen weight;
- zero or negative weight;
- descriptive weight;
- multi-option weight;
- two valid comparison ratios;
- only one valid comparison ratio.

### Integration and regression tests

Test that:

- the complete CSV builds;
- generated JSON files parse;
- published record counts agree with source flags;
- generated records contain all required display keys;
- indexes agree with `machines.json`;
- relationship matching uses Max HP;
- relative paths work under a GitHub Pages project path;
- copy, export and print include visible derived data once implemented;
- the existing comparison behaviour remains intact after migration.

Run the full relevant check suite after implementation.

## Standard commands

The project should support:

```bash
npm run validate
npm run build
npm test
npm run dev
npm run clean
```

Expected meanings:

- `npm run validate`: validate source data and write the validation report;
- `npm run build`: validate, generate data and assemble the site;
- `npm test`: run unit, integration and regression tests;
- `npm run dev`: build and serve the local deployment artifact;
- `npm run clean`: remove generated output safely.

Do not claim a task is complete without reporting which commands were run and whether each command passed.

## Repository and generated-file rules

Preferred repository structure:

```text
.github/
assets/
artifacts/
data-source/
docs/
legacy/
scripts/
src/
tests/
dist/
package.json
package-lock.json
README.md
```

Keep generated output separate from source files.

Do not manually edit files under `dist/`.

Do not commit unnecessary editor caches, dependency folders or local temporary files.

Use `package-lock.json` and keep dependencies minimal.

Prefer built-in Node.js functionality where practical.

## GitHub and deployment rules

GitHub Actions should:

1. check out the approved commit;
2. install locked dependencies;
3. run tests;
4. validate the CSV;
5. build generated data;
6. assemble `dist`;
7. run smoke tests;
8. upload the deployment artifact;
9. deploy only after mandatory checks pass.

Pull requests must not deploy invalid data.

The main branch should be treated as the protected publishing branch.

Deploy only generated `dist` content.

Use relative application and asset paths.

Do not manually edit deployed JSON.

## Security and content boundaries

The GitHub Pages site uses an unlisted URL.

An unlisted URL is not authentication.

The repository and static application must not contain:

- customer data;
- personal information;
- pricing;
- margins;
- confidential benchmarking;
- passwords;
- access codes;
- API keys;
- tokens;
- private keys;
- connection strings;
- write-capable credentials;
- secrets in repository history.

Do not implement JavaScript passwords, client-side access codes or referrer checks and describe them as security.

If genuine authentication, private data, browser-based editing, user roles or server-side business logic become requirements, stop and identify that the architecture requires reassessment.

## Image rules

Machine images are optional.

Use approved images only.

Expected path pattern:

```text
assets/images/machines/<manufacturer-slug>/<machine_id>.webp
```

When `image_filename` is populated, `image_alt_text` is required.

When no approved image exists, use a neutral placeholder.

Do not block an otherwise valid machine record solely because it has no image.

Do not invent image rights or approval status.

## Coding standards

- Use clear modern JavaScript.
- Prefer small modules with explicit responsibilities.
- Use meaningful names.
- Avoid unnecessary abstraction.
- Keep dependencies minimal.
- Preserve source wording and trademark characters in displayed data.
- Prefer ASCII punctuation in code and configuration where practical.
- Use comments to explain important business rules, not obvious syntax.
- Keep functions testable.
- Avoid hidden mutation.
- Keep generated output deterministic.
- Do not include unrelated refactoring in a focused task.
- Do not replace documented behaviour merely because another approach is more fashionable.

## Change discipline

Make changes that are:

- small;
- reviewable;
- reversible;
- tested;
- clearly connected to the requested task.

Before writing code:

1. inspect the relevant files;
2. identify the requested objective;
3. identify any data-contract impact;
4. identify affected files;
5. check for conflicts with the documentation;
6. plan the validation and tests.

After writing code:

1. run the relevant commands;
2. inspect generated output where applicable;
3. summarise files changed;
4. summarise tests run;
5. report unresolved limitations;
6. avoid claiming completion if checks failed.

Do not continue into an unrelated project phase without an explicit instruction.

## Preferred response format

For each implementation task, respond using:

```text
Task objective:
Affected files:
Data-contract impact:
Implementation completed:
Validation and tests:
Backward-compatibility considerations:
Security considerations:
Result:
Unresolved limitations:
Recommended next task:
```

Be concise but specific.

If no files need to change, state that clearly.

If the requested task would create architectural debt or conflict with these instructions, explain the issue before proceeding.

## Current definition of done for the data pipeline

The initial data-pipeline milestone is complete only when:

- all CSV columns are represented in `scripts/schema.js`;
- `npm run validate` passes against the prepared source CSV;
- deliberate identity and schema errors fail clearly;
- `npm run build` creates every required JSON output;
- `machines.json` contains every display-relevant field;
- eligible power-to-weight values calculate correctly;
- ambiguous or descriptive weights do not produce a ratio;
- unavailable ratios contain an appropriate reason;
- duplicate and invalid IDs block the build;
- new manufacturers and years are discovered automatically;
- unpublished records are excluded from public machine output;
- complex source values remain unchanged;
- the source CSV is not modified;
- `npm test` passes;
- a small local test page loads the generated machine data.

The full interface migration is a later milestone.
