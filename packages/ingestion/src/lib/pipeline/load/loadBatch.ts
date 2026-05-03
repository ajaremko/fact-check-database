import { Effect } from 'effect'

import { BigQueryClient } from '../../vendor/bigquery'

import { FilePointer } from '../shared'

export function loadBatch(input: {
  projectId: string
  pointer: FilePointer
  table: { dataset: string; table: string }
  sourceFormat: string
  schema: { fields: readonly { name: string; type: string; mode: string }[] }
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
          schema: { fields: [...input.schema.fields] },
          autodetect: true,
        },
      },
    })
    yield* BigQueryClient.awaitJob(job)
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
