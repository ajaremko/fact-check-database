// domain/createObservationFetched.ts
import type { ArchivePointer, ObservationFetched } from './Observation'
import type { FetchAttempt } from './FetchAttempt'
import { observationIdFrom } from './normalize'

export function createObservationFetched(args: {
  attempt: FetchAttempt
  archive: ArchivePointer // pointer to META json
}): ObservationFetched {
  const { attempt, archive } = args

  const observationId =
    attempt._tag === 'Fetched'
      ? observationIdFrom({
          url: attempt.url,
          fetchedAt: attempt.fetchedAt,
          sha256: attempt.content.sha256,
        })
      : observationIdFrom({
          url: attempt.url,
          fetchedAt: attempt.fetchedAt,
          status: 0,
          error: attempt.error,
        })

  return {
    observationId,
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
    url: attempt.url,
    finalUrl: attempt.finalUrl,

    source: { name: attempt.sourceName, collection: attempt.sourceCollection },

    http:
      attempt._tag === 'Fetched'
        ? {
            status: attempt.http.status,
            contentType: attempt.http.contentType,
            etag: attempt.http.etag,
            lastModified: attempt.http.lastModified,
          }
        : {
            status: 0,
          },

    content:
      attempt._tag === 'Fetched'
        ? { sha256: attempt.content.sha256, bytes: attempt.content.bytes }
        : { sha256: undefined, bytes: undefined },

    error: attempt._tag === 'NoResponse' ? attempt.error : undefined,
    archive,
  }
}
