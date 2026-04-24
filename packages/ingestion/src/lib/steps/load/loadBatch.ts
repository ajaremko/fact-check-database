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
                  projectId: input.projectId,
                  datasetId: input.table.dataset,
                  tableId: input.table.table,
                },
                sourceUris: [gsUri],
                sourceFormat: input.sourceFormat,
                schema: {
                  fields: [
                    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
                    {
                      name: 'observation_id',
                      type: 'STRING',
                      mode: 'REQUIRED',
                    },
                    { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'fetched_at', type: 'DATE', mode: 'REQUIRED' },
                    { name: 'extracted_at', type: 'DATE', mode: 'REQUIRED' },
                    { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'url', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'title', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
                  ],
                },
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
