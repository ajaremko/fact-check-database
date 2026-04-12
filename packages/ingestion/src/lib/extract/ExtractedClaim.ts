import { Schema } from 'effect'

import {
  ClaimsTableRowSchema,
  ClaimVerdictSchema,
  NumberFromFormattedDate,
} from '../data'

export const ExtractedClaimSchema = Schema.transform(
  ClaimsTableRowSchema,
  Schema.Struct({
    id: Schema.String,
    observationId: Schema.String,
    ingestionId: Schema.String,
    extractionId: Schema.String,
    source: Schema.Struct({
      name: Schema.String,
      collection: Schema.String,
    }),
    url: Schema.String,
    finalUrl: Schema.String,
    fetchedAt: NumberFromFormattedDate('yyyy-MM-dd'),
    extractedAt: NumberFromFormattedDate('yyyy-MM-dd'),
    publishedAt: Schema.NullOr(Schema.String),
    title: Schema.NullOr(Schema.String),
    claim: Schema.NullOr(Schema.String),
    verdict: Schema.NullOr(ClaimVerdictSchema),
    summary: Schema.NullOr(Schema.String),
  }),
  {
    strict: true,
    decode: (input) => ({
      id: input.id,
      observationId: input.observation_id,
      ingestionId: input.ingestion_id,
      extractionId: input.extraction_id,
      source: input.source,
      url: input.url,
      finalUrl: input.final_url,
      publishedAt: input.published_at ?? null,
      fetchedAt: input.fetched_at,
      extractedAt: input.extracted_at,
      title: input.title ?? null,
      claim: input.claim ?? null,
      verdict: input.verdict ?? null,
      summary: input.summary ?? null,
    }),
    encode: (input) => ({
      id: input.id,
      observation_id: input.observationId,
      ingestion_id: input.ingestionId,
      extraction_id: input.extractionId,
      source: input.source,
      url: input.url,
      final_url: input.finalUrl,
      fetched_at: input.fetchedAt,
      extracted_at: input.extractedAt,
      ...(input.publishedAt ? { published_at: input.publishedAt } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.claim ? { claim: input.claim } : {}),
      ...(input.verdict ? { verdict: input.verdict } : {}),
      ...(input.summary ? { summary: input.summary } : {}),
    }),
  }
)

export type ExtractedClaim = Schema.Schema.Type<typeof ExtractedClaimSchema>

export const ExtractedClaimsSchema = Schema.Array(ExtractedClaimSchema)

export type ExtractedClaims = Schema.Schema.Type<typeof ExtractedClaimsSchema>
