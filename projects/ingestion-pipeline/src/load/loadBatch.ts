import { Effect } from 'effect'

import * as BigQueryClient from '@news-research/ingestion-vendor/bigquery/BigQueryClient'

import { FilePointer } from '../shared'

export function loadBatch(input: {
  projectId: string
  pointer: FilePointer
  table: { dataset: string; table: string }
  sourceFormat: string
  schema: object
}): Effect.Effect<
  void,
  BigQueryClient.BigQueryClientIOError,
  BigQueryClient.BigQueryClient
> {
  return Effect.gen(function* () {
    yield* Effect.logInfo('Loading data from GCS object into BigQuery table')
    const gsUri = `gs://${input.pointer.bucket}/${input.pointer.object}`
    const [job] = yield* BigQueryClient.createJob({
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
          schema: input.schema,
          autodetect: true,
        },
      },
    })
    yield* BigQueryClient.awaitJob(job)
  }).pipe(
    Effect.annotateLogs({
      tableId: input.table.table,
      datasetId: input.table.dataset,
      bucket: input.pointer.bucket,
      object: input.pointer.object,
    }),
    Effect.withSpan('loadBatch')
  )
}
