import { Effect, Metric, pipe, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'

import { FilePointer, readFile } from '@fact-check-database/core-io'

import { FactCheckRow, FactCheckRowSchema } from './FactCheck'
import { logExtractionSucceeded, logExtractionFailed } from './logging'
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

export const extractFactChecks = Effect.fn('extractFactChecks')(
  function* (ctx: {
    extractorRunId: string
    pointer: FilePointer
    extractedAt: number
  }) {
    const recordData = yield* readFile(ctx.pointer)
    const observation = yield* decodeObservation(recordData)
    const { content, http } = observation

    if (!http || !content || !observation.shouldExtract) {
      yield* Effect.logInfo(`Skipping extraction for observation`)
      return []
    }

    const extractor = extractors[observation.source.collection]

    const responsePointer = observation.sanitized ?? observation.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No pointer available for observation, skipping extraction`
      )
      return []
    }

    yield* Effect.logInfo(
      `Extracting fact checks for observation from sanitized record`
    )

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
        Effect.tap((factChecks) =>
          logExtractionSucceeded({
            event: 'extraction_succeeded',
            count: factChecks.length,
          })
        ),
        Effect.tapError((err) =>
          logExtractionFailed({
            event: 'extraction_failed',
            type: err._tag,
            error: err.message,
          })
        ),
        Effect.catchAll(() => Effect.succeed([])),
        Effect.annotateLogs({
          'source.collection': observation.source.collection,
          'source.name': observation.source.name,
          'source.url': observation.source.url,
          'source.id': observation.source.id,
          'extractor.id': extractor.id,
          'extractor.version': extractor.version,
        }),
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
  (effect, ctx) =>
    effect.pipe(
      Effect.annotateLogs({
        'pointer.bucket': ctx.pointer.bucket,
        'pointer.object': ctx.pointer.object,
      })
    )
)
