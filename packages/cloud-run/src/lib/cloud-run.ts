import { Effect } from 'effect'

export const cloudRunInstanceId = Effect.tryPromise(async (signal) => {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/id',
    {
      headers: { 'Metadata-Flavor': 'Google' },
      signal,
    }
  )

  if (response.ok) {
    return await response.text()
  }

  throw new Error('Metadata server not available')
})
