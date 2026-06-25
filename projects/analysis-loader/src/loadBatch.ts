import { Effect, Metric } from 'effect'

import * as BigQueryClient from '@news-research/core-vendor/bigquery/BigQueryClient'
import { FilePointer } from '@news-research/ingestion-pipeline/shared'

const batchesLoadedCounter = Metric.counter('loaded_batches')

export const loadBatch = Effect.fn('loadBatch')(
  function* (input: {
    projectId: string
    pointer: FilePointer
    table: { dataset: string; table: string }
    sourceFormat: string
    schema: object
  }) {
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
    yield* Metric.increment(batchesLoadedCounter)
  },
  (effect, input) =>
    effect.pipe(
      Effect.annotateLogs({
        'batch.tableId': input.table.table,
        'batch.datasetId': input.table.dataset,
        'batch.bucket': input.pointer.bucket,
        'batch.object': input.pointer.object,
      }),
      Effect.tagMetrics({
        table_dataset_id: input.table.dataset,
        table_table_id: input.table.table,
      })
    )
)
