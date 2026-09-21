import { Effect, flow, ParseResult, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'
import * as Ndjson from '@news-research/core-data/Ndjson'
import { omitNullableKeys } from '@news-research/core-data'
import { FactChecksTableRowSchema } from '@news-research/core-contracts/staging/v1'
import { SearchResultSchema } from '@news-research/website-contracts/search/v1'

const decodeBatch = Schema.transformOrFail(
  FactChecksTableRowSchema,
  SearchResultSchema,
  {
    strict: true,
    decode: (input, _, __, encoded) =>
      ParseResult.succeed({
        objectID: input.content_lineage_id,
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

export const transcodeBatch = flow(
  decodeBatch,
  Effect.andThen(encodeSearchResults),
  Effect.map((results) => results.map(omitNullableKeys))
)
