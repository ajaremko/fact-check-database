import { Effect, flow, ParseResult, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'
import * as Ndjson from '@news-research/core-data/Ndjson'
import { FactChecksTableRowSchema } from '@news-research/core-contracts'
import { SearchResultSchema } from '@news-research/website-contracts/search/v1'

const decodeBatch = Schema.transformOrFail(
  FactChecksTableRowSchema,
  SearchResultSchema,
  {
    strict: true,
    decode: (input, _, __, encoded) =>
      ParseResult.succeed({
        ObjectID: input.content_lineage_id,
        content_type: input.http.content_type,
        content_length: input.http.etag,
        final_url: input.http.final_url,
        extracted_at: encoded.extracted_at,
        source_collection: input.source.collection,
        source_id: input.source.id,
        source_url: input.source.url,
        source_name: input.source.name,
        canonical_url: input.fact_check.canonical_url,
        claim: input.fact_check.claim,
        language: input.fact_check.language,
        link: input.fact_check.link,
        published_at_normalized: encoded.fact_check.published_at_normalized,
        published_at_raw: input.fact_check.published_at_raw,
        summary: input.fact_check.summary,
        title: input.fact_check.title,
        verdict_normalized: input.fact_check.verdict_normalized,
        verdict_raw: input.fact_check.verdict_raw,
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

export const transcodeBatch = flow(
  decodeBatch,
  Effect.andThen(encodeSearchResults)
)
