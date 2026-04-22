import { Effect, pipe, Schema } from 'effect'

import { Node, Yaml } from '../../util'
import { StorageReader, StorageWriter } from '../../ports'

import {
  SanitizedObservation,
  SanitizedObservationMetaSchema,
  SanitizedObservationSchema,
  SanitizedObservationPathSchema,
} from './SanitizedObservation'
import type { SanitizerPolicy } from './SanitizerPolicy'
import { ObservationSchema } from './Observation'
import { ObservationSanitized } from './ObservationSanitized'
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

export function sanitizeObservation(ctx: {
  policy: SanitizerPolicy
  pointer: { object: string; bucket: string }
  timestamp: number
}) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(`Reading record for observation`)
    const inputRecordData = yield* StorageReader.readFile(ctx.pointer)
    const observation = yield* decodeObservation(inputRecordData)

    yield* Effect.logDebug(`Evaluating policy for observation`)
    const decision = evaluatePolicy(ctx.policy, observation)

    const sanitizedObservation = new SanitizedObservation({
      observationId: observation.observationId,
      ingestionId: observation.ingestionId,
      fetchedAt: observation.fetchedAt,
      url: observation.url,
      finalUrl: observation.finalUrl,
      sanitizedAt: ctx.timestamp,
      source: observation.source,
      http: observation.raw?.http,
      content: observation.raw?.content,
      outcome: {
        decision,
        sanitized: null,
      },
      input: {
        record: ctx.pointer,
        raw: observation.raw ? observation.raw.pointer : undefined,
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
    const recordPointer = yield* StorageWriter.writeFile({
      path: recordPath,
      data: recordData,
      meta: recordMetadata,
    })

    return new ObservationSanitized({
      observationId: sanitizedObservation.observationId,
      ingestionId: sanitizedObservation.ingestionId,
      fetchedAt: sanitizedObservation.fetchedAt,
      url: sanitizedObservation.url,
      source: sanitizedObservation.source,
      ...(typeof sanitizedObservation.finalUrl !== 'undefined'
        ? { finalUrl: sanitizedObservation.finalUrl }
        : {}),
      ...(typeof sanitizedObservation.http !== 'undefined'
        ? { http: sanitizedObservation.http }
        : {}),
      ...(typeof sanitizedObservation.content !== 'undefined'
        ? { content: sanitizedObservation.content }
        : {}),
      ...(typeof sanitizedObservation.error !== 'undefined'
        ? { error: sanitizedObservation.error }
        : {}),
      pointer: recordPointer,
    })
  }).pipe(Effect.withSpan('sanitizeObservation'))
}
