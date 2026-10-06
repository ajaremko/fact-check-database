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

**Error:** No error. A cost that grows with history.
**Where:** The join `ON T.fact_check_id = S.fact_check_id` in `src/curated-dataset/loader/transfer-job.ts`.
**Root cause:** The curated table is partitioned by month on `extracted_at`, but a fact check's row can be in any partition, so the join cannot prune. Four runs a day each read the full table while the new data per run stays flat.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Cluster the curated table on `fact_check_id` so the join reads only matching blocks. Measure bytes billed per run before and after.

## Prod's tables are not yet encrypted with the customer-managed key

**Error:** `pulumi up` on the prod stack fails to replace the two `fact_checks` tables, which have deletion protection.
**Where:** `encryptionConfiguration` on the staging and curated tables in `src/staging-dataset/bigquery.ts` and `src/curated-dataset/bigquery.ts`.
**Root cause:** A table's encryption key is fixed when the table is created, so adding one makes Pulumi replace the table. Dev's tables were recreated empty, which is fine there. Prod's curated table holds history that staging cannot rebuild, so it must not be recreated.
**Decision:** Not yet addressed. Do not deploy this stack to prod until the tables have been re-encrypted in place.
**If this ever needs to be fixed:** For each prod table, copy it onto itself with the new key (`bq cp -f --destination_kms_key=<key> <table> <table>`), then run `pulumi refresh` and confirm the preview shows no table replacement. Try the procedure on a scratch table first. Also confirm whether the research project's own BigQuery service agent needs a grant on the key to query the curated table through its view; dev is a single project and cannot show this.
