import { Effect, pipe, Schema } from 'effect'

import { Node, Yaml } from '../../util'
import { StorageReader, StorageWriter } from '../../ports'

import {
  SanitizerOutcome,
  SanitizerOutcomeMetaSchema,
  SanitizerOutcomeSchema,
} from './SanitizerOutcome'
import { SanitizerRecordPathSchema } from './SanitizerRecordPath'
import type { SanitizerPolicy } from './SanitizerPolicy'
import { SanitizerInputSchema } from './SanitizerInput'
import { ObservationSanitized } from './ObservationSanitized'
import { evaluatePolicy } from './evaluatePolicy'

const decodeInput = pipe(
  SanitizerInputSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeOutputRecord = pipe(
  SanitizerOutcomeSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeOutputRecordMeta = Schema.encode(SanitizerOutcomeMetaSchema)
const encodeOutputRecordPath = Schema.encode(SanitizerRecordPathSchema)

export function sanitizeRawObservation(ctx: {
  policy: SanitizerPolicy
  pointer: { object: string; bucket: string }
  timestamp: number
}) {
  return Effect.gen(function* () {
    yield* Effect.logDebug(`Reading record for observation`)
    const inputRecordData = yield* StorageReader.readFile(ctx.pointer)
    const input = yield* decodeInput(inputRecordData)

    yield* Effect.logDebug(`Evaluating policy for observation`)
    const decision = evaluatePolicy(ctx.policy, input)

    const outcome = new SanitizerOutcome({
      observationId: input.observationId,
      ingestionId: input.ingestionId,
      fetchedAt: input.fetchedAt,
      url: input.url,
      finalUrl: input.finalUrl,
      sanitizedAt: ctx.timestamp,
      source: input.source,
      http: input.http,
      content: input.content,
      outcome: decision,
      input: {
        record: ctx.pointer,
        raw: input.dataFetched ? input.pointer : undefined,
      },
      error: decision.error,
    })

    // Write the record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    const outputRecordPath = yield* encodeOutputRecordPath(outcome)
    const outputRecordData = yield* encodeOutputRecord(outcome)
    const outputRecordMetadata = yield* encodeOutputRecordMeta(outcome)

    yield* Effect.logDebug(`Writing sanitize record for observation`)
    const outputRecordPointer = yield* StorageWriter.writeFile({
      path: outputRecordPath,
      data: outputRecordData,
      meta: outputRecordMetadata,
    })

    return new ObservationSanitized({
      observationId: outcome.observationId,
      ingestionId: outcome.ingestionId,
      fetchedAt: outcome.fetchedAt,
      url: outcome.url,
      finalUrl: outcome.finalUrl,
      source: outcome.source,
      http: outcome.http,
      content: outcome.content,
      error: outcome.error,
      pointer: outputRecordPointer,
    })
  }).pipe(Effect.withSpan('sanitizeRawObservation'))
}
