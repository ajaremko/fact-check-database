import { stagingPathPrefix } from '@fact-check-database/core-contracts/staging/v1'

/**
 * Deterministic, content-addressable path for the full Markdown content of
 * a single extracted fact-check item, stored separately from the batch
 * NDJSON so downstream consumers with per-document size limits can read the
 * bounded preview from the row (`FactCheck.content`, via `contentPreview`
 * in `NormalizedText.ts`) and fetch the full text only when needed.
 *
 * Addressed by `fact_check.sha256` (already computed per item, already used
 * as the row's `id`) rather than by date/extraction run — identical content
 * re-fetched on a later poll hashes to the same path, so re-fetches don't
 * duplicate storage.
 *
 * Example path: `v1/type=fact_checks_content/sha256=<hash>.md`
 */
export function contentBlobPath(sha256: string): string {
  return `${stagingPathPrefix('fact_checks_content', 1)}/sha256=${sha256}.md`
}
