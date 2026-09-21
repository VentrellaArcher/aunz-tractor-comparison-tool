# AU/NZ Tractor Comparison Tool

## Detailed Project Handoff and AI Continuation Brief

**Handoff date:** 21 September 2026  
**Repository:** `aunz-tractor-comparison-tool`  
**Product owner:** Archie Ventrella  
**Primary implementation assistant:** GitHub Copilot in Visual Studio Code  
**Planning, review and milestone control:** Product owner supported by Microsoft 365 Copilot  
**Source control:** GitHub  
**Target hosting model:** Static GitHub Pages application  
**Current overall status:** Core data pipeline, discovery, relationships, detailed comparison, copy, CSV export and print are implemented. Automated verification is strong. The current output milestone requires one final direct browser inspection of the downloaded CSV before formal approval.

---

# 1. Purpose of this document

This document is the authoritative project handoff for resuming work after a break. It is designed to be given directly to an AI coding assistant, especially GitHub Copilot in Visual Studio Code.

The continuation assistant must use this document alongside:

- `.github/copilot-instructions.md`
- both project documents in `docs/`
- the current repository source
- the current automated tests
- the current Git history and working-tree state
- `legacy/machine_spec_compare_tool2-4.html`, if present

This document records:

- what the product is;
- the approved architecture;
- non-negotiable data rules;
- completed milestones;
- implemented functionality;
- test and browser-verification status;
- current known limitations;
- current repository and Git considerations;
- the exact next verification task;
- future milestone order;
- instructions for safely continuing the build.

Do not treat this document as permission to bypass the repository instructions or project specifications. If this handoff conflicts with the checked-in project documentation, identify the conflict before changing code.

---

# 2. Product overview

The AU/NZ Tractor Comparison Tool is a static, data-driven web application for comparing published tractor specifications relevant to the Australian and New Zealand market.

The application is intended to help approved users:

- identify tractors operating in comparable horsepower ranges;
- search and filter the published machine catalogue;
- select a tractor and review machines within a Max HP relationship band;
- compare up to four machines side by side;
- inspect complete specifications rather than headline values only;
- review safe numeric differences without implying that higher or lower is better;
- review generated power-to-weight values where valid;
- copy, export and print the current comparison;
- retain source and review information for traceability.

The application is not:

- a pricing tool;
- a recommendation engine;
- an authenticated portal;
- a confidential benchmarking system;
- a sales-ranking engine;
- a substitute for verifying critical specifications against current official manufacturer material before external use.

---

# 3. Approved technical architecture

## 3.1 Application model

The tool is a static web application using:

- vanilla HTML;
- CSS;
- modern JavaScript;
- ES modules;
- generated JSON;
- Node.js build, validation and testing scripts;
- relative paths compatible with a GitHub Pages project URL.

No front-end framework or bundler has been approved or introduced.

## 3.2 Data flow

```text
data-source/machines.csv
        |
        v
schema-driven validation
        |
        v
schema-driven transformation
        |
        v
dist/data/*.json
        |
        v
runtime data loader
        |
        v
search, filters, relationships, comparison and outputs
```

## 3.3 Source-of-truth rule

`data-source/machines.csv` is the only manually maintained source of machine data.

Generated JSON is build output and must not be manually edited.

Front-end JavaScript must not contain a duplicate machine catalogue or fallback machine records.

## 3.4 Generated data outputs

The build produces:

```text
dist/data/machines.json
dist/data/manufacturers.json
dist/data/model-years.json
dist/data/filter-options.json
dist/data/build-info.json
artifacts/validation-report.json
```

`dist/` and `artifacts/` are generated and are ignored by Git in the current repository setup.

## 3.5 Repository instructions

The permanent Copilot instruction file is expected at:

```text
.github/copilot-instructions.md
```

The project also contains two reference documents under `docs/`:

```text
docs/AUNZ_Tractor_Comparison_Tool_Technical_Implementation_v1.1.pdf
docs/Tractor_Comparison_Tool_GitHub_Project_Documentation.pdf
```

---

# 4. Non-negotiable data rules

## 4.1 Machine records

One CSV row represents one machine or configuration, model year and market.

`machine_id` is the stable technical identifier.

Machine IDs must:

- be unique;
- use lowercase ASCII letters, numbers and hyphens only;
- remain stable after publication;
- include the machine identity, model year and market;
- not be reused for another machine.

## 4.2 Missing data

These source values are treated as missing:

```text
blank
NA
N/A
No Data
~
```

Generated output uses `null` for missing data.

The application must never replace missing data with:

- zero;
- an estimate;
- a similar model's value;
- an AI-generated value.

## 4.3 Numeric and descriptive values

A value may become a JSON number only when:

- the schema identifies the field as numeric; and
- the complete source value is a clean scalar number.

Ranges, options, qualifiers, configuration descriptions and multi-value text remain complete strings.

The application must not extract a convenient number from descriptive text for calculations or deltas.

## 4.4 Publication

Only rows with `published = TRUE` are included in public `machines.json`.

Unpublished records may still be validated but must not appear in the public machine output.

## 4.5 Power-to-weight

Power-to-weight is derived during the build, not maintained manually in the CSV.

Formula:

```text
powerToWeightHpPerTonne =
  (maxHp / unladenWeightKg) * 1000

powerToWeightKwPerTonne =
  powerToWeightHpPerTonne * 0.745699872
```

Basis:

- power: Max HP;
- weight: unladen weight in kilograms;
- display precision: two decimal places.

Calculation is allowed only when both inputs are finite positive scalar numbers.

Descriptive or multi-option weights do not receive a ratio. Examples:

```text
24639 (narrow), 25546 (wide)
8000 / 8900
```

The application must not select the first, minimum, maximum, average or assumed value from descriptive text.

---

# 5. Completed milestone 1: Data Pipeline

## 5.1 Implemented components

The pipeline includes:

- complete schema coverage in `scripts/schema.js`;
- CSV parsing;
- BOM handling;
- missing-value normalization;
- boolean and numeric parsing according to the schema;
- pipe-delimited helper-array handling;
- validation reporting;
- duplicate and invalid machine-ID rejection;
- duplicate record-identity rejection;
- invalid publication-value rejection;
- header-drift detection;
- CSV-to-JSON transformation;
- published-record filtering;
- machine, manufacturer, model-year and filter-option outputs;
- build metadata;
- power-to-weight generation;
- proof-page/build integration;
- source CSV integrity verification.

## 5.2 Key scripts and tests

Important files include:

```text
scripts/schema.js
scripts/data-utils.mjs
scripts/validate.mjs
scripts/build-data.mjs
scripts/dev-server.mjs
tests/build.test.js
tests/data-pipeline.test.js
```

## 5.3 Verified catalogue state

The latest reported runtime dataset contains:

- 316 source records;
- 316 published machine records;
- 9 manufacturers;
- 307 machines with available power-to-weight in the earlier verified build report.

Before relying on these counts in a future session, rerun the current build and inspect `dist/data/build-info.json`, because machine data may be updated later.

## 5.4 Known validation state

The latest reported validation run passed with:

- 0 blocking errors;
- 316 warnings;
- 0 informational messages.

The warnings were treated as non-blocking metadata or helper-field quality warnings. Do not suppress warnings merely to improve the report appearance.

---

# 6. Completed milestone 2: Front-End Foundation

## 6.1 Display schema

`src/js/display-schema.js` defines the visible comparison contract.

The verified implementation reported:

- 9 display sections;
- 39 display-field definitions;
- priority markers for:
  - Max HP;
  - Max Torque;
  - maximum permissible weight at 40 km/h;
  - Top Speed.

Display sections are ordered as:

1. Machine
2. Power and engine
3. Derived performance
4. Transmission and speed
5. Dimensions and weights
6. Hydraulics and hitch
7. Cab and capacities
8. PTO
9. Source and review

Helper-only fields are not duplicated as visible specification rows.

## 6.2 Runtime data loader

`src/js/data-loader.js` loads:

```text
./data/machines.json
./data/manufacturers.json
./data/model-years.json
./data/filter-options.json
./data/build-info.json
```

The loader:

- uses relative GitHub Pages-compatible paths;
- validates top-level response shapes;
- provides actionable resource-specific errors;
- uses injectable fetch behaviour for testing;
- does not embed fallback machine records;
- preserves complete machine objects.

## 6.3 Front-end foundation files

```text
src/index.html
src/css/styles.css
src/js/app.js
src/js/data-loader.js
src/js/display-schema.js
```

The diagnostic foundation has since been expanded into the functioning discovery, relationship, comparison and output application.

---

# 7. Completed milestone 3: Machine Discovery and Relationship Layer

## 7.1 Search

Search supports:

- machine name;
- manufacturer name;
- case-insensitive matching;
- trimmed input;
- an empty search as no restriction.

## 7.2 Filters

Implemented filters:

- manufacturer;
- model year;
- transmission helper tags;
- Top Speed;
- cylinders;
- rear PTO helper tags;
- market.

Active filters combine with AND logic.

Options are derived from generated runtime data and are not hard-coded catalogues.

## 7.3 Selection

Selection uses stable machine IDs.

Selection options come from the currently eligible filtered machines.

Invalid or no-longer-eligible selected IDs clear safely.

## 7.4 Relationship logic

Relationship bands currently supported:

```text
0%
5%
10%
15%
20%
```

Formula:

```text
lowerBound = selectedMaxHp * (1 - percentage / 100)
upperBound = selectedMaxHp * (1 + percentage / 100)
```

Behaviour:

- Max HP is the only relationship basis;
- bounds are inclusive;
- selected machine is pinned first;
- selected machine is not duplicated;
- candidates sort by absolute Max HP difference;
- ties sort deterministically by machine ID;
- machines with missing or invalid Max HP are excluded;
- zero percent returns exact-Max-HP matches.

## 7.5 Empty-results correction

The confirmed defect was that zero eligible machines displayed the generic `Select a machine` message.

The corrected behaviour displays:

```text
No eligible machines match the active search and filters.
```

The corrected state:

- reports `0 eligible machines`;
- clears ineligible selection;
- removes stale relationship rows;
- does not display `Select a machine`;
- restores the normal unselected state after Reset Filters.

## 7.6 Key files

```text
src/js/filters.js
src/js/relationships.js
src/js/app.js
src/index.html
src/css/styles.css
tests/filters.test.js
tests/relationships.test.js
tests/machine-discovery.test.js
```

---

# 8. Completed milestone 4: Detailed Side-by-Side Comparison Layer

## 8.1 Comparison state

`src/js/comparison.js` implements comparison state using stable machine IDs only.

Maximum comparison size:

```text
4 machines
```

Behaviour:

- Machine A is the baseline;
- relationship Compare action adds selected machine as Machine A;
- selected relationship candidate becomes Machine B;
- additional machines may be added up to four;
- duplicates are prevented;
- invalid IDs fail safely;
- remove preserves remaining order;
- clearing comparison removes compared IDs only;
- discovery filters and selected discovery machine remain intact after clear.

## 8.2 Comparison rendering

The comparison:

- uses `displaySchema`;
- renders all 9 display sections;
- renders all display-relevant fields;
- preserves full descriptive strings;
- displays `—` for missing values;
- keeps genuine zero distinct from missing;
- includes source and review information;
- includes derived performance;
- identifies priority fields;
- uses semantic table markup;
- supports horizontal access for wider comparisons.

## 8.3 Numeric deltas

Machine A is the baseline.

For each later machine:

```text
delta = candidate value - Machine A value
```

Deltas are shown only when:

- the display-schema field is delta eligible;
- both values are finite scalar numbers;
- neither value is descriptive, ranged or multi-option text.

Delta presentation is neutral and factual. It does not claim higher or lower is better.

## 8.4 Power-to-weight comparison

Power-to-weight uses generated derived values only.

A ratio delta is available only when both compared machines have valid generated ratios.

The browser does not parse visible weight text or recalculate from descriptive values.

## 8.5 Key files

```text
src/js/comparison.js
src/js/app.js
src/index.html
src/css/styles.css
tests/comparison.test.js
tests/comparison-integration.test.js
```

---

# 9. Implemented milestone 5: Copy, CSV Export and Print

## 9.1 Current milestone status

**Implementation status:** Completed  
**Automated verification:** Completed  
**Copy browser verification:** Completed  
**Print browser verification:** Completed  
**Actual downloaded CSV file inspection:** Still required  
**Formal milestone approval:** Partially verified pending final CSV browser inspection

Do not treat this milestone as formally closed until the actual downloaded CSV has been inspected in the browser and the remaining action-availability check has been completed.

## 9.2 Output module

`src/js/comparison-output.js` implements:

- a shared output model;
- structured plain-text generation;
- CSV generation;
- safe filenames;
- CSV download boundary;
- print boundary;
- availability handling.

## 9.3 Shared output model

The shared output model preserves:

- current comparison ID order;
- Machine A baseline;
- machine identity;
- all 9 display sections;
- display-schema fields;
- approved units;
- approved missing label;
- source and review data;
- derived performance;
- safe deltas;
- power and weight basis metadata.

## 9.4 Copy Comparison

Implemented Copy Comparison behaviour:

- disabled when comparison is empty;
- enabled when comparison exists;
- uses browser clipboard through a testable boundary;
- copies structured plain text;
- identifies Machine A as baseline;
- preserves machine order;
- includes all display sections;
- includes labels, values and units;
- includes safe deltas;
- includes source and review information;
- includes power-to-weight and basis information;
- contains no visible HTML markup;
- reports success through the accessible output status region;
- supports tested failure handling.

Browser copy verification passed. Clipboard failure was not reproducible because browser permissions were available, but automated rejection-path coverage exists.

## 9.5 CSV Export

Implemented CSV contract:

```text
Section
Specification
Unit
Machine value columns in comparison order
Applicable non-baseline delta columns
```

CSV implementation reportedly includes:

- UTF-8 text;
- CRLF line endings;
- RFC-style quote escaping;
- one row per display field;
- Machine A identified as baseline;
- source and review rows;
- derived-performance rows;
- missing values as `—`;
- descriptive values preserved;
- hidden helper fields excluded;
- application-control labels excluded;
- Blob-based download;
- temporary object URL;
- object URL revocation;
- deterministic filename:

```text
aunz-tractor-comparison-YYYY-MM-DD.csv
```

Formula-like untrusted text beginning with `=`, `+`, `@`, or a nonnumeric `-` is prefixed with an apostrophe. Legitimate numeric values and negative numeric deltas remain unchanged.

## 9.6 Print Comparison

Implemented print behaviour:

- direct browser print boundary;
- comparison-only print layout;
- comparison title retained;
- machine order retained;
- all display sections retained;
- safe deltas retained;
- derived power-to-weight and basis retained;
- source and review retained;
- discovery controls hidden;
- relationship controls hidden;
- comparison action buttons hidden;
- missing labels retained;
- no external print service;
- no application-generated PDF.

## 9.7 Output controls and status

Implemented controls:

```text
Copy Comparison
Export CSV
Print Comparison
```

The controls:

- are disabled for an empty comparison;
- become enabled when comparison exists;
- preserve filters;
- preserve selected discovery machine;
- preserve relationship results;
- preserve comparison order;
- report status through `#output-status`.

## 9.8 Key files

```text
src/js/comparison-output.js
src/js/app.js
src/index.html
src/css/styles.css
tests/comparison-output.test.js
tests/comparison-output-integration.test.js
```

---

# 10. Current automated verification status

The most recent report states:

```text
npm run clean     -> exit 0
npm test          -> exit 0, 83/83 tests passing
npm run validate  -> exit 0, 316 warnings, 0 errors
npm run build     -> exit 0
npm test          -> exit 0, 83/83 tests passing
```

All previous 70 tests remained passing after the output milestone.

The current test suite covers:

- data pipeline;
- validation failures and edge cases;
- generated output structure;
- source CSV integrity;
- front-end display schema;
- runtime data loading;
- search and filtering;
- machine selection;
- relationship calculations;
- empty-results handling;
- comparison state;
- comparison rendering;
- safe deltas;
- power-to-weight comparison;
- copy output;
- CSV generation and escaping;
- formula-injection protection;
- Blob download behaviour;
- print boundary and print CSS;
- output action availability;
- build integration;
- scope-boundary regression tests.

Never assume the suite is still at 83 tests after future work. Rerun `npm test` and report the current count.

---

# 11. Current browser-verification status

## 11.1 Confirmed passing in the browser

The latest reported smoke test confirmed:

- application loading;
- runtime data loading;
- search;
- all filters;
- combined AND filtering;
- Reset Filters;
- machine selection;
- relationship bands;
- selected-machine pinning;
- zero-eligible state;
- detailed comparison creation;
- add, remove and clear comparison;
- safe numeric deltas;
- generated power-to-weight display;
- Copy Comparison visibility and action;
- structured clipboard text;
- clipboard order, baseline, sections, units, deltas, source/review and basis;
- copy success announcement;
- Print Comparison invocation;
- print media visibility and hiding of controls;
- output action keyboard access;
- accessible labels and status;
- no browser-console errors.

## 11.2 Still pending

The actual CSV download must still be observed and inspected directly in the browser.

The previous browser harness did not expose the anchor download event, so several CSV items were reported using automated tests rather than direct file inspection.

One action-availability case also remains to be directly observed:

- with two machines compared, remove Machine B so one valid machine remains;
- confirm Copy, Export and Print remain enabled;
- remove the final compared machine;
- confirm all three actions become disabled.

Copy failure may remain `Not reproducible` if clipboard permission cannot safely be denied. Automated failure-path coverage already exists.

---

# 12. Immediate next task

Do not begin another feature milestone yet.

The next task is final browser verification of CSV export and output-action availability.

## 12.1 Required setup

1. Inspect repository and Git status before changing anything.
2. Ensure no stale development server remains on port 4173.
3. Run `npm run dev`.
4. Open the actual rendered application.
5. Create a two-machine comparison.

## 12.2 Required action-availability checks

Directly verify:

1. Copy Comparison is enabled with two machines.
2. Export CSV is enabled with two machines.
3. Print Comparison is enabled with two machines.
4. Remove Machine B.
5. Confirm all three actions remain enabled with one valid compared machine.
6. Remove the final compared machine.
7. Confirm all three actions become disabled.
8. Recreate a two-machine comparison.

## 12.3 Required actual CSV checks

Use the real Export CSV button and inspect the downloaded file directly.

Verify:

1. exactly one CSV file downloads;
2. filename matches `aunz-tractor-comparison-YYYY-MM-DD.csv`;
3. file is non-empty;
4. file is readable UTF-8 text;
5. first row includes Section, Specification and Unit;
6. machine columns preserve visible comparison order;
7. Machine A is identified as baseline;
8. at least one applicable delta column exists;
9. all 9 display sections are present;
10. source and review rows are present;
11. derived-performance rows are present;
12. hp/t and kW/t information appears where available;
13. missing values use `—`;
14. descriptive values containing commas remain one CSV cell;
15. quotes are correctly escaped where present;
16. hidden helper fields are absent;
17. application-control labels are absent;
18. row structure is not malformed;
19. export status is announced;
20. export does not change filters;
21. export does not change selected discovery machine;
22. export does not change comparison order.

If formula-like source text appears in the selected comparison, verify that it is protected. If it does not appear, record that case as `Not reproducible` and rely on the automated formula-protection test. Do not modify tractor data to manufacture the condition.

## 12.4 Required regression closeout

After the manual verification:

```bash
npm test
git status --short
```

Confirm:

- all 83 tests still pass, or report the current actual count;
- no production files changed during verification;
- source CSV has no Git diff;
- generated JSON has no unexpected Git diff;
- no commit or push occurred unless the product owner explicitly requested it.

## 12.5 Approval rule

The Copy, CSV Export and Print milestone becomes formally `VERIFIED` only when:

- the actual download succeeds;
- the downloaded CSV is readable and structurally correct;
- comparison order and baseline are correct;
- action availability updates correctly after removal;
- no blocking defect is found;
- the automated suite remains passing.

---

# 13. Current Git and repository state

## 13.1 Important history

During development, Git staging failed because of Windows path length and the repository's deep OneDrive location.

The issue was addressed by:

- confirming the correct repository root;
- enabling Git long-path support;
- creating `.gitignore`;
- ignoring `node_modules/`, `dist/`, `artifacts/`, `.env` and `.env.*`;
- placing the Copilot instructions at `.github/copilot-instructions.md`.

## 13.2 Last known clean baseline

Before later feature milestones, Git reported:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

However, later milestone reports explicitly stated that no commit or push occurred after implementing discovery, comparison and output work.

Therefore, before resuming, do not assume that current functionality is committed.

Run:

```powershell
git status --short
git log -5 --oneline
git diff --stat
git diff --cached --stat
```

The current working tree is expected to contain uncommitted milestone changes unless the user committed them after the latest report.

## 13.3 Do not lose the current work

Before broad new development:

1. complete the pending CSV browser verification;
2. inspect `git status --short`;
3. run the required tests;
4. commit the verified implementation;
5. push to GitHub;
6. confirm the working tree is clean.

A suitable commit message after final CSV verification is:

```text
Add verified discovery, comparison and output features
```

Do not commit `node_modules/`, `dist/`, `artifacts/`, secrets or temporary files.

---

# 14. Current expected source structure

The repository should broadly contain:

```text
.github/
  copilot-instructions.md

data-source/
  machines.csv

docs/
  AUNZ_Tractor_Comparison_Tool_Technical_Implementation_v1.1.pdf
  Tractor_Comparison_Tool_GitHub_Project_Documentation.pdf

legacy/
  machine_spec_compare_tool2-4.html

scripts/
  schema.js
  data-utils.mjs
  validate.mjs
  build-data.mjs
  dev-server.mjs

src/
  index.html
  css/
    styles.css
  js/
    app.js
    data-loader.js
    display-schema.js
    filters.js
    relationships.js
    comparison.js
    comparison-output.js

tests/
  build.test.js
  data-pipeline.test.js
  display-schema.test.js
  data-loader.test.js
  filters.test.js
  relationships.test.js
  machine-discovery.test.js
  comparison.test.js
  comparison-integration.test.js
  comparison-output.test.js
  comparison-output-integration.test.js

package.json
package-lock.json
.gitignore
README.md
```

Generated but ignored:

```text
dist/
artifacts/
node_modules/
```

The continuation assistant must inspect the actual repository rather than assuming this list is exhaustive.

---

# 15. Standard commands

Expected project commands:

```bash
npm run clean
npm test
npm run validate
npm run build
npm run dev
```

Expected meanings:

- `npm run clean`: remove generated output safely;
- `npm test`: run automated tests;
- `npm run validate`: validate the source CSV and write the validation report;
- `npm run build`: validate, generate data and assemble the static application;
- `npm run dev`: serve the built application locally, previously on port 4173.

Standard verification order:

```bash
npm run clean
npm test
npm run validate
npm run build
npm test
npm run dev
```

If port 4173 is in use, confirm that the process belongs to this project's `node scripts/dev-server.mjs` before stopping it.

---

# 16. Confirmed product behaviour

## 16.1 Discovery

- search by machine and manufacturer;
- seven filters;
- AND logic;
- stable ID selection;
- reset;
- derived filter options;
- 316 published runtime machines in the latest report.

## 16.2 Relationships

- Max HP only;
- 0%, 5%, 10%, 15%, 20%;
- inclusive bounds;
- selected machine pinned first;
- absolute Max HP difference sorting;
- machine-ID tie break;
- semantic result table;
- explicit empty-results state.

## 16.3 Comparison

- explicit Compare action;
- Machine A baseline;
- up to four machines;
- display-schema-driven rows;
- 9 sections;
- missing label `—`;
- safe scalar deltas;
- generated power-to-weight comparison;
- remove and clear;
- semantic and horizontally accessible table.

## 16.4 Outputs

- Copy Comparison;
- Export CSV;
- Print Comparison;
- shared output model;
- accessible output status;
- formula-protection logic;
- print-specific CSS;
- state preservation.

---

# 17. Known limitations and pending product work

The following work has not yet been completed or formally approved.

## 17.1 Immediate pending verification

- direct inspection of the actual downloaded CSV;
- direct output-button availability check after removing from two machines to one, then from one to zero;
- formal closure of the Copy, CSV Export and Print milestone;
- commit and push of all currently verified uncommitted work.

## 17.2 Future relationship enhancement

A future enhancement may add:

- 25%, 50% or 100% presets;
- a custom relationship-band input;
- controlled range validation;
- large-result handling.

This was discussed as a possible future edit but was explicitly deferred. Current bands remain unchanged.

## 17.3 Final visual styling

Final styling has not started.

Future styling should likely include:

- John Deere green `#367C2B`;
- John Deere yellow `#FFD700`;
- stronger hierarchy;
- polished filter panels;
- clearer selected-machine states;
- polished buttons and controls;
- responsive spacing and typography;
- sticky comparison headings where appropriate;
- refined empty, loading and error states;
- mobile and narrow-screen refinement;
- accessibility and contrast review;
- print refinement.

Styling must not change tested application behaviour.

## 17.4 Machine images

Machine-image support has not started.

Images must use approved sources and rights. Missing images must not block otherwise valid records.

## 17.5 Excel and PDF

Excel `.xlsx` export has not been implemented.

Application-generated PDF export has not been implemented.

The current Print action may allow a browser user to choose a PDF printer, but the application does not generate a PDF itself.

## 17.6 Deployment

GitHub Pages deployment automation has not been completed in the reported milestones.

Deployment must remain a separate controlled milestone and must preserve:

- relative paths;
- static output;
- test and validation gates;
- no secrets;
- no confidential data;
- deployment of built static content only.

## 17.7 Maintenance process

A future maintenance milestone should document:

- how to add or update machine rows;
- how to validate changes;
- how to resolve errors and warnings;
- how to run the build;
- how to review generated output;
- how to use branches and pull requests;
- how to release to GitHub Pages;
- how to roll back a release.

---

# 18. Recommended future milestone order

After the pending CSV verification, formal approval, commit and push:

## Milestone A: Visual design system and final styling

- approved John Deere palette;
- typography and spacing system;
- component states;
- discovery layout refinement;
- relationship table refinement;
- comparison layout refinement;
- responsive behaviour;
- accessibility review;
- regression tests and browser checks.

## Milestone B: Flexible relationship bands

- extra presets or custom input;
- 0 to 100 validation, if approved;
- large-result behaviour;
- tests and browser checks.

## Milestone C: Machine images

- approved image contract;
- placeholders;
- paths and alt text;
- responsive image loading;
- rights confirmation process.

## Milestone D: Optional Excel export

- separate decision on `.xlsx` requirements;
- no replacement of CSV unless explicitly approved;
- format and security tests.

## Milestone E: Deployment

- GitHub Actions validation and build;
- GitHub Pages deployment;
- project-path testing;
- release checklist;
- rollback procedure.

## Milestone F: Maintenance guide and release handover

- data update process;
- owner responsibilities;
- release process;
- troubleshooting;
- governance.

Do not combine all future milestones into one uncontrolled implementation task.

---

# 19. Instructions to the next AI assistant

The next AI assistant must:

1. read this handoff fully;
2. read `.github/copilot-instructions.md`;
3. inspect both documents in `docs/`;
4. inspect Git status and recent commits;
5. inspect current source and tests;
6. confirm the actual automated-test count;
7. confirm whether the development server is running;
8. complete the pending CSV browser verification before starting new feature work;
9. make no production-code changes unless verification finds a real defect;
10. avoid committing or pushing unless explicitly instructed by the product owner;
11. preserve the source CSV and generated-data contract;
12. preserve all verified milestones;
13. avoid broad refactoring;
14. report all changed files and checks;
15. stop after the requested task.

The next AI assistant must not:

- manually edit generated JSON;
- modify tractor data to manufacture a test case;
- infer missing specifications;
- suppress warnings without an approved reason;
- embed machine records in front-end code;
- add frameworks or bundlers;
- alter relationship formulas or bands without a dedicated approved task;
- alter the four-machine comparison limit without a dedicated approved task;
- implement Excel, PDF, images, styling or deployment while completing CSV verification;
- claim browser verification from automated tests alone.

---

# 20. Exact resume prompt for GitHub Copilot in Visual Studio Code

Attach this handoff file to GitHub Copilot Chat and send:

```text
Read the attached `AUNZ_Tractor_Comparison_Tool_Project_Handoff_2026-09-21.md` in full.

Also read:

- `.github/copilot-instructions.md`
- both project documents in `docs/`
- the current source, scripts and tests
- the current Git status and recent commit history

First report:

1. the current repository root;
2. the current branch;
3. `git status --short`;
4. the latest five commits;
5. the current automated-test count;
6. whether port 4173 has a project development server running;
7. whether the current source matches the handoff;
8. any conflict between the handoff and the repository.

Then complete only the immediate pending task in the handoff: direct browser verification of output-action availability and the actual downloaded CSV file.

Do not change production code unless a real defect is found.

Do not begin styling, images, deployment, Excel export, PDF generation or relationship-band enhancements.

Do not commit or push automatically.

Return the direct observations, final test result, Git status and a milestone judgment of VERIFIED, PARTIALLY VERIFIED or NOT VERIFIED.

Stop after the CSV verification report.
```

---

# 21. Final handoff summary

The project is well advanced and has a strong tested foundation.

Implemented:

- schema-driven data pipeline;
- validation and generated JSON;
- power-to-weight derivation;
- display schema;
- runtime loader;
- search and seven filters;
- Max HP relationship bands;
- detailed up-to-four-machine comparison;
- safe deltas;
- copy output;
- CSV generation;
- print layout;
- broad automated and browser testing.

Latest automation result:

```text
83/83 tests passing
```

Current blocker to formal milestone closure:

```text
Directly download and inspect the CSV in the browser, and verify action availability after removing compared machines.
```

After that:

1. rerun tests;
2. inspect Git status;
3. formally approve the output milestone;
4. commit and push verified work;
5. begin the next dedicated milestone, preferably final visual design and styling.

