import { Effect, Metric, ParseResult, pipe, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'

import { FilePointer, readFile } from '@fact-check-database/core-io'
import {
  ExtractionFailedKey,
  ExtractionFailedSchema,
  ExtractionSucceededKey,
  ExtractionSucceededSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'

import { FactCheckRow, FactCheckRowSchema } from './FactCheck'
import { contentPreview } from './NormalizedText'
import { ObservationSchema } from './Observation'
import { extractors } from '../integration/extraction-strategy'
import { factCheckId } from '../integration/factCheckId'

const decodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeFactCheckRows = Schema.encode(Schema.Array(FactCheckRowSchema))

const extractedFactCheckRows = Metric.counter('extracted_fact_check_rows')

/**
 * A bounded description of why a feed failed to decode: the first failing
 * field's issue type and path. The raw error message is not used, since it
 * can embed large parts of the feed, article text included.
 */
function describeExtractionError(error: { readonly _tag: string }): string {
  if (!ParseResult.isParseError(error)) {
    return error._tag
  }
  const [issue] = ParseResult.ArrayFormatter.formatErrorSync(error)
  if (!issue) {
    return error._tag
  }
  return `${issue._tag} at ${issue.path.join('.') || '(root)'}`
}

export const extractFactChecks = Effect.fn('extractFactChecks')(
  function* (ctx: {
    extractorRunId: string
    pointer: FilePointer
    extractedAt: number
  }) {
    yield* Effect.annotateLogsScoped({
      'input.bucket': ctx.pointer.bucket,
      'input.object': ctx.pointer.object,
    })
    const recordData = yield* readFile(ctx.pointer)
    const observation = yield* decodeObservation(recordData)
    const extractor = extractors[observation.source.collection]
    yield* Effect.annotateLogsScoped({
      'source.id': observation.source.id,
      'source.name': observation.source.name,
      'source.url': observation.source.url,
      'source.collection': observation.source.collection,
      'extractor.id': extractor.id,
      'extractor.version': extractor.version,
    })
    const { content, http } = observation

    if (!http || !content || !observation.shouldExtract) {
      yield* Effect.logInfo('Observation skipped').pipe(
        Effect.annotateLogs({ 'skip.reason': 'not_extractable' })
      )
      return []
    }

    const responsePointer = observation.sanitized ?? observation.raw

    if (!responsePointer) {
      yield* Effect.logWarning('Observation skipped').pipe(
        Effect.annotateLogs({ 'skip.reason': 'no_body_pointer' })
      )
      return []
    }

    const responseData = yield* readFile(responsePointer)
    const factChecks = yield* extractor
      .extractor({
        timestamp: ctx.extractedAt,
        record: observation,
        data: responseData,
      })
      .pipe(
        Effect.map((factChecks) =>
          factChecks.map(
            (factCheck): FactCheckRow => ({
              factCheckId: factCheckId({
                sourceId: observation.source.id,
                sourceUrl: observation.source.url,
                canonicalUrl: factCheck.canonicalUrl,
                link: factCheck.link,
                guid: factCheck.guid,
                title: factCheck.title,
              }),
              extractorRunId: ctx.extractorRunId,
              fetchedAt: observation.fetchedAt,
              extractedAt: ctx.extractedAt,
              ingestorRunId: observation.ingestorRunId,
              // Only a short plain-text preview of the article body is
              // kept, for research queries. Full articles are not stored,
              // since serving them would republish third-party content.
              factCheck: factCheck.content
                ? {
                    ...factCheck,
                    content: contentPreview(factCheck.content),
                  }
                : factCheck,
              extractor: {
                id: extractor.id,
                version: extractor.version,
              },
              http: {
                contentSha256: content.sha256,
                finalUrl: http.finalUrl,
                status: http.status,
                contentType: http.contentType,
                etag: http.etag,
                lastModified: http.lastModified,
                headers: http.headers,
              },
              source: observation.source,
            })
          )
        ),
        // The event fields feed the extraction dashboard, which counts one
        // line per event, so they are attached to these lines only rather
        // than scoped
        Effect.tap((factChecks) =>
          Effect.logInfo('Fact checks extracted').pipe(
            Effect.annotateLogs(
              ExtractionSucceededSchema.make({
                event: ExtractionSucceededKey,
                count: factChecks.length,
              })
            )
          )
        ),
        // A feed that can't be parsed won't parse on a retry either, so the
        // failure is logged and the message is acked with no rows
        Effect.catchAll((error) =>
          Effect.logWarning('Extraction failed').pipe(
            Effect.annotateLogs(
              ExtractionFailedSchema.make({
                event: ExtractionFailedKey,
                type: error._tag,
                error: describeExtractionError(error),
              })
            ),
            Effect.as([])
          )
        ),
        Effect.withSpan('extractor')
      )

    const rows = yield* encodeFactCheckRows(factChecks)
    yield* Metric.incrementBy(extractedFactCheckRows, rows.length).pipe(
      Effect.tagMetrics({
        source_collection: observation.source.collection,
        source_name: observation.source.name,
        extractor_id: extractor.id,
      })
    )

    return rows
  },
  Effect.scoped
)
