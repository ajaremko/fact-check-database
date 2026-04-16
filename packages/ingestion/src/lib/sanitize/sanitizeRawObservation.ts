import { Clock, Effect, pipe, Schema } from 'effect'

import {
  ArchivePathSchema,
  FilePointer,
  IngestionRecordSchema,
  SanitizerRecordSchema,
  SanitizerRecordMetadataSchema,
} from '../data'
import { Node, Yaml } from '../util'
import { StorageReader, StorageWriter } from '../ports'

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
    const storageReader = yield* StorageReader
    const storageWriter = yield* StorageWriter
    const sanitizedAt = yield* Clock.currentTimeMillis

    yield* Effect.logDebug(`Reading record for observation`)
    const inputRecordData = yield* storageReader.read(input.pointer)
    const inputRecord = yield* decodeIngestionRecord(inputRecordData)

    if (inputRecord.outcome !== 'data_fetched') {
      yield* Effect.logDebug(`Skipping observation with no fetched data`)
      return []
    }

    yield* Effect.logDebug(`Evaluating policy for observation`)

    const decision = evaluatePolicy({
      policy: input.policy,
      record: inputRecord,
    })

    // Write the record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    yield* Effect.logDebug(`Writing sanitized record for observation`)
    const outputRecordPath = yield* encodeArchivePath({
      version: 1,
      sourceName: inputRecord.source.name,
      collectionName: 'records',
      ext: 'sanitizer.yml',
      date: inputRecord.fetchedAt,
      ingestionId: inputRecord.ingestionId,
      observationId: input.id,
    })
    const outputRecordData = yield* encodeSanitizerRecord({
      version: 1,
      kind: 'sanitized_record',
      url: inputRecord.url,
      http: inputRecord.http,
      observationId: input.id,
      ingestionId: inputRecord.ingestionId,
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
        raw:
          inputRecord.outcome === 'data_fetched'
            ? inputRecord.pointer
            : undefined,
      },
      error: decision.error,
    })
    const outputRecordMetadata = yield* encodeSanitizerRecordMetadata({
      observationId: input.id,
      ingestionId: inputRecord.ingestionId,
      sanitizedAt,
      sourceName: inputRecord.source.name,
      sourceCollection: inputRecord.source.collection,
      fetchedAt: inputRecord.fetchedAt,
      url: inputRecord.url,
    })
    const outputRecordPointer = yield* storageWriter.write({
      path: outputRecordPath,
      data: outputRecordData,
      meta: outputRecordMetadata,
    })

    const event = new SanitizationAttempted({
      observationId: input.id,
      ingestionId: inputRecord.ingestionId,
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
  }).pipe(Effect.annotateLogs({ observationId: input.id }))
}
