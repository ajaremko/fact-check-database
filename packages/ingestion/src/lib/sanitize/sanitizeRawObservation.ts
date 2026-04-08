import { Clock, Effect } from 'effect'

import { Node } from '@news-research/node'

import { FilePointer, archiveBaseDir } from '../data'

import { Archiver } from './Archiver'
import { evaluatePolicy } from './evaluatePolicy'
import type { SanitizerPolicy } from './SanitizerPolicy'
import type { SanitizationAttempted } from './SanitizationAttempted'

export function sanitizeRawObservation(
  policy: SanitizerPolicy,
  observationId: string,
  pointer: FilePointer
) {
  return Effect.gen(function* () {
    const archiver = yield* Archiver

    const record = yield* archiver.readFetchAttemptRecord(pointer)

    if (record.outcome !== 'data_fetched') {
      yield* Effect.logInfo(`Skipping observation ${observationId}`)
      return []
    }

    yield* Effect.logInfo(`Processing observation ${observationId}`)

    const decision = evaluatePolicy(policy, record)
    const sanitizationId = yield* Node.generateUUID()
    const sanitizedAt = yield* Clock.currentTimeMillis
    const baseDir = archiveBaseDir(
      record.source.name,
      record.fetchedAt,
      record.runId
    )

    yield* archiver.writeSanitizerRecord(
      baseDir,
      {
        version: 1,
        kind: 'sanitized_record',
        url: record.url,
        http: record.http,
        runId: record.runId,
        source: record.source,
        content: record.content,
        sanitizationId,
        fetchedAt: record.fetchedAt,
        sanitizedAt,
        policy: {
          label: decision.label,
          actions: decision.actions,
        },
        input: {
          record: pointer,
          raw: record.outcome === 'data_fetched' ? pointer : undefined,
        },
      },
      {
        sourceCollection: record.source.collection,
        sourceName: record.source.name,
        sanitizedAt,
        fetchedAt: record.fetchedAt,
        url: record.url,
        id: sanitizationId,
      }
    )

    const event: SanitizationAttempted = {
      observationId,
      runId: record.runId,
      fetchedAt: record.fetchedAt,
      url: record.url,
      finalUrl: record.url,
      source: record.source,
      http: record.http,
      content: record.content,
      error: decision.error,
      pointer,
    }
    return [event]
  }).pipe(Effect.tapError(Effect.logError))
}
