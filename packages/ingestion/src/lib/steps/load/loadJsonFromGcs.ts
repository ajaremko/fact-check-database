import { Effect } from 'effect'
import { JobLoadMetadata } from '@google-cloud/bigquery'

import { StorageBucketCache, StorageClient } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'

export function loadJsonFromGcs(input: {
  pointer: { object: string; bucket: string }
  table: { dataset: string; table: string }
  sourceFormat: string
}): Effect.Effect<
  void,
  BigQueryClient.BigQueryClientIOError,
  | BigQueryClient.BigQueryClient
  | StorageBucketCache.StorageBucketCache
  | StorageClient.StorageClient
> {
  return Effect.gen(function* () {
    const bq = yield* BigQueryClient.BigQueryClient
    const buckets = yield* StorageBucketCache.StorageBucketCache
    const { bucket } = yield* buckets.get(input.pointer.bucket)

    const file = bucket.file(input.pointer.object)
    const metadata: JobLoadMetadata = {
      sourceFormat: input.sourceFormat,
      autodetect: true,
      location: 'US',
    }

    // Load data from a Google Cloud Storage file into the table
    yield* Effect.tryPromise({
      try: () =>
        bq.client
          .dataset(input.table.dataset)
          .table(input.table.table)
          .load(file, metadata),
      catch: (cause) =>
        new BigQueryClient.BigQueryClientIOError({
          cause,
        }),
    })
  }).pipe(Effect.withSpan('ingestFromSourceTarget'))
}
