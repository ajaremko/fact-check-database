import { Array } from 'effect'

/**
 * The fields of a staging row that its dedup key is built from.
 */
interface StagingRowIdentity {
  readonly fact_check_id: string
  readonly ingestor_run_id: string
  readonly source: { readonly id: string }
}

/**
 * The staging dedup strategy: one row per fact check per fetch attempt
 * (`source.id` + `ingestor_run_id` identify the fetch attempt; see
 * `docs/fact-check-lifecycle.md`).
 *
 * A fact check re-seen by a later ingestor run is a new row — staging records
 * every fetch that saw it, and the curated dataset collapses them. To instead
 * keep one row per fact check per distinct feed body, key on `content_sha256`
 * in place of `ingestor_run_id`.
 */
export const stagingDedupKey = (row: StagingRowIdentity) =>
  `${row.source.id}|${row.ingestor_run_id}|${row.fact_check_id}`

/**
 * Drops rows that repeat a {@link stagingDedupKey} already seen in the batch,
 * keeping the first occurrence. Repeats within a batch are delivery artifacts
 * (a Pub/Sub message delivered twice) or a feed listing the same article
 * twice — not new observations.
 */
export function dedupeFactCheckRows<Row extends StagingRowIdentity>(
  rows: ReadonlyArray<Row>
): Array<Row> {
  const seen = new Set<string>()
  return Array.filter(rows, (row) => {
    const key = stagingDedupKey(row)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
