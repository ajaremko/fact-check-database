import { Effect, Metric, pipe, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'
import * as Yaml from '@news-research/core-data/Yaml'
import {
  FilePointer,
  FilePointerSchema,
} from '@news-research/ingestion-contracts/archive/v1'
import {
  TimestampEncoded,
  TimestampSchema,
} from '@news-research/ingestion-contracts/shared/v1'
import { readFile, writeFile } from '@news-research/core-io'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'

import {
  SanitizedObservation,
  SanitizedObservationMetaSchema,
  SanitizedObservationSchema,
  SanitizedObservationPathSchema,
} from './SanitizedObservation'
import { ObservationSchema } from './Observation'
import { evaluatePolicy } from './evaluatePolicy'
import { logRecordSanitized } from './logging'

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

const decodeArgs = Schema.decodeSync(
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
    const ctx = decodeArgs(args)

    yield* Effect.logDebug(`Reading observation from pointer`)
    const inputRecordData = yield* readFile(ctx.pointer)
    const observation = yield* decodeObservation(inputRecordData)

    yield* Effect.logDebug(`Evaluating policy for observation`)
    const decision = evaluatePolicy(ctx.policy, observation)

    yield* Metric.increment(contentRecordsSanitized).pipe(
      Effect.tagMetrics({
        decision_label: decision.label,
        source_collection: observation.source.collection,
        source_name: observation.source.name,
      })
    )

    yield* Effect.logDebug(`Observation labeled: ${decision.label}`)
    const sanitizedObservation = new SanitizedObservation({
      observationId: observation.observationId,
      ingestionId: observation.ingestionId,
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

    yield* logRecordSanitized({
      event: 'record_sanitized',
      'decision.label': decision.label,
      'decision.error': decision.error,
      'source.collection': observation.source.collection,
      'source.id': observation.source.id,
      'source.name': observation.source.name,
      'source.url': observation.source.url,
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

    return recordPointer
  },
  (effect, args) =>
    effect.pipe(
      Effect.annotateLogs({
        'pointer.bucket': args.pointer.bucket,
        'pointer.object': args.pointer.object,
      })
    )
)
