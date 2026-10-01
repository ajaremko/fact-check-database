import { Effect, Metric, pipe, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import {
  FilePointer,
  FilePointerSchema,
} from '@fact-check-database/ingestion-contracts/archive/v1'
import {
  TimestampEncoded,
  TimestampSchema,
} from '@fact-check-database/ingestion-contracts/shared/v1'
import {
  RecordSanitizedKey,
  RecordSanitizedSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'
import { readFile, writeFile } from '@fact-check-database/core-io'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'

import {
  SanitizedObservation,
  SanitizedObservationMetaSchema,
  SanitizedObservationSchema,
  SanitizedObservationPathSchema,
} from './SanitizedObservation'
import { ObservationSchema } from './Observation'
import { evaluatePolicy } from './evaluatePolicy'

const decodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizedObservation = pipe(
  SanitizedObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeSanitizedObservationMeta = Schema.encode(
  SanitizedObservationMetaSchema
)
const encodeSanitizedObservationPath = Schema.encode(
  SanitizedObservationPathSchema
)

const decodeArgs = Schema.decode(
  Schema.Struct({
    policy: SanitizerPolicy,
    pointer: FilePointerSchema,
    timestamp: TimestampSchema,
  })
)

const contentRecordsSanitized = Metric.counter('content_records_sanitized')

export const sanitizeObservation = Effect.fn('sanitizeObservation')(
  function* (args: {
    policy: SanitizerPolicy
    pointer: FilePointer
    timestamp: TimestampEncoded
  }) {
    yield* Effect.annotateLogsScoped({
      'input.bucket': args.pointer.bucket,
      'input.object': args.pointer.object,
    })
    const ctx = yield* decodeArgs(args)

    const inputRecordData = yield* readFile(ctx.pointer)
    const observation = yield* decodeObservation(inputRecordData)
    yield* Effect.annotateLogsScoped({
      'source.id': observation.source.id,
      'source.name': observation.source.name,
      'source.url': observation.source.url,
      'source.collection': observation.source.collection,
    })

    const decision = evaluatePolicy(ctx.policy, observation)
    yield* Effect.annotateLogsScoped({
      'decision.label': decision.label,
      'decision.actions': decision.actions.join(','),
    })

    yield* Metric.increment(contentRecordsSanitized).pipe(
      Effect.tagMetrics({
        decision_label: decision.label,
        source_collection: observation.source.collection,
        source_name: observation.source.name,
      })
    )

    const sanitizedObservation = new SanitizedObservation({
      ingestorRunId: observation.ingestorRunId,
      fetchedAt: observation.fetchedAt,
      sanitizedAt: ctx.timestamp,
      source: observation.source,
      http:
        observation.raw && observation.raw.http ? observation.raw.http : null,
      content: observation.raw ? observation.raw.content : null,
      outcome: {
        decision,
        sanitized: null,
      },
      input: {
        record: ctx.pointer,
        raw: observation.raw ? observation.raw.pointer : null,
      },
      error: decision.error,
    })

    // Encode a record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    const recordPath = yield* encodeSanitizedObservationPath(
      sanitizedObservation
    )
    const recordData = yield* encodeSanitizedObservation(sanitizedObservation)
    const recordMetadata = yield* encodeSanitizedObservationMeta(
      sanitizedObservation
    )
    // write the record to storage
    const recordPointer = yield* writeFile({
      path: recordPath,
      data: recordData,
      meta: recordMetadata,
    })
    yield* Effect.annotateLogsScoped({ 'record.object': recordPointer.object })

    // The event fields feed the ingestion dashboard, which counts one line per
    // event at info, so they are attached to this line only rather than
    // scoped. Every decision label, quarantines included, is logged at info.
    yield* Effect.logInfo('Record sanitized').pipe(
      Effect.annotateLogs(
        RecordSanitizedSchema.make({
          event: RecordSanitizedKey,
          'decision.label': decision.label,
          'decision.error': decision.error,
          'source.collection': observation.source.collection,
          'source.id': observation.source.id,
          'source.name': observation.source.name,
          'source.url': observation.source.url,
        })
      )
    )

    return recordPointer
  },
  Effect.scoped
)
