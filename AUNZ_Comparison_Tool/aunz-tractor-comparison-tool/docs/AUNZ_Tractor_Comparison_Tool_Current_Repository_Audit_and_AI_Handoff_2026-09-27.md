# AU/NZ Tractor Comparison Tool - Current Repository Audit and AI Handoff

**Repository inspected:** `VentrellaArcher/aunz-tractor-comparison-tool`  
**Application root:** `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/`  
**Default branch:** `main`  
**Audit date:** September 27, 2026  
**Inspected repository commit:** `c60499473ba23b4a7746599daae9cb87499033f5`  
**Scope:** Read-only repository audit. No application code, tractor data, tests, workflows, documentation or repository structure was changed during the audit.

---

## 1. Executive summary

The AU/NZ Tractor Comparison Tool is a static, data-driven web application for comparing published tractor specifications relevant to the Australian and New Zealand market. It is intended for approved users who need to find machines in broadly comparable horsepower ranges, filter the catalogue, inspect Max HP relationships, compare detailed specifications, and copy, export or print results.

The repository contains a substantial implementation, including:

- schema-driven CSV parsing and validation;
- generated JSON data output;
- derived power-to-weight metrics;
- machine search and filtering;
- Max HP relationship results;
- detailed comparisons for up to four machines;
- safe numeric deltas;
- copy, CSV export and print functions;
- responsive styling and accessibility-oriented markup;
- a Node.js test suite with a committed report showing 99 passing tests.

The application is more advanced than the September 21, 2026 handoff in several areas, but the handoff is now stale. The repository does not contain a GitHub Actions workflow, does not contain tracked generated `dist/` output, and does not provide repository evidence that GitHub Pages deployment is operational.

Important discrepancies include:

- the current source supports relationship percentages `0, 5, 10, 15, 20, 30, 50, 100`, while the handoff documents only `0` through `20`;
- the current source has no Market filter, while the handoff says one exists;
- the current CSV contains 317 data rows by repository line count, while the handoff reports 316;
- the committed current test report shows 99 tests, while the handoff reports 83.

### Overall judgment: **Advanced prototype**

The application has a broad working feature set and strong automated verification, but it is not a release candidate because deployment automation, live deployment verification, release controls, current browser verification of CSV download behavior and controlled multi-manufacturer data-maintenance testing are not confirmed.

| Area | Judgment |
|---|---|
| Product functionality | Advanced prototype |
| Data pipeline | Substantially implemented |
| Frontend workflow | Substantially implemented |
| Automated tests | Strong repository evidence; latest committed report shows 99/99 passing |
| Browser verification | Partially documented; direct CSV inspection remains outstanding |
| GitHub Pages deployment | Not implemented in the repository |
| Data maintenance | Structurally ready, but not yet proven with a new manufacturer |
| Broader testing | Suitable for controlled internal testing, not broader release testing |

---

## 2. Product intent and boundaries

### Purpose

The tool is a static web application for comparing published tractor specifications relevant to Australia and New Zealand. The intended workflow is:

1. load published machine data;
2. search and filter machines;
3. select a baseline machine;
4. review machines within a Max HP relationship band;
5. compare up to four machines;
6. inspect specifications, derived power-to-weight values and safe numeric differences;
7. copy, export or print the comparison;
8. review source and review metadata.

### Intended users

The repository describes the users as approved users needing practical tractor comparison information.

The tool is not described as an authenticated portal. It is intended for static publication through GitHub Pages using an unlisted URL, but the project instructions explicitly state that an unlisted URL is not authentication.

### Supported use cases

- machine discovery;
- manufacturer and model-year filtering;
- transmission, Top Speed, cylinder and rear-PTO filtering;
- Max HP relationship analysis;
- side-by-side comparison of up to four machines;
- safe numeric deltas;
- power-to-weight display when valid;
- copy, CSV export and print;
- source and review traceability.

### Excluded use cases

The product is explicitly not:

- a pricing tool;
- a recommendation engine;
- an authenticated portal;
- a confidential benchmarking system;
- a sales-ranking engine;
- a database-backed application;
- a substitute for verifying critical specifications against current manufacturer material.

### Security boundaries

The static site must not contain customer data, personal information, pricing, margins, confidential benchmarking, passwords, access codes, API keys, tokens, private keys, connection strings or write-capable credentials.

Client-side passwords, access codes, referrer checks and unlisted URLs must not be described as authentication.

**Evidence:** `.github/copilot-instructions.md`; `docs/AUNZ_Tractor_Comparison_Tool_Project_Handoff_2026-09-21.md`.

---

## 3. Repository and application structure

### Repository root

```text
VentrellaArcher/aunz-tractor-comparison-tool/
```

### Application root

```text
VentrellaArcher/aunz-tractor-comparison-tool/
└── AUNZ_Comparison_Tool/
    └── aunz-tractor-comparison-tool/
```

### Important tree

```text
.github/
  copilot-instructions.md
.gitignore
AUNZ_Comparison_Tool/
└── aunz-tractor-comparison-tool/
    ├── README.md
    ├── package.json
    ├── package-lock.json
    ├── data-source/
    │   └── machines.csv
    ├── docs/
    │   ├── AUNZ_Tractor_Comparison_Tool_Project_Handoff_2026-09-21.md
    │   ├── AUNZ_Tractor_Comparison_Tool_Technical_Implementation_v1.1.pdf
    │   ├── Tractor_Comparison_Tool_GitHub_Project_Documentation.pdf
    │   └── copilot-instructions.md
    ├── legacy/
    │   └── machine_spec_compare_tool2-4.html
    ├── scripts/
    │   ├── schema.js
    │   ├── data-utils.mjs
    │   ├── validate.mjs
    │   ├── build-data.mjs
    │   └── dev-server.mjs
    ├── src/
    │   ├── index.html
    │   ├── css/styles.css
    │   └── js/
    │       ├── app.js
    │       ├── data-loader.js
    │       ├── display-schema.js
    │       ├── filters.js
    │       ├── relationships.js
    │       ├── comparison.js
    │       └── comparison-output.js
    ├── tests/
    │   ├── build.test.js
    │   ├── comparison-integration.test.js
    │   ├── comparison-output-integration.test.js
    │   ├── comparison-output.test.js
    │   ├── comparison-picker.test.js
    │   ├── comparison-presentation.test.js
    │   ├── comparison.test.js
    │   ├── data-loader.test.js
    │   ├── data-pipeline.test.js
    │   ├── display-schema.test.js
    │   ├── filters.test.js
    │   ├── machine-discovery-refinement.test.js
    │   ├── machine-discovery.test.js
    │   ├── relationship-table.test.js
    │   ├── relationships.test.js
    │   └── visual-design.test.js
    ├── build-check.log
    ├── build-report.txt
    ├── build-run-output.txt
    ├── test-check.log
    ├── test-report.txt
    ├── test-run-output.txt
```

### Required paths

| Requirement | Current location |
|---|---|
| Git repository root | `VentrellaArcher/aunz-tractor-comparison-tool/` |
| Node application root | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/` |
| `package.json` | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/package.json` |
| Source CSV | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/data-source/machines.csv` |
| Copilot instructions | `.github/copilot-instructions.md` |
| Source code | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/src/` |
| Tests | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/tests/` |
| Documentation | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/docs/` |
| Legacy reference | `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/legacy/` |
| Generated output | `dist/`, ignored by Git |
| Validation artifacts | `artifacts/`, ignored by Git |
| Workflows | No `.github/workflows/` directory was found |

### Structural observations

1. The nested application root means npm commands must be run from `AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/`.
2. Copilot instructions are duplicated at the repository root and under `docs/`.
3. Build and test logs are committed and may become stale.
4. Generated `dist/` and `artifacts/` output is ignored and is not present in the repository tree.
5. No GitHub Actions workflow directory is present.

No deletion is recommended solely on the basis of this audit.

---

## 4. Architecture and data flow

```text
machines.csv
    -> schema-driven validation
    -> schema-driven transformation
    -> derived power-to-weight calculations
    -> dist/data/*.json
    -> runtime data loader
    -> search, filters, relationships, comparison and outputs
    -> static deployment target
```

### Source of truth

`data-source/machines.csv` is the only manually maintained machine-data source. The frontend contains no duplicate machine catalogue or fallback records.

### Browser data source

The browser reads generated JSON, not the CSV. `src/js/data-loader.js` loads:

```text
./data/machines.json
./data/manufacturers.json
./data/model-years.json
./data/filter-options.json
./data/build-info.json
```

### Build process

`scripts/build-data.mjs`:

1. reads the CSV;
2. validates it;
3. writes `artifacts/validation-report.json`;
4. stops on blocking validation errors;
5. transforms rows;
6. calculates derived metrics;
7. writes generated JSON;
8. copies `src/` into `dist/`.

### Generated files

```text
dist/data/machines.json
dist/data/manufacturers.json
dist/data/model-years.json
dist/data/filter-options.json
dist/data/build-info.json
artifacts/validation-report.json
```

### Architecture gaps

- no GitHub Actions workflow assembles or deploys `dist/`;
- generated output is not tracked;
- no repository browser-test framework or browser workflow is present;
- build metadata version is hard-coded as `local-build`;
- `filter-options.json` contains a subset of filter metadata while the frontend derives additional options locally.

---

## 5. Source-data contract

### Current CSV size

The current repository CSV contains 317 data rows by visible line count. The September 21 handoff reports 316 source records, so the handoff count is stale or came from an earlier source state.

A current generated published count is **Not confirmed from the current repository inspection**, because generated output is ignored and absent.

### Schema coverage

`scripts/schema.js` defines the expected CSV header and maps every current column once. The committed tests include coverage for each CSV column mapping exactly once.

The schema covers identity, publication, market, lifecycle status, images, source metadata, model year, power, torque, transmission, helper fields, speed, dimensions, weights, hydraulics, hitch, engine, capacity and PTO fields.

### Identity fields

- `machine_id`;
- `machine`;
- `manufacturer`;
- `model_year`;
- `market`.

The validator also checks duplicate `machine + model_year + market` identities.

### Machine-ID rules

IDs must be unique, stable and match:

```regex
^[a-z0-9-]+$
```

The documented rule also requires machine identity, model year and market in the ID, without redundant brand tokens.

### Publication rules

`published` accepts `TRUE` or `FALSE`. Only `published === true` records are written to public `machines.json`. Unpublished rows remain available to validation.

### Missing values

The following become `null`:

```text
blank
NA
N/A
No Data
~
```

### Numeric and descriptive values

Only a clean scalar value in a numeric schema field becomes a JSON number. Ranges, options, qualifiers, configuration descriptions and explanatory values are not safely reduced to one number.

The implementation specifically protects values such as:

```text
24639 (narrow), 25546 (wide)
8000 / 8900
```

### Helper arrays

Pipe-separated fields are trimmed into arrays. Relevant helper fields include transmission and rear PTO tags.

### Source and review metadata

The schema includes:

- `source_url`;
- `source_title`;
- `last_reviewed_date`;
- `notes`.

Missing `source_url` currently produces a warning rather than a blocking error.

### Images

The schema includes `image_filename` and `image_alt_text`. An image filename without alt text is blocking. Missing images are intended to be non-blocking. No image asset directory was found.

### Controlled-value inconsistency

The schema lists market controlled values `AU` and `NZ`, while the current CSV visibly contains UK and US records. The validator does not visibly enforce all schema `controlledValues` generically.

**Risk:** High until the intended market policy is confirmed.

### Validation errors

Current validation visibly handles:

- missing or unexpected headers;
- duplicate columns;
- unknown headers;
- missing IDs;
- invalid IDs;
- duplicate IDs;
- duplicate record identities;
- invalid publication values;
- invalid model years;
- image filename without alt text.

The documented contract also lists other blocking conditions, including published records unable to support relationship logic, but those checks are not all visibly implemented in `validate.mjs`.

---

## 6. Derived metrics

Power-to-weight is generated during the build and is not a CSV column.

```text
powerToWeightHpPerTonne = (maxHp / unladenWeightKg) * 1000
powerToWeightKwPerTonne = powerToWeightHpPerTonne * 0.745699872
```

Basis:

- power: `max_hp`;
- weight: `unladen_weight_kg`;
- units: hp/t and kW/t;
- precision: two decimal places.

The calculation is eligible only when both values are finite, positive scalar numbers. Descriptive and multi-option weights produce unavailable ratios.

The generated object includes:

```javascript
{
  powerToWeightHpPerTonne,
  powerToWeightKwPerTonne,
  powerBasis: 'maxHp',
  weightBasis: 'unladenWeightKg',
  powerToWeightAvailable,
  powerToWeightUnavailableReason
}
```

The committed tests include the required example:

```text
443 hp / 12700 kg = 34.88 hp/t and 26.01 kW/t
```

The derived metric appears in relationships, detailed comparison, copy output, CSV output and print output.

A current limitation is that missing Max HP and invalid weight can share the reason `unladen_weight_not_scalar`, which is not fully diagnostic.

---

## 7. Current application functionality

### Machine discovery

The source implements:

- machine and manufacturer search;
- case-insensitive matching;
- keyboard-oriented suggestion behavior;
- stable-ID selection;
- manufacturer filtering;
- model-year filtering;
- transmission filtering;
- Top Speed threshold filtering;
- cylinder filtering;
- rear PTO filtering;
- Reset Filters and Clear Filters;
- eligible-machine count;
- active-filter summary;
- explicit empty-result behavior.

Top Speed thresholds are:

```text
30, 40, 50, 60, 70 km/h and up
```

The implementation uses `top_speed_kmh >= selected threshold`, not exact matching.

The current frontend does **not** include a Market filter. This conflicts with the September 21 handoff.

Empty results display:

```text
No eligible machines match the active search and filters.
```

### Max HP relationships

Current relationship percentages are:

```text
0%, 5%, 10%, 15%, 20%, 30%, 50%, 100%
```

The formula is:

```text
lowerBound = selected.maxHp * (1 - percentage / 100)
upperBound = selected.maxHp * (1 + percentage / 100)
```

Bounds are inclusive. The selected machine is pinned first and candidates are sorted by absolute Max HP difference, then machine ID.

The relationship table includes machine identity, Max HP deltas, power-to-weight, power, torque, transmission, speed, weight, hydraulics, hitch, engine, capacity and PTO fields.

The table implements internal vertical and horizontal scrolling, sticky headers, a sticky first column and keyboard focus treatment.

### Detailed comparison

- maximum of four machines;
- Machine A is the baseline;
- nine display sections;
- 39 display-field definitions according to project documentation and current schema structure;
- missing values display as `—`;
- descriptive values remain descriptive;
- numeric deltas use candidate minus Machine A;
- zero, positive and negative values are distinct;
- power-to-weight appears when generated values are available;
- remove and clear controls exist;
- direct comparison picker exists;
- horizontal scrolling is supported;
- status and focus behavior are implemented.

### Outputs

Copy Comparison generates structured plain text with machine order, baseline, sections, values, units, deltas, source and review data and power-to-weight basis.

CSV export provides:

- UTF-8 text;
- CRLF endings;
- quote escaping;
- machine columns in comparison order;
- applicable delta columns;
- safe filenames;
- Blob download;
- object URL revocation;
- formula-injection protection.

Filename format:

```text
aunz-tractor-comparison-YYYY-MM-DD.csv
```

Print output preserves comparison content while hiding discovery, relationship and action controls.

Direct browser inspection of the actual downloaded CSV remains outstanding according to the handoff. Automated CSV tests exist but do not alone prove browser download behavior.

### Visual design

The CSS uses John Deere-inspired green and yellow, neutral paper tones, visible focus outlines, responsive breakpoints at approximately 64rem, 48rem and 30rem, reduced-motion handling, sticky scrolling regions and print styles.

The stylesheet contains multiple layers of design tokens and overrides. This works as a current implementation but reduces maintainability.

---

## 8. Current test and verification position

### Test runner

The project uses Node.js built-in tests:

```json
"test": "node --test"
```

### Test files

There are 16 current test files covering:

- build;
- data pipeline;
- data loader;
- display schema;
- filters;
- machine discovery;
- relationships;
- comparison;
- comparison output;
- visual design;
- integration and regression scenarios.

### Test count

The committed `test-run-output.txt` reports:

```text
1..99
# tests 99
# pass 99
# fail 0
```

This is the latest committed report inspected, not a fresh execution during this audit. The handoff’s 83-test count is stale.

### Coverage

Automated tests cover:

- schema and CSV header mapping;
- missing-value handling;
- descriptive-value preservation;
- publication filtering;
- duplicate and invalid identity values;
- build output;
- source CSV integrity;
- power-to-weight calculations;
- generated data loading;
- search and filtering;
- Top Speed thresholds;
- empty-result behavior;
- relationship formulas and ordering;
- comparison state and limits;
- comparison rendering;
- safe deltas;
- copy, CSV and print output;
- CSV formula-injection protection;
- responsive and visual design contracts;
- keyboard and accessibility source hooks.

### Verification limitations

- no browser automation framework is present;
- no GitHub Actions workflow runs tests;
- actual browser CSV download inspection remains pending;
- current commands were not freshly executed during this audit;
- manual browser claims from the handoff remain documentation claims unless independently rerun.

---

## 9. Build commands and local workflow

Run commands from:

```text
AUNZ_Comparison_Tool/aunz-tractor-comparison-tool/
```

Commands:

```bash
npm install
npm run clean
npm test
npm run validate
npm run build
npm run dev
```

Actual scripts:

| Command | Behavior |
|---|---|
| `npm run clean` | Removes `dist/` and `artifacts/` |
| `npm test` | Runs `node --test` |
| `npm run validate` | Validates CSV and writes validation report |
| `npm run build` | Validates, generates JSON and copies `src/` into `dist/` |
| `npm run dev` | Serves `dist/` on port 4173 |

Local URL:

```text
http://localhost:4173
```

The server serves generated `dist/`, so run `npm run build` first.

---

## 10. GitHub Pages and deployment status

### Findings

1. No GitHub Actions workflow is present.
2. No workflow triggers are defined.
3. No workflow runs `npm ci`.
4. No workflow runs tests.
5. No workflow validates the CSV.
6. No workflow builds generated JSON.
7. No workflow assembles `dist/` for deployment.
8. No Pages artifact upload is present.
9. No Pages deployment step is present.
10. Mandatory deployment gates are not implemented.
11. A live Pages URL was not confirmed.
12. The repository branch metadata reports `main` as unprotected.
13. A CSV-only commit to `main` will not automatically rebuild and deploy the site based on current repository contents.

### Deployment judgment: **Not implemented**

The local build scripts support the intended deployment architecture, but the repository does not implement the required workflow or provide verified operational deployment evidence.

### Required external configuration

- GitHub Actions workflow;
- Pages source configured for Actions;
- workflow permissions;
- test, validation, build and smoke gates;
- artifact upload and deployment;
- branch protection for `main`;
- pull-request status checks;
- deployment verification;
- rollback guidance.

---

## 11. Data-update and maintenance workflow

The only normal manually maintained file should be:

```text
data-source/machines.csv
```

Generated files must not be edited manually:

```text
dist/data/*.json
artifacts/validation-report.json
```

Recommended local sequence:

```bash
git checkout -b data/update-description
cp data-source/machines.csv data-source/machines.csv.backup
npm run validate
npm test
npm run build
npm run dev
```

Then inspect `http://localhost:4173`.

New manufacturers, model years and filter options are intended to be discovered automatically from published rows. The browser does not edit data directly. Current deployment does not automatically publish a CSV-only commit because no workflow exists.

Validation failures produce a report and non-zero exit status. Builds also validate before generating public output.

---

## 12. JCB data-input readiness assessment

No JCB data was added during this audit.

### Readiness

| Requirement | Assessment |
|---|---|
| Dynamic manufacturer options | Yes |
| Manufacturer allowlist blocking JCB | None visible in frontend |
| Dynamic model years | Yes |
| Dynamic filters | Mostly yes |
| Stable JCB IDs | Supported if lowercase, unique and hyphenated |
| Publication rules | Supported |
| Images optional | Yes |
| Optional specs non-blocking | Intended, subject to validator coverage |
| Max HP for relationships | Required for relationship participation |
| Clean unladen weight | Required only for valid power-to-weight |
| Source/review metadata | Existing CSV fields support it |
| Ordinary JCB rows require code changes | No, if existing columns are sufficient |
| Automatic manufacturer tests | Present |

### Minimally valid published JCB row

A minimally valid published JCB row should provide:

- unique stable `machine_id`;
- deliberate `published` value;
- machine name;
- manufacturer;
- positive integer model year;
- approved market value;
- positive `max_hp` for relationship participation;
- correctly formatted values for any populated helper fields.

Optional values may remain missing, but missing source URLs create warnings, missing Max HP prevents relationship participation, and descriptive weights must not be converted into false scalar values.

### JCB checklist

1. Create a branch.
2. Back up the CSV.
3. Add rows using the current header exactly.
4. Use unique stable IDs.
5. Set model year and market deliberately.
6. Set `published` deliberately.
7. Retain full descriptive values.
8. Provide Max HP where relationship participation is required.
9. Provide clean unladen weight only when a valid power-to-weight ratio is expected.
10. Provide source title, URL and review metadata where required or recommended.
11. Run `npm run validate`.
12. Inspect warnings and errors.
13. Run `npm test`.
14. Run `npm run build`.
15. Verify JCB in manufacturers, filters, discovery, relationships and comparison.
16. Inspect generated counts and JSON.
17. Commit through the approved Git workflow.
18. Verify deployment only if deployment is operational.

Before the test, resolve the market contract inconsistency: the schema lists AU/NZ while the CSV contains UK/US values.

---

## 13. Git and release position

- default branch: `main`;
- branch protection: not confirmed and metadata reports `main` as unprotected;
- recent commits include data-pipeline, discovery, comparison, output and visual-design work;
- generated `dist/` and `artifacts/` are ignored;
- `node_modules/` is ignored;
- no release/tag strategy is visible;
- no pull-request template was found;
- no automated PR checks are visible;
- no formal rollback guidance was found;
- the September 21 handoff is stale relative to later commits.

The repository history shows recent commits through September 24, 2026, including `c604994` (`front end developed with some fixes`).

---

## 14. Documentation assessment

### Current strengths

- root Copilot instructions are comprehensive;
- README gives basic setup and source-of-truth guidance;
- project handoff provides useful historical context;
- both required project PDFs are present.

### Stale or missing areas

- handoff test count is stale;
- handoff source count is stale;
- handoff relationship options are stale;
- handoff Market-filter description conflicts with current source;
- no complete maintainer guide;
- no verified deployment guide;
- no contribution guide;
- no formal release or rollback guide;
- no dedicated troubleshooting guide;
- duplicated Copilot instructions can diverge.

The contents of the PDFs were not fully confirmable through the available GitHub file interface.

---

## 15. Security, privacy and governance

### Confirmed strengths

- static-site architecture;
- no database credentials or server secrets in inspected source;
- no external runtime API dependency identified;
- minimal dependency footprint;
- formula-injection protection for CSV export;
- source and review metadata fields exist;
- no customer, pricing or confidential benchmark data identified in inspected files.

### Not confirmed

- complete secret scan of all Git history;
- image-rights approval status;
- live deployment security configuration.

### Risks

| Severity | Risk |
|---|---|
| Blocking | GitHub Pages deployment pipeline absent |
| High | Market contract inconsistent with current CSV |
| High | Generic schema controlled-value enforcement not visible |
| Medium | Handoff contains stale facts |
| Medium | Direct browser CSV verification outstanding |
| Medium | Generated output is ignored and not deployed automatically |
| Low | Duplicate Copilot instructions |
| Low | Committed logs may become stale |
| Informational | No release/tag/rollback strategy |

---

## 16. Code-quality assessment

### Confirmed strengths

- clear module boundaries;
- stable-ID state management;
- schema-driven transformation and display;
- no frontend catalogue duplication;
- deterministic relationship ordering;
- safe CSV export handling;
- accessibility-oriented markup;
- native Node.js and browser APIs with no external dependencies.

### Confirmed defects or inconsistencies

1. Deployment workflow is absent.
2. Market controlled-value rules conflict with current data.
3. Generic controlled-value validation is incomplete or not visible.
4. Handoff relationship options do not match current source.
5. Power-to-weight unavailable reasons are not fully granular.
6. CSS contains layered and duplicated design-system definitions.
7. Build version is `local-build` rather than a commit or release reference.

### Improvement opportunities

- implement deployment automation;
- resolve and test market policy;
- add generic controlled-value validation;
- update the handoff;
- write a maintainer guide;
- consolidate CSS;
- add browser smoke automation;
- improve build version metadata;
- document release and rollback procedures.

---

## 17. Current gaps and remaining work

### Must complete before deployment

1. Implement GitHub Pages Actions deployment.
2. Resolve the market contract.
3. Add complete controlled-value validation.
4. Run a fresh full verification suite.
5. Complete direct browser CSV-download verification.
6. Verify the built `dist/` site locally.

### Should complete soon after deployment

1. Run the controlled JCB data-input test.
2. Update the project handoff.
3. Create a complete maintainer guide.
4. Add release and rollback guidance.
5. Verify that a CSV-only commit updates the live site.

### Useful future enhancements

- browser smoke automation;
- approved image handling;
- more precise power-to-weight unavailable reasons;
- CSS consolidation;
- optional Excel-compatible export;
- configurable relationship bands, subject to approval;
- Market filtering only after market policy is resolved.

### Optional experiments

- Excel export;
- expanded relationship-band configuration;
- image asset pipeline;
- versioned data releases.

No feature should be added merely because it is fashionable or common in other products.

---

## 18. Independent reviewer brief for Claude or another AI

You are reviewing the AU/NZ Tractor Comparison Tool repository.

### Product goal

This is a static data-driven web application for comparing published tractor specifications relevant to Australia and New Zealand. Users search and filter machines, inspect Max HP relationships, compare up to four machines, review safe numeric differences, view valid power-to-weight ratios, and copy, export or print results.

### Strict architecture

```text
data-source/machines.csv
    -> scripts/schema.js
    -> scripts/data-utils.mjs
    -> scripts/validate.mjs
    -> scripts/build-data.mjs
    -> dist/data/*.json
    -> src/js/data-loader.js
    -> src/js/app.js
```

The CSV is the only manually maintained source. The browser reads generated JSON. Do not introduce a framework, database, replacement source or fallback catalogue without explicit approval.

### Strict data rules

- preserve complete descriptive values;
- convert only clean scalar numeric values;
- convert missing markers to `null`;
- use stable lowercase hyphenated IDs;
- include machine identity, model year and market in IDs;
- exclude unpublished rows from public output;
- do not invent specifications;
- do not edit generated JSON manually;
- do not select one value from ambiguous ranges or options.

### Business rules

Power-to-weight is:

```text
(max_hp / unladen_weight_kg) * 1000
```

with kW/t calculated using `0.745699872`, only for positive scalar inputs.

Relationships use inclusive Max HP bands and sort by absolute Max HP difference. Machine A is the comparison baseline. Comparisons are limited to four machines. Numeric deltas are neutral and only use eligible scalar fields.

### Current functionality

Search, manufacturer/model-year/transmission/Top Speed/cylinder/rear-PTO filtering, reset behavior, empty-state handling, relationships, detailed comparison, copy, CSV export and print are implemented.

Current source discrepancies to review:

- relationship percentages are `0, 5, 10, 15, 20, 30, 50, 100`;
- Market filtering is absent;
- CSV contains UK/US market values while schema controlled values list AU/NZ.

### Current tests

There are 16 test files. The committed report shows 99 passing tests. Do not rely on that count without rerunning `npm test`.

### Deployment

No `.github/workflows/` directory exists. GitHub Pages deployment is not implemented or verified. Do not claim the site is live.

### Review instructions

Evaluate:

1. architecture quality;
2. data-contract safety;
3. frontend usability;
4. relationship logic;
5. comparison experience;
6. accessibility;
7. visual design;
8. CSV/export safety;
9. test coverage;
10. deployment readiness;
11. maintainability;
12. scalability for more manufacturers and model years;
13. JCB onboarding readiness;
14. highest-value improvements.

Do not invent machine specifications. Do not replace the CSV source of truth. Do not manually edit generated JSON. Do not redesign without evidence. Do not infer confidential data. Distinguish defects from preferences. Propose small, testable milestones. Preserve John Deere publicly stated facts and source traceability.

---

## 19. Recommended next action

### Complete GitHub Pages deployment

This is the best next action because the application and data pipeline are already substantial, but the deployment layer required by the architecture is absent.

Deployment completion evidence must include:

1. a workflow under `.github/workflows/`;
2. locked dependency installation;
3. passing tests;
4. CSV validation;
5. generated JSON build;
6. `dist/` assembly;
7. smoke checks;
8. Pages artifact upload;
9. deployment only after mandatory checks;
10. confirmed live Pages URL;
11. successful CSV-only update verification;
12. failed-validation deployment prevention;
13. branch protection or equivalent publishing controls;
14. rollback documentation.

---

## 20. Final repository judgment

### Current product maturity

**Advanced prototype.** The repository contains a coherent static application with a broad workflow, schema-driven data pipeline, detailed comparison functionality, output generation, responsive styling and strong automated test evidence.

### Data-update readiness

**Structurally ready, operationally unproven.** Dynamic manufacturer discovery, model-year derivation and stable IDs support adding JCB without ordinary code changes, but the workflow has not been proven with a new manufacturer and market validation is inconsistent.

### Deployment readiness

**Not ready.** No GitHub Actions workflow or verified live Pages deployment was found.

### Testing confidence

**High for automated source and behavior contracts; moderate for browser behavior.** The committed report shows 99/99 passing tests, but the suite was not freshly executed during this audit and direct CSV download inspection remains pending.

### Usability confidence

**Moderate to high.** Search, filters, relationships, comparison, outputs, responsive styling and accessibility hooks are present. Confidence is reduced by the lack of current browser rerun and documentation/source discrepancies.

### Maintenance confidence

**Moderate.** The CSV source-of-truth rule and build sequence are clear, but a maintainer guide, deployment automation, market-policy resolution and controlled JCB test are still required.

### Most important risk

**Blocking:** The repository does not implement the GitHub Pages deployment pipeline required to turn CSV changes into a verified public site update.

### Most important strength

The strongest feature is the combination of a single CSV source of truth, schema-driven transformation, preservation of descriptive source values, generated derived metrics, stable-ID comparison state, safe numeric deltas and broad automated regression coverage.

### Next decision required from the product owner

The product owner should decide and document:

1. whether UK and US rows are valid in the AU/NZ catalogue;
2. whether Market filtering is required;
3. whether all current relationship bands are approved;
4. whether GitHub Pages deployment should be implemented now;
5. whether the controlled JCB test should follow deployment configuration.

**Final judgment:** The repository is an advanced, well-tested prototype with a credible data and comparison foundation, but deployment governance and maintenance verification must be completed before it can be treated as a release candidate.
