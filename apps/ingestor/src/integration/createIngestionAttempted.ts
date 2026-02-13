import { Effect, Either } from 'effect'

import { IngestionAttempted, FilePointer } from '@news-research/contracts'
import { Node } from '@news-research/node'

import type { FetchAttempt } from '../data/FetchAttempt'

export function createIngestionAttempted(
  attempt: FetchAttempt,
  pointer: FilePointer // pointer to META json
): Effect.Effect<IngestionAttempted> {
  return Effect.gen(function* () {
    const components = Either.match(attempt.result, {
      onLeft: (result) => [
        `url=${attempt.source.url}`,
        `t=${attempt.fetchedAt}`,
        `error=${result.error}`,
      ],
      onRight: (result) => [
        `url=${attempt.source.url}`,
        `sha256=${result.sha256}`,
      ],
    })
    const base = [`v1`, ...components].join('|')
    const observationId = yield* Node.sha256Hex(base, 'utf8')

    return Either.match(attempt.result, {
      onLeft: (result) => ({
        observationId,
        runId: attempt.runId,
        fetchedAt: attempt.fetchedAt,
        url: attempt.source.url,
        source: {
          name: attempt.source.name,
          collection: attempt.source.collection,
        },
        http: {
          status: 0,
        },
        content: {
          sha256: undefined,
          bytes: undefined,
        },
        error: result.error,
        pointer,
      }),
      onRight: (result) => ({
        observationId,
        runId: attempt.runId,
        fetchedAt: attempt.fetchedAt,
        url: attempt.source.url,
        finalUrl: result.finalUrl,
        source: {
          name: attempt.source.name,
          collection: attempt.source.collection,
        },
        http: {
          status: result.status,
          contentType: result.contentType,
          etag: result.etag,
          lastModified: result.lastModified,
        },
        content: {
          sha256: result.sha256,
          bytes: result.bytes,
        },
        error: undefined,
        pointer,
      }),
    })
  })
}
