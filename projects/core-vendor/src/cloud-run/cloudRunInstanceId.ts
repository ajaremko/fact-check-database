import { Data, Effect } from 'effect'

/**
 * Thrown when the Cloud Run metadata server request in {@link cloudRunInstanceId}
 * fails or is interrupted.
 */
export class CloudRunInstanceError extends Data.TaggedError(
  'CloudRunInstanceError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

async function fetchMetadata(signal: AbortSignal) {
  const resp = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/id',
    {
      headers: { 'Metadata-Flavor': 'Google' },
      signal,
    }
  )
  return await resp.text()
}

/**
 * Effect that resolves to the numeric instance ID of the running Cloud Run
 * revision, read from the GCP metadata server.
 *
 * Only resolves on Google Compute infrastructure: the request targets
 * `metadata.google.internal`, which is unreachable anywhere else, so running
 * this outside GCP fails with a {@link CloudRunInstanceError}. Interrupting
 * the Effect aborts the underlying `fetch` via `Effect.tryPromise`'s signal.
 *
 * @example
 * const instanceId = yield* cloudRunInstanceId
 */
export const cloudRunInstanceId = Effect.tryPromise({
  try: fetchMetadata,
  catch: (cause) =>
    new CloudRunInstanceError({
      cause,
      message: 'Failed to fetch Cloud Run instance ID from metadata server',
    }),
})
