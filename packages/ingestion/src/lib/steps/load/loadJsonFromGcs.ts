import { Data, Effect } from 'effect'
import { JobLoadMetadata } from '@google-cloud/bigquery'

import { StorageBucketCache, StorageClient } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'

import { FilePointer, TablePointer, LoadJobMetadata } from '../../data'

export class LoadJsonFromGcsError extends Data.TaggedError(
  'LoadJsonFromGcsError'
)<{
  readonly cause: unknown
  readonly pointer: FilePointer
  readonly table: TablePointer
}> {}

export function loadJsonFromGcs(input: {
  pointer: FilePointer
  meta: LoadJobMetadata
  table: TablePointer
}): Effect.Effect<
  void,
  LoadJsonFromGcsError,
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
      ...(input.meta as JobLoadMetadata),
      location: 'US',
    }

    // Load data from a Google Cloud Storage file into the table
    yield* Effect.tryPromise({
      try: () =>
        bq.client
          .dataset(input.table.datasetId)
          .table(input.table.tableId)
          .load(file, metadata),
      catch: (cause) =>
        new LoadJsonFromGcsError({
          cause,
          pointer: input.pointer,
          table: input.table,
        }),
    })
  }).pipe(Effect.withSpan('ingestFromSourceTarget'))
}
