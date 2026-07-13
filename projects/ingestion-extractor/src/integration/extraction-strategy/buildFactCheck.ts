import { Effect, Option, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'

import { FactCheckSchema } from '../../app/FactCheck'

import { extractVerdict } from './verdict'

const decodeDate = Schema.decodeUnknownOption(Schema.Date)
const decodeFactCheck = Schema.decodeUnknown(FactCheckSchema)

/** Normalizes a parsed date string to a `Date`, or `null` if it doesn't parse. */
function parsePublishedAt(raw: string | null): Date | null {
  if (!raw) return null
  return Option.getOrNull(decodeDate(raw))
}

/** True for absolute http(s) URLs — used to decide whether a `guid`/`id` can double as a canonical URL. */
export function isUrlShaped(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

/** Normalizes a value that fast-xml-parser may return as a single item or an array of items. */
export function toArray<T>(
  value: T | readonly T[] | undefined
): T[] {
  if (value === undefined) return []
  return value instanceof Array ? [...value] : [value]
}

export interface FactCheckValues {
  guid: string | null
  link: string | null
  canonicalUrl: string | null
  title: string | null
  author: string | null
  categories: string[] | null
  summary: string | null
  content: string | null
  language: string | null
  verdictRaw: string | null
  publishedAtRaw: string | null
}

/**
 * Shared tail of both RssExtractor and AtomExtractor: hash the normalized
 * per-item values (for a stable content-lineage id) and decode them into a
 * FactCheck record. Decoding (rather than the unsafe `FactCheckSchema.make`)
 * is what applies NormalizedText's Unicode normalization/truncation to every
 * text field in one place. Feed-specific field mapping (which XML element
 * maps to which of these values) stays in each extractor; only this last
 * step is identical.
 */
export function buildFactCheck(values: FactCheckValues) {
  return Effect.gen(function* () {
    const sha256 = yield* Node.sha256Hex(JSON.stringify(values), 'utf-8')
    return yield* decodeFactCheck({
      sha256,
      guid: values.guid,
      canonicalUrl: values.canonicalUrl,
      title: values.title,
      link: values.link,
      author: values.author,
      categories:
        values.categories && values.categories.length > 0
          ? values.categories
          : null,
      summary: values.summary,
      content: values.content,
      language: values.language,
      verdictRaw: values.verdictRaw,
      verdictNormalized: extractVerdict(values.verdictRaw),
      publishedAtRaw: values.publishedAtRaw,
      publishedAtNormalized: parsePublishedAt(values.publishedAtRaw),
    })
  })
}
