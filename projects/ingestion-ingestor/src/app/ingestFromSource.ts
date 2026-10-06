import { Duration, Effect, Schema, Metric, pipe } from 'effect'
import { getReasonPhrase } from 'http-status-codes'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import {
  TimestampEncoded,
  TimestampSchema,
} from '@fact-check-database/ingestion-contracts/shared/v1'
import {
  SourceConfigEncoded,
  SourceConfigSchema,
} from '@fact-check-database/ingestion-contracts/config/v1'
import {
  IngestionFailedKey,
  IngestionFailedSchema,
  IngestionSucceededKey,
  IngestionSucceededSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'
import { omitNullKeys } from '@fact-check-database/core-data'
import { writeFile } from '@fact-check-database/core-io'

import { fetch, FetchFailureSchema } from '../ports/Fetcher'

import {
  Observation,
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
} from './Observation'
import { FetchedBodySchema, FetchedBodyPathSchema } from './FetchedBody'

const encodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeObservationMetadata = Schema.encode(ObservationMetadataSchema)
const encodeObservationPath = Schema.encode(ObservationPathSchema)
const encodeFetchedBodyPath = Schema.encode(FetchedBodyPathSchema)

const decodeContext = Schema.decodeUnknown(
  Schema.Struct({
    ingestorRunId: Schema.String,
    source: SourceConfigSchema,
    timestamp: TimestampSchema,
  })
)

const contentRequestResults = Metric.counter('content_request_results')

export const ingestFromSource = Effect.fn('ingestFromSource')(
  function* (args: {
    ingestorRunId: string
    timestamp: TimestampEncoded
    source: SourceConfigEncoded
    timeoutSeconds: number
  }) {
    const ctx = yield* decodeContext(args)
    // A fetch that outlasts its timeout is interrupted and recorded like any
    // other fetch that got no response, so one unresponsive publisher can't
    // hold a fetch slot for the rest of the run
    const result = yield* fetch(ctx.source, ctx.timestamp).pipe(
      Effect.timeoutTo({
        duration: Duration.seconds(args.timeoutSeconds),
        onSuccess: (fetched) => fetched,
        onTimeout: () =>
          FetchFailureSchema.make({
            error: `Timed out after ${args.timeoutSeconds}s (GET ${ctx.source.url})`,
          }),
      })
    )

    if (result._tag === 'FetchFailure') {
      yield* Metric.increment(contentRequestResults).pipe(
        Effect.tagMetrics({
          result_status: 'Client Failure',
          result_status_code: 'N/A',
          result_content_type: 'N/A',
        })
      )
      // For a failed fetch, we won't have a body to archive,
      // so we can skip straight to creating an observation
      // with no pointer to a body
      const observation = new Observation({
        ingestorRunId: ctx.ingestorRunId,
        source: ctx.source,
        fetchedAt: ctx.timestamp,
        result,
        pointer: null,
      })

      // Encode to a record of the failed attempt, without a pointer
      const recordPath = yield* encodeObservationPath(observation)
      const recordData = yield* encodeObservation(observation)
      const recordMeta = yield* encodeObservationMetadata(observation)

      // write the record to storage
      const recordPointer = yield* writeFile({
        path: recordPath,
        data: recordData,
        meta: recordMeta,
        contentType: 'application/yaml',
      })
      yield* Effect.annotateLogsScoped({
        'record.object': recordPointer.object,
      })

      // The event fields feed the ingestion dashboards, which count one line
      // per event, so they are attached to this line only rather than scoped
      yield* Effect.logWarning('Source unreachable').pipe(
        Effect.annotateLogs(
          IngestionFailedSchema.make({
            event: IngestionFailedKey,
            'result.error': String(result.error),
          })
        )
      )

      // Return a pointer to the attempt record, since there is no body to archive
      return recordPointer
    }

    yield* Effect.annotateLogsScoped({
      'result.status_code': result.status,
      'content.bytes': result.bytes,
      'content.sha256': result.sha256,
      'result.final_url': result.finalUrl,
    })

    // For a successful fetch, we need to archive the body
    const fetchedBody = FetchedBodySchema.make({
      contentSha256: result.sha256,
      ingestorRunId: ctx.ingestorRunId,
      fetchedAt: ctx.timestamp,
      sourceId: ctx.source.id,
      body: result.body,
      contentType: result.contentType,
    })

    // Write the raw response body to the archive
    const bodyPath = yield* encodeFetchedBodyPath(fetchedBody)
    const bodyPointer = yield* writeFile(
      omitNullKeys({
        path: bodyPath,
        data: fetchedBody.body,
        contentType: fetchedBody.contentType,
      })
    )
    yield* Effect.annotateLogsScoped({ 'body.object': bodyPointer.object })

    // We have archived the body so we create an
    // observation with a pointer to the body
    const observation = new Observation({
      ingestorRunId: ctx.ingestorRunId,
      source: ctx.source,
      fetchedAt: ctx.timestamp,
      result,
      pointer: bodyPointer,
    })

    const recordPath = yield* encodeObservationPath(observation)
    const recordData = yield* encodeObservation(observation)
    const recordMeta = yield* encodeObservationMetadata(observation)

    // Write a record of the attempt, including a pointer to the archived body
    const recordPointer = yield* writeFile({
      path: recordPath,
      data: recordData,
      meta: recordMeta,
      contentType: 'application/yaml',
    })
    yield* Effect.annotateLogsScoped({ 'record.object': recordPointer.object })

    // Record the response code for sent requests to
    // allow monitoring of source health
    yield* Metric.increment(contentRequestResults).pipe(
      Effect.tagMetrics({
        result_status: `${getReasonPhrase(result.status)}`,
        result_status_code: String(result.status),
        result_content_type: result.contentType || 'unknown',
      })
    )

    // The event fields feed the ingestion dashboards, which count one line
    // per event, so they are attached to this line only rather than scoped.
    // A non-2xx response is still archived, so it keeps the same event but
    // is logged at warning.
    const outcome =
      result.status >= 200 && result.status < 300
        ? Effect.logInfo('Source fetched')
        : Effect.logWarning('Source returned an error status')
    yield* outcome.pipe(
      Effect.annotateLogs(
        IngestionSucceededSchema.make({
          event: IngestionSucceededKey,
          'result.status': getReasonPhrase(result.status),
          'result.status_code': result.status,
          'result.content_type': result.contentType || 'unknown',
        })
      )
    )

    // Return a pointer to the attempt record, which
    // references the archived body
    return recordPointer
  },
  Effect.scoped,
  (effect, args) =>
    effect.pipe(
      // Not tagged by source: a per-source label multiplies the metric's
      // time series by the length of the source list. The logs carry the
      // source on every line.
      Effect.tagMetrics({
        source_collection: args.source.collection,
      })
    )
)
