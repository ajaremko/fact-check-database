import { createHash } from 'node:crypto'

/**
 * The fields that identify a fact check, independent of its content.
 */
export interface FactCheckIdentity {
  readonly sourceId: string
  readonly sourceUrl: string
  readonly canonicalUrl: string | null
  readonly link: string | null
  readonly guid: string | null
  readonly title: string | null
}

/**
 * Computes `fact_check_id`: the identity of a fact check, stable across
 * fetches and across edits to its title, summary, or body.
 *
 * A fact check is identified by its source and its article URL — the first
 * non-null of `canonicalUrl`, `link`, `guid`. Only an item with none of those
 * falls back to the feed URL plus title, which is the one case where a title
 * edit changes the id.
 *
 * This is the single definition of fact-check identity (see
 * `docs/fact-check-lifecycle.md`); the curated dataset and the search index key on the
 * value written to staging rather than recomputing it.
 */
export function factCheckId(input: FactCheckIdentity): string {
  const articleKey =
    input.canonicalUrl ??
    input.link ??
    input.guid ??
    `${input.sourceUrl}|${input.title ?? ''}`
  return createHash('sha256')
    .update(`${input.sourceId}|${articleKey}`, 'utf8')
    .digest('hex')
}
