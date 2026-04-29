import { ParseResult, Schema } from 'effect'

import * as v1 from '../../contracts/v1'
import { NumberFromDate } from '../../data'
import { stripNullValues } from '../../util'

export class FactCheck extends Schema.Class<FactCheck>('FactCheck')({
  sha256: Schema.String,
  title: Schema.NullOr(Schema.String),
  claim: Schema.NullOr(Schema.String),
  verdict: Schema.NullOr(Schema.String),
  link: Schema.NullOr(Schema.String),
  normalizeVerdict: Schema.NullOr(
    Schema.Literal('true', 'false', 'misleading', 'unsupported', 'exaggerated')
  ),
  summary: Schema.NullOr(Schema.String),
  publishedAt: Schema.NullOr(Schema.String),
  canonicalUrl: Schema.NullOr(Schema.String),
  extractorVersion: Schema.NullOr(Schema.String),
  extractedFrom: Schema.NullOr(Schema.String),
}) {}

export const FactCheckSchema = Schema.transformOrFail(
  v1.FactChecksTableRowSchema,
  Schema.Struct({
    id: Schema.String,
    observationId: Schema.String,
    ingestionId: Schema.String,
    extractionId: Schema.String,
    extractedAt: NumberFromDate,
    fetchedAt: NumberFromDate,
    factCheck: FactCheck,
    http: Schema.Struct({
      contentSha256: Schema.String,
      status: Schema.Number,
      finalUrl: Schema.String,
      contentType: Schema.optional(Schema.String),
      etag: Schema.optional(Schema.String),
      lastModified: Schema.optional(Schema.String),
      headers: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.String })
      ),
    }),
    source: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      url: Schema.String,
      collection: Schema.String,
    }),
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
        extracted_at: input.extractedAt,
        fetched_at: input.fetchedAt,
        ingestion_id: input.ingestionId,
        content_hash: input.http.contentSha256,
        extraction_id: input.extractionId,
        source: {
          id: input.source.id,
          name: input.source.name,
          collection: input.source.collection,
          url: input.source.url,
        },
        fact_check: stripNullValues({
          sha256: input.factCheck.sha256,
          title: input.factCheck.title,
          claim: input.factCheck.claim,
          verdict: input.factCheck.verdict,
          summary: input.factCheck.summary,
          published_at: input.factCheck.publishedAt,
          canonical_url: input.factCheck.canonicalUrl,
          extractor_version: input.factCheck.extractorVersion,
          extracted_from: input.factCheck.extractedFrom,
        }),
        http: {
          content_sha256: input.http.contentSha256,
          final_url: input.http.finalUrl,
          status_code: input.http.status,
          etag: input.http.etag ?? undefined,
          content_type: input.http.contentType ?? undefined,
          last_modified: input.http.lastModified ?? undefined,
          headers: input.http.headers ?? undefined,
        },
      }),
  }
)

export type ExtractedFactCheck = Schema.Schema.Type<typeof FactCheckSchema>

export const ExtractedFactChecksSchema = Schema.Array(FactCheckSchema)

export type ExtractedFactChecks = Schema.Schema.Type<
  typeof ExtractedFactChecksSchema
>
