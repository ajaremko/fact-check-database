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

## `analysis:deployingServiceAccountEmail` is required but effectively unused

**Error:** No error — deployment succeeds with any value set, but the value does nothing.
**Where:** `src/config.ts` `require()`s this key. The only reference to it anywhere in `src/` is
inside a commented-out block in `staging-dataset/loader/subscription.ts`.
**Root cause:** Likely leftover from a feature that was implemented, then commented out, without
removing the now-unused config requirement.
**Decision:** Leave as-is. Removing a required config key changes this stack's deployment
contract and isn't a change to make as part of a documentation pass.
**If this ever needs to be fixed:** Either uncomment and finish whatever the commented-out block
in `subscription.ts` was building, or remove the config key from `config.ts` and both
`Pulumi.<stack>.yml` files together.

## The translation models bucket is provisioned but never wired to the translator service

**Error:** No error — an orphaned resource.
**Where:** `src/translation/storage.ts` provisions `translationModelsBucket` and grants the
translator service account `storage.objectViewer` on it, but `src/translation/service.ts` never
references the bucket — no volume mount, no environment variable pointing at it.
**Root cause:** Likely provisioned ahead of a "load custom models from GCS" feature that was
never finished.
**Decision:** Leave as-is. The running LibreTranslate instance uses only its bundled default
models; nothing currently depends on this bucket having content.
**If this ever needs to be fixed:** Either wire the bucket into the service (a GCS FUSE volume or
a startup step that syncs from it) if custom models are actually wanted, or remove the bucket and
its IAM grant if they're not.

## The translation service doesn't use the shared Artifact Registry pattern

**Error:** No error — an inconsistency with the rest of this project and its siblings.
**Where:** `src/translation/service.ts` hardcodes the public `libretranslate/libretranslate`
Docker Hub image, rather than resolving an image via `getImageUrl()` against core-infra's
Artifact Registry the way the staging loader (and every service in the sibling infra projects)
does. It still lists `cloudRunArtifactRegistryReader` as a `dependsOn`, which it doesn't actually
need since it never pulls from that registry.
**Root cause:** LibreTranslate is a third-party image, not one of this platform's own services
built and pushed to the shared registry, so there was nothing to resolve there in the first place.
**Decision:** Leave as-is — using the public image directly is reasonable for a third-party tool;
the unnecessary `dependsOn` is cosmetic.
**If this ever needs to be fixed:** Remove the unused `cloudRunArtifactRegistryReader` dependency
from `translatorService`'s resource options.

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
