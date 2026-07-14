import { ParseResult, Schema } from 'effect'

import { FactChecksTableRowSchema } from '@news-research/core-contracts/staging/v1'
import { SourceConfigSchema } from '@news-research/ingestion-contracts/config/v1'
import { omitNullKeys } from '@news-research/core-data'

import {
  NormalizedTextMediumSchema,
  NormalizedTextTinySchema,
  NormalizedTextXxlSchema,
  NormalizedTextSmallSchema,
} from './NormalizedText'
import { NumberFromDate } from './NumberFromDate'

export const FactCheckSchema = Schema.Struct({
  sha256: Schema.String,
  guid: Schema.NullOr(Schema.String),
  canonicalUrl: Schema.NullOr(Schema.String),
  title: Schema.NullOr(NormalizedTextMediumSchema),
  link: Schema.NullOr(Schema.String),
  author: Schema.NullOr(NormalizedTextSmallSchema),
  categories: Schema.NullOr(Schema.Array(Schema.String)),
  summary: Schema.NullOr(NormalizedTextXxlSchema),
  content: Schema.NullOr(NormalizedTextXxlSchema),
  language: Schema.NullOr(NormalizedTextTinySchema),
  enclosureUrl: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  publishedAtRaw: Schema.NullOr(NormalizedTextTinySchema),
  publishedAtNormalized: Schema.NullOr(Schema.instanceOf(Date)),
})

export type FactCheck = Schema.Schema.Type<typeof FactCheckSchema>

export const FactCheckRowSchema = Schema.transformOrFail(
  FactChecksTableRowSchema,
  Schema.Struct({
    id: Schema.String,
    observationId: Schema.String,
    ingestionId: Schema.String,
    extractionId: Schema.String,
    extractedAt: NumberFromDate,
    fetchedAt: NumberFromDate,
    factCheck: FactCheckSchema,
    extractor: Schema.Struct({
      id: Schema.String,
      version: Schema.Number,
    }),
    http: Schema.Struct({
      contentSha256: Schema.String,
      status: Schema.Number,
      finalUrl: Schema.NullOr(Schema.String),
      contentType: Schema.NullOr(Schema.String),
      etag: Schema.NullOr(Schema.String),
      lastModified: Schema.NullOr(Schema.String),
      headers: Schema.NullOr(
        Schema.Record({ key: Schema.String, value: Schema.String })
      ),
    }),
    source: SourceConfigSchema,
  }),
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding FactCheck not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        content_lineage_id: input.id,
        content_sha256: input.http.contentSha256,
        extracted_at: input.extractedAt,
        fetched_at: input.fetchedAt,
        ingestion_id: input.ingestionId,
        content_hash: input.http.contentSha256,
        extraction_id: input.extractionId,
        extractor_id: input.extractor.id,
        extractor_version: input.extractor.version,
        source: {
          id: input.source.id,
          name: input.source.name,
          collection: input.source.collection,
          url: input.source.url,
        },
        fact_check: omitNullKeys({
          sha256: input.factCheck.sha256,
          guid: input.factCheck.guid,
          canonical_url: input.factCheck.canonicalUrl,
          title: input.factCheck.title,
          author: input.factCheck.author,
          categories: input.factCheck.categories,
          summary: input.factCheck.summary,
          content: input.factCheck.content,
          language: input.factCheck.language,
          enclosure_url: input.factCheck.enclosureUrl,
          image_url: input.factCheck.imageUrl,
          link: input.factCheck.link,
          published_at_raw: input.factCheck.publishedAtRaw,
          published_at_normalized: input.factCheck.publishedAtNormalized,
        }),
        http: omitNullKeys({
          final_url: input.http.finalUrl,
          status_code: input.http.status,
          etag: input.http.etag,
          content_type: input.http.contentType,
          last_modified: input.http.lastModified,
          headers: input.http.headers,
        }),
      }),
  }
)

export type FactCheckRow = Schema.Schema.Type<typeof FactCheckRowSchema>

export const FactCheckRowsSchema = Schema.Array(FactCheckRowSchema)

export type FactCheckRows = Schema.Schema.Type<typeof FactCheckRowsSchema>
