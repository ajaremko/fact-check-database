import { Effect, Metric } from 'effect'
import { createHash, randomUUID } from 'node:crypto'

import * as BigQueryClient from '@fact-check-database/core-vendor/bigquery/BigQueryClient'
import { FilePointer } from '@fact-check-database/core-io'

const batchesLoadedCounter = Metric.counter('loaded_batches')

const LOCATION = 'US'

/**
 * Derives a deterministic BigQuery job id for loading one version of a batch
 * object. The same object version always maps to the same job id, so a
 * redelivered notification can't start a second load job that appends the
 * same rows again — BigQuery rejects the duplicate id instead.
 */
export function loadJobId(pointer: FilePointer, generation?: string): string {
  const key = `gs://${pointer.bucket}/${pointer.object}#${generation ?? ''}`
  return `load_${createHash('sha256').update(key).digest('hex')}`
}

/**
 * Whether a fetched job finished with an error. Failed load jobs are atomic —
 * they append nothing — so the batch can be safely loaded again.
 */
function jobFailed(job: { metadata?: { status?: { errorResult?: unknown } } }) {
  return Boolean(job.metadata?.status?.errorResult)
}

export const loadBatch = Effect.fn('loadBatch')(
  function* (input: {
    projectId: string
    pointer: FilePointer
    generation?: string
    table: { dataset: string; table: string }
    sourceFormat: string
    schema: object
  }) {
    const gsUri = `gs://${input.pointer.bucket}/${input.pointer.object}`
    const createLoadJob = (jobId: string) =>
      BigQueryClient.createJob({
        jobId,
        location: LOCATION,
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
      }).pipe(Effect.map(([job]) => job))

    yield* Effect.annotateLogsScoped({
      'batch.bucket': input.pointer.bucket,
      'batch.object': input.pointer.object,
      'batch.generation': input.generation ?? '',
      'batch.datasetId': input.table.dataset,
      'batch.tableId': input.table.table,
    })

    const jobId = loadJobId(input.pointer, input.generation)
    yield* Effect.annotateLogsScoped({ 'job.id': jobId })

    const job = yield* createLoadJob(jobId).pipe(
      Effect.tap(() => Effect.logInfo('Load job created')),
      Effect.catchIf(BigQueryClient.isAlreadyExists, () =>
        Effect.gen(function* () {
          // this batch version was submitted before (e.g. a redelivered
          // notification): reuse that job rather than appending again
          const existing = yield* BigQueryClient.getJob({
            id: jobId,
            location: LOCATION,
          })
          if (!jobFailed(existing)) {
            yield* Effect.logInfo(
              'Load job already exists for this batch, awaiting it'
            )
            return existing
          }
          const retryJobId = `${jobId}_${randomUUID()}`
          yield* Effect.annotateLogsScoped({ 'job.retryId': retryJobId })
          yield* Effect.logWarning(
            'Previous load job for this batch failed, retrying'
          )
          const retry = yield* createLoadJob(retryJobId)
          yield* Effect.logInfo('Load job created')
          return retry
        })
      )
    )
    yield* BigQueryClient.awaitJob(job)
    yield* Effect.logInfo('Load job completed')
    yield* Metric.increment(batchesLoadedCounter)
  },
  Effect.scoped,
  (effect, input) =>
    effect.pipe(
      Effect.tagMetrics({
        table_dataset_id: input.table.dataset,
        table_table_id: input.table.table,
      })
    )
)
