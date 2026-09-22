# Known Issues

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
