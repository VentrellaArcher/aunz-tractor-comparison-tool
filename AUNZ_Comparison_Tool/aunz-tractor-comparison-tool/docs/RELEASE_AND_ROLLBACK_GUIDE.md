# Release and Rollback Guide

## Release path

Changes to human-maintained CSV data or application code are reviewed in a pull request. Pull requests run `validate-and-build.yml`; they do not deploy. Only an approved merge to `main` can run `deploy-pages.yml`.

The deployment workflow installs locked dependencies, runs tests, validates the CSV, builds the inner application and smoke-tests `dist`. Only the validated `dist` directory is uploaded to GitHub Pages.

Before enabling Pages externally, configure the repository Pages source to GitHub Actions and confirm the `github-pages` environment policy. This repository has not independently verified a live Pages URL, so deployment is not yet claimed operational.

## Verification

Record the commit SHA, workflow run, build version in `dist/data/build-info.json`, validation report and live-site result. Confirm the live site loads relative assets and shows the expected published count.

## Rollback

1. Identify the deployed commit and the failing change.
2. Revert the approved commit in a new pull request.
3. Wait for validation, test, build and smoke checks to pass.
4. Merge the revert to `main`.
5. Confirm the new Pages deployment and published count.

Never repair a deployed JSON file manually. Rollback is a source-control operation that regenerates the complete site from the approved CSV and code.

## Failure diagnosis

- Validation error: inspect `artifacts/validation-report.json` and correct the human source or schema change through review.
- Test failure: inspect the failing test; do not weaken it to permit invalid data.
- Build failure: inspect the deterministic build output and environment.
- Smoke failure: inspect missing files, paths, indexes or count mismatch.
- Pages failure: inspect the workflow artifact, Pages environment and repository settings.

An unlisted URL is not authentication. The static site must not contain confidential data or credentials.
