import { Effect, Metric, pipe, Schema } from 'effect'

import * as Node from '@news-research/ingestion-data/Node'
import * as Yaml from '@news-research/ingestion-data/Yaml'

import {
  FilePointer,
  TimestampEncoded,
  FilePointerSchema,
  TimestampSchema,
  readFile,
  writeFile,
} from '../shared'

import {
  SanitizedObservation,
  SanitizedObservationMetaSchema,
  SanitizedObservationSchema,
  SanitizedObservationPathSchema,
  SanitizedObservationEventSchema,
} from './SanitizedObservation'
import { SanitizerPolicy } from './SanitizerPolicy'
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
const encodeSanitizedObservationEvent = Schema.encode(
  SanitizedObservationEventSchema
)

const decodeArgs = Schema.decodeSync(
  Schema.Struct({
    policy: SanitizerPolicy,
    pointer: FilePointerSchema,
    timestamp: TimestampSchema,
  })
)

const decisionLabelFrequency = Metric.frequency('sanitize_decision_labels')

const recordsSanitizedCounter = Metric.counter('sanitize_records_sanitized')

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

    yield* decisionLabelFrequency(Effect.succeed(decision.label))
    yield* Metric.increment(recordsSanitizedCounter)

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

    // Encode a record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    yield* Effect.logDebug(`Writing sanitize record for observation`)
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

    // return the encoded event data
    return yield* encodeSanitizedObservationEvent({
      observation: sanitizedObservation,
      pointer: recordPointer,
    })
  },
  (effect, args) =>
    effect.pipe(
      Effect.annotateLogs({
        'pointer.bucket': args.pointer.bucket,
        'pointer.object': args.pointer.object,
      })
    )
)
