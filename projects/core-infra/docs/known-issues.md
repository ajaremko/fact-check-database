# Known Issues

Accepted, long-lived gaps and deferred fixes for `core-infra` — a decision log, not a bug
tracker. Each entry preserves why something wasn't fixed, so the next person doesn't redo the
investigation.

## Every staging load depends on one schema object in the bucket

**Error:** No error today. A single point of failure.
**Where:** `src/staging-storage/schema.ts` uploads `schemas/fact_checks_table_schema_v1.json` to the staging bucket. `analysis-loader` reads it before every load job.
**Root cause:** The loader takes its table schema from a bucket object so that it has no build-time dependency on the infrastructure that owns the table. The object is mutable and unversioned. An unscoped lifecycle rule once deleted it a day after each deploy, and every load failed until the rule was scoped to the batch prefix (see the comment in `src/staging-storage/storage.ts`).
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Either build the schema into the loader image from `core-contracts`, or keep the object and protect it: turn on object versioning for the `schemas/` prefix and alert when a load fails to read it.

## No recovery procedure for the archive encryption key

**Error:** No error. A missing runbook procedure.
**Where:** `gcsArchiveKey` in `src/kms.ts`, and [docs/runbook.md](./runbook.md), which covers rotation only.
**Root cause:** One key encrypts the whole ingestion archive. That is deliberate: disabling it is the platform's revocation switch. The same property makes it a single thing whose loss leaves the archive unreadable, and nothing documents how to restore a disabled or destroy-scheduled key version.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Add a runbook section covering: how to re-enable a disabled key version, how to restore one scheduled for destruction before the destruction completes, and who holds the role that can do either.
