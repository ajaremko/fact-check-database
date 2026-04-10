import { Clock, Effect, pipe, Schema } from 'effect'

import {
  ArchivePathSchema,
  FilePointer,
  IngestionRecordSchema,
  SanitizerRecordSchema,
  SanitizerRecordMetadataSchema,
} from '../data'
import { Node, Yaml } from '../util'
import { Archive } from '../ports'

import { evaluatePolicy } from './evaluatePolicy'
import type { SanitizerPolicy } from './SanitizerPolicy'
import { SanitizationAttempted } from './SanitizationAttempted'

const decodeIngestionRecord = pipe(
  IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeSanitizerRecordMetadata = Schema.encode(
  SanitizerRecordMetadataSchema
)

const encodeArchivePath = Schema.encode(ArchivePathSchema)

export function sanitizeRawObservation(input: {
  id: string
  pointer: FilePointer
  policy: SanitizerPolicy
}) {
  return Effect.gen(function* () {
    const archive = yield* Archive
    const sanitizedAt = yield* Clock.currentTimeMillis

    const inputRecordData = yield* archive.read(input.pointer)
    const inputRecord = yield* decodeIngestionRecord(inputRecordData)

    if (inputRecord.outcome !== 'data_fetched') {
      yield* Effect.logInfo(`Skipping observation ${input.id}`)
      return []
    }

    yield* Effect.logInfo(`Processing observation ${input.id}`)

    const decision = evaluatePolicy(input.policy, inputRecord)

    // Write the record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    const outputRecordPath = yield* encodeArchivePath({
      version: 1,
      sourceName: inputRecord.source.name,
      collectionName: 'records',
      ext: 'sanitizer.yml',
      date: inputRecord.fetchedAt,
      runId: inputRecord.runId,
      id: input.id,
    })
    const outputRecordData = yield* encodeSanitizerRecord({
      version: 1,
      kind: 'sanitized_record',
      url: inputRecord.url,
      http: inputRecord.http,
      runId: inputRecord.runId,
      source: inputRecord.source,
      content: inputRecord.content,
      fetchedAt: inputRecord.fetchedAt,
      sanitizedAt,
      policy: {
        label: decision.label,
        actions: decision.actions,
      },
      input: {
        record: input.pointer,
        raw: inputRecord.outcome === 'data_fetched' ? input.pointer : undefined,
      },
    })
    const outputRecordMetadata = yield* encodeSanitizerRecordMetadata({
      id: input.id,
      sourceName: inputRecord.source.name,
      fetchedAt: inputRecord.fetchedAt,
      sanitizedAt,
      url: inputRecord.url,
      sourceCollection: inputRecord.source.collection,
    })
    const outputRecordPointer = yield* archive.write({
      path: outputRecordPath,
      data: outputRecordData,
      meta: outputRecordMetadata,
    })

    const event = new SanitizationAttempted({
      observationId: input.id,
      runId: inputRecord.runId,
      fetchedAt: inputRecord.fetchedAt,
      url: inputRecord.url,
      finalUrl: inputRecord.url,
      source: inputRecord.source,
      http: inputRecord.http,
      content: inputRecord.content,
      error: decision.error,
      pointer: outputRecordPointer,
    })
    return [event]
  })
}
