# Known Issues

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

**Error:** No error. A cost that is negligible today.
**Where:** The join `ON T.fact_check_id = S.fact_check_id` in `src/curated-dataset/loader/transfer-job.ts`.
**Root cause:** The curated table is partitioned by month on `extracted_at`, but a fact check's row can be in any partition, so the join cannot prune. Each run therefore reads the full curated table. Measured on 2026-10-06, a run scanned about 77 MB in dev and under 1 MB in prod. Almost all of that is the 7-day staging window: the curated table was a few megabytes. Four runs a day at 77 MB is about 9 GB a month, which is a few cents on demand and inside BigQuery's free monthly allowance.
**Decision:** Won't fix. Clustering the curated table on `fact_check_id` was considered and would not reduce the scan. The MERGE joins on the id instead of filtering on it. The id is a hash, so each batch's ids are spread evenly across the table and touch nearly every storage block. And a table this small is a single block, with nothing to skip.
**If this ever needs to be fixed:** Revisit when the curated table reaches gigabytes, or when the MERGE's bytes billed start to matter, and measure a run first. The staging window is the larger lever: a shorter one scans less, at the cost of the catch-up safety the 7-day window gives a failed or skipped run. Clustering on `fact_check_id` helps a lookup of one fact check by id on a large table, not the MERGE.

## Prod's tables are not yet encrypted with the customer-managed key

**Error:** `pulumi up` on the prod stack fails to replace the two `fact_checks` tables, which have deletion protection.
**Where:** `encryptionConfiguration` on the staging and curated tables in `src/staging-dataset/bigquery.ts` and `src/curated-dataset/bigquery.ts`.
**Root cause:** A table's encryption key is fixed when the table is created, so adding one makes Pulumi replace the table. Dev's tables were recreated empty, which is fine there. Prod's curated table holds history that staging cannot rebuild, so it must not be recreated.
**Decision:** Not yet addressed. Do not deploy this stack to prod until the tables have been re-encrypted in place.
**If this ever needs to be fixed:** For each prod table, copy it onto itself with the new key (`bq cp -f --destination_kms_key=<key> <table> <table>`), then run `pulumi refresh` and confirm the preview shows no table replacement. Try the procedure on a scratch table first. Also confirm whether the research project's own BigQuery service agent needs a grant on the key to query the curated table through its view; dev is a single project and cannot show this.
