import { Effect } from 'effect'
import { JobLoadMetadata } from '@google-cloud/bigquery'

import { StorageClient } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'

export function loadBatch(input: {
  pointer: { object: string; bucket: string }
  table: { dataset: string; table: string }
  sourceFormat: string
}): Effect.Effect<
  void,
  BigQueryClient.BigQueryClientIOError,
  BigQueryClient.BigQueryClient | StorageClient.StorageClient
> {
  return Effect.gen(function* () {
    // Access fileRef from GCS
    yield* Effect.logInfo('Loading data from GCS object into BigQuery table')
    const gcs = yield* StorageClient.StorageClient
    const bucket = gcs.client.bucket(input.pointer.bucket)
    const file = bucket.file(input.pointer.object)

    console.log('file.exists()', file.exists())
    console.log('file.bucket.name', file.bucket.name)
    console.log('file.cloudStorageURI', file.cloudStorageURI)

    // Load data from fileRef into specified bq table
    const bq = yield* BigQueryClient.BigQueryClient
    const metadata: JobLoadMetadata = {
      sourceFormat: input.sourceFormat,
      autodetect: true,
      location: 'US',
    }
    yield* Effect.tryPromise({
      try: () =>
        bq.client
          .dataset(input.table.dataset)
          .table(input.table.table)
          .load(
            gcs.client.bucket(input.pointer.bucket).file(input.pointer.object),
            metadata
          ),
      catch: (cause) =>
        new BigQueryClient.BigQueryClientIOError({
          cause,
        }),
    })
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({
      tableId: input.table.table,
      datasetId: input.table.dataset,
      bucket: input.pointer.bucket,
      object: input.pointer.object,
    }),
    Effect.withSpan('loadBatch')
  )
}
