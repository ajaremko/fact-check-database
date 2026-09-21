# Known Issues

## A prod destroy would permanently drop both BigQuery tables

**Error:** No error yet. As configured, `pulumi destroy` against the prod stack would delete both
the staging and curated `fact_checks` tables with no way to rebuild curated data afterward.
**Where:** `analysis:tableDeletionProtection` and `analysis:retainTablesOnDelete` both default to
`true` in `src/config.ts`, but both `Pulumi.dev.yml` and `Pulumi.prod.yml` — including prod —
explicitly override them to `false`. Compounding this, the curated dataset's loader
(`stagingToCuratedTransferJob`) is append-only: a `MERGE ... WHEN NOT MATCHED THEN INSERT` with no
update or delete branch, so there's no mechanism that would let curated data be reconstructed from
staging after the fact if staging is gone too.
**Root cause:** Unknown — may have been set this way for easier iteration during initial
development and never revisited for prod.
**Decision:** Leave as-is for now. Documented here so the risk is visible before anyone runs
`pulumi destroy` against a stack holding real analysis data, rather than discovered by doing it.
**If this ever needs to be fixed:** Set `analysis:tableDeletionProtection: true` and
`analysis:retainTablesOnDelete: true` in `Pulumi.prod.yml` (falling back to the code's own safe
defaults would also work — remove the overrides entirely).

## The curated table's schema is hand-duplicated rather than shared

**Error:** No error — a maintenance/drift risk.
**Where:** `src/curated-dataset/bigquery.ts` hand-writes the curated table's 18-field schema
inline, rather than importing a shared schema the way `src/staging-dataset/bigquery.ts` imports
`FactChecksTableDBSchema` from `@news-research/core-contracts/staging/v1`.
**Root cause:** The curated schema is a genuinely different, narrower shape than the staging
schema (a subset of fields, some renamed), so there's no existing shared schema that would fit
without changes — this isn't simply a copy-paste of the same shape.
**Decision:** Leave as-is. Introducing a shared "curated fact-check" contract is a design decision
affecting `core-contracts` or a new package, not something to do as part of a documentation pass.
**If this ever needs to be fixed:** If the curated shape stabilizes, consider defining it as a
proper schema in `core-contracts` (mirroring the staging table's pattern) so both this project and
any future consumer share one source of truth for the field list.
