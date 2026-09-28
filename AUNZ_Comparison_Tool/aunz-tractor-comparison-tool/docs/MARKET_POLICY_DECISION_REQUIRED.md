# Market Policy Decision Required

This document intentionally records an unresolved product decision. No Market data or policy was changed by this milestone.

## Current observed data

The current source CSV contains 316 rows and the current observed Market counts are:

- AU: 305
- UK: 6
- US: 5

The latest generated public catalogue contains the same 316 published rows. Current model identity and machine IDs include Market. The schema currently lists controlled values `AU` and `NZ`, while the source also contains `UK` and `US`; the validator does not currently block those observed values. This mismatch requires an explicit product-owner decision.

The current visible frontend does not expose a Market filter. Market remains available as source metadata and in comparison output.

## Decision required

The product owner must choose one policy:

1. AU/NZ-only publication: reject or unpublish non-AU/NZ rows and align schema, validation and documentation.
2. Multi-market catalogue: allow and document AU, NZ, UK and US (and any future approved markets), update controlled values and identity guidance.
3. Source metadata only: permit approved markets without filtering, but document why non-AU/NZ rows are retained.

## Impact and risks

- Changing controlled values can create validation failures for existing rows.
- Removing markets changes published counts and relationships.
- Retaining markets requires clear user-facing scope and market visibility.
- Machine IDs must remain stable if policy changes; do not silently rename them.
- The decision affects CSV maintenance, validation, indexes, discovery, comparison and release review.

Do not resolve this issue by editing the CSV or silently changing validation in a data workflow task.
