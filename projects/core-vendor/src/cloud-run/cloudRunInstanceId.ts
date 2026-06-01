import { Data, Effect } from 'effect'

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

export const cloudRunInstanceId = Effect.tryPromise({
  try: fetchMetadata,
  catch: (cause) =>
    new CloudRunInstanceError({
      cause,
      message: 'Failed to fetch Cloud Run instance ID from metadata server',
    }),
})
