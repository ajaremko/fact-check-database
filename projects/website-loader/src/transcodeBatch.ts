import { Effect, ParseResult, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Ndjson from '@fact-check-database/core-data/Ndjson'
import { omitNullableKeys } from '@fact-check-database/core-data'
import { FactChecksTableRowSchema } from '@fact-check-database/core-contracts/staging/v1'
import {
  SearchResult,
  SearchResultSchema,
} from '@fact-check-database/website-contracts/search/v1'

/**
 * Limits every search record is held to before it is sent to the search
 * provider, which rejects a whole save when one record is too big.
 */
export interface SearchRecordLimits {
  /**
   * The longest summary kept, in characters. A longer summary is cut at the
   * last word boundary within the limit and ends in an ellipsis.
   */
  readonly summaryMaxLength: number
  /**
   * The largest record the search provider accepts, in bytes of serialized
   * JSON. A record still over it after its summary is cut is left out of the
   * batch and logged, so that it cannot fail the rest of the batch.
   */
  readonly recordMaxBytes: number
}

const decodeBatch = Schema.transformOrFail(
  FactChecksTableRowSchema,
  SearchResultSchema,
  {
    strict: true,
    decode: (input, _, __, encoded) =>
      ParseResult.succeed({
        objectID: input.fact_check_id,
        content_type: input.http.content_type,
        content_length: input.http.headers?.['content-length'],
        final_url: input.http.final_url,
        extracted_at: encoded.extracted_at,
        source_collection: input.source.collection,
        source_id: input.source.id,
        source_url: input.source.url,
        source_name: input.source.name,
        image_url: input.fact_check.image_url,
        canonical_url: input.fact_check.canonical_url,
        language: input.fact_check.language,
        link: input.fact_check.link,
        published_at_normalized: encoded.fact_check.published_at_normalized,
        published_at_raw: input.fact_check.published_at_raw,
        published_at_timestamp: input.fact_check.published_at_normalized
          ? Math.floor(
              input.fact_check.published_at_normalized.getTime() / 1000
            )
          : undefined,
        summary: input.fact_check.summary,
        title: input.fact_check.title,
        author: input.fact_check.author,
        categories: input.fact_check.categories,
      }),
    encode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Encoding Observation not implemented'
        )
      ),
  }
).pipe(
  Ndjson.parseNdjson(),
  Schema.mutable,
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSearchResults = SearchResultSchema.pipe(
  Schema.Array,
  Schema.mutable,
  Schema.encode
)

// The same rule as the extractor's article preview: cut at the last space
// within the limit, so that no word is split, and mark the cut with an
// ellipsis.
function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const sliced = text.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  const trimmed = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced
  return `${trimmed}…`
}

function capSummary(result: SearchResult, maxLength: number): SearchResult {
  return result.summary === undefined
    ? result
    : { ...result, summary: truncateAtWordBoundary(result.summary, maxLength) }
}

// The search provider measures a record as its serialized JSON
function serializedBytes(record: object): number {
  return new TextEncoder().encode(JSON.stringify(record)).length
}

function fitsRecordLimit(
  record: { readonly objectID: string },
  maxBytes: number
): Effect.Effect<boolean> {
  const bytes = serializedBytes(record)
  return bytes <= maxBytes
    ? Effect.succeed(true)
    : Effect.logWarning('Search record left out: over the size limit').pipe(
        Effect.annotateLogs({
          'record.objectID': record.objectID,
          'record.bytes': bytes,
          'record.maxBytes': maxBytes,
        }),
        Effect.as(false)
      )
}

/**
 * Decodes a staged NDJSON batch into search records, capping each summary
 * and leaving out any record still over the search provider's size limit.
 */
export function transcodeBatch(data: Uint8Array, limits: SearchRecordLimits) {
  return decodeBatch(data).pipe(
    Effect.map((results) =>
      results.map((result) => capSummary(result, limits.summaryMaxLength))
    ),
    Effect.andThen(encodeSearchResults),
    Effect.map((records) => records.map(omitNullableKeys)),
    Effect.andThen((records) =>
      Effect.filter(records, (record) =>
        fitsRecordLimit(record, limits.recordMaxBytes)
      )
    )
  )
}
