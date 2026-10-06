# Known Issues

## Archive objects written before 2026-09 use the previous identity layout

**Error:** No error, until an old record is re-read — then a `ParseError`.
**Where:** `src/archive/v1/IngestionRecord.ts`, `SanitizerRecord.ts`, `ArchivePath.ts`, and the
objects already in the ingestion archive bucket.
**Root cause:** The v1 archive contracts were changed in place when the pipeline's identifiers were
redefined (see [docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md)). Older records carry
`content_lineage_id` and `ingestion_batch_id` fields and live under
`ingestion_id={run}/{observation hash}.yml|.bin` paths. Current records carry `ingestor_run_id`
and live under `ingestor_run_id={run}/fetch_attempt.yml` and `{content_sha256}.bin`. The sanitizer
and extractor only decode the current shape, so an older record replayed from the archive or a
dead-letter bucket fails to decode.
**Decision:** Accept it. The cutover drained every in-flight message before deploying, and nothing
reprocesses the archive routinely. The old objects stay readable as raw YAML and bytes for audit
purposes.
**If this ever needs to be fixed:** Write a one-off converter that rewrites old records into the
current shape and path (the `ingestion_batch_id` value becomes `ingestor_run_id`, and the raw
body's new name is the record's `content.sha256`), or add a decode branch that accepts both shapes.

## Archive paths and records can only be encoded

**Error:** `ParseResult.Forbidden` ("not implemented") when decoding.
**Where:** `src/archive/v1/ArchivePath.ts`, and the record transforms built on it in the ingestor, sanitizer and extractor.
**Root cause:** Each service only ever writes paths, so only the encode direction was written. Nothing in the repository can turn an archive path back into its source, date and `ingestor_run_id`.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Implement `decode` for `ArchivePathSchema` (the path layout is regular, so this is a parse of five segments). A replay tool or an audit of every fetch of one source needs it.
