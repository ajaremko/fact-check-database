import { Effect } from 'effect'

import { BigQueryClient } from '@news-research/bigquery'

export function loadBatch(input: {
  projectId: string
  pointer: { object: string; bucket: string }
  table: { dataset: string; table: string }
  sourceFormat: string
}): Effect.Effect<
  void,
  BigQueryClient.BigQueryClientIOError,
  BigQueryClient.BigQueryClient
> {
  return Effect.gen(function* () {
    yield* Effect.logInfo('Loading data from GCS object into BigQuery table')
    const bq = yield* BigQueryClient.BigQueryClient
    const gsUri = `gs://${input.pointer.bucket}/${input.pointer.object}`
    console.log(
      `Loading data from ${gsUri} into ${input.table.dataset}.${input.table.table}`
    )
    console.log(`Project ID: ${input.projectId}`)

    yield* Effect.tryPromise({
      try: () =>
        bq.client
          .createJob({
            location: 'US',
            projectId: input.projectId,
            configuration: {
              load: {
                destinationTable: {
                  datasetId: input.table.dataset,
                  tableId: input.table.table,
                },
                sourceUris: [gsUri],
                sourceFormat: input.sourceFormat,
                autodetect: true,
              },
            },
          })
          .then(
            ([job]) =>
              new Promise<void>((resolve, reject) => {
                job.on('error', reject).on('complete', () => resolve())
              })
          ),
      catch: (cause) => new BigQueryClient.BigQueryClientIOError({ cause }),
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
