# Known Issues

## Curated rows from before the 2026-09 identity change can be duplicated

**Error:** No error — a data-quality gap in historical rows.
**Where:** `analysis_curated.fact_checks`, rows curated before the pipeline switched to the
`fact_check_id` identity (source id + article URL; see
[docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md)). Those rows' `fact_check_sha256` column was renamed
from `content_lineage_id` during the same cutover and holds the same value.
**Root cause:** The earlier `MERGE` keyed fact checks on `source id + canonical URL (or feed URL) +
title` and did not deduplicate staging rows within a run, so it inserted one row per observation
and a new id whenever a title changed. The current `MERGE` computes ids differently, so it never
matches those older rows: each fact check that was already curated gets one additional,
current-scheme row next to its legacy rows. `research-infra`'s marts view reads the table as-is
and shows all of them.
**Decision:** Leave historical rows untouched for now. Staging only retains 7 days, so the older
rows can't be rebuilt from source; they can only be rewritten in place.
**If this ever needs to be fixed:** Run a one-off statement that recomputes `fact_check_id` from
the stored columns (`TO_HEX(SHA256(CONCAT(source_id, '|', canonical_url)))`, matching the
extractor's `factCheckId`; `link`/`guid` aren't stored in the curated table) and keeps the row with
the latest `fetched_at` per id. Rows with a null
`canonical_url` only have the feed URL, so they can only be grouped by `source_id + url + title`.
Snapshot the table first.
