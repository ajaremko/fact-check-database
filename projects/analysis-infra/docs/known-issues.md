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

## The curated MERGE has no tests

**Error:** No error. An untested rule.
**Where:** The SQL string in `src/curated-dataset/loader/transfer-job.ts`.
**Root cause:** The statement that decides what a curated row is lives inside a Pulumi program as an interpolated string. No test runs it, and changing it is an infrastructure deploy. It has only been checked by hand, against temporary tables in a BigQuery script.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Move the SQL into a module that takes the two table references and returns the statement. Add a test that runs it in a BigQuery script against temporary tables and asserts three things: one row per `fact_check_id`, a newer version replaces an older one, and a second run changes nothing.

## The curated columns are listed in three places

**Error:** No error. A drift risk.
**Where:** The table schema in `src/curated-dataset/bigquery.ts`, and the `INSERT` and `UPDATE SET` column lists in `src/curated-dataset/loader/transfer-job.ts`.
**Root cause:** Each list was written by hand. A column added to the table and not to the MERGE stays empty, and BigQuery reports nothing.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Define the curated columns once, with each one's staging expression, and build the table schema and both MERGE lists from that definition.

## Every MERGE run scans the whole curated table

**Error:** No error. A cost that grows with history.
**Where:** The join `ON T.fact_check_id = S.fact_check_id` in `src/curated-dataset/loader/transfer-job.ts`.
**Root cause:** The curated table is partitioned by month on `extracted_at`, but a fact check's row can be in any partition, so the join cannot prune. Four runs a day each read the full table while the new data per run stays flat.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Cluster the curated table on `fact_check_id` so the join reads only matching blocks. Measure bytes billed per run before and after.

## BigQuery datasets do not use the customer-managed key

**Error:** No error. A gap between the archive's protection and the datasets'.
**Where:** The staging and curated datasets in `src/`, and `bigQueryKey` in `core-infra/src/kms.ts`.
**Root cause:** `core-infra` provisions and exports a BigQuery encryption key, and no dataset references it. The archive is encrypted with a key the platform can revoke. The BigQuery data derived from it is encrypted with Google-managed keys, so revoking the archive key does not revoke access to staging or curated rows.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Set `defaultEncryptionConfiguration` on both datasets to the exported key and grant BigQuery's service agent `cryptoKeyEncrypterDecrypter` on it. Existing tables keep their old encryption until recreated or copied. Otherwise remove the unused key.

## No alerting on load or MERGE failures

**Error:** No error. Failures are silent.
**Where:** The whole stack. It provisions no `gcp.monitoring.AlertPolicy`.
**Root cause:** A failed scheduled-query run shows only in the Data Transfer run history. A batch that fails to load five times goes to the dead-letter bucket, which nothing reads.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Add alert policies for a failed transfer run and for any message published to the loader's dead-letter topic. The transfer config also accepts an email notification setting.
