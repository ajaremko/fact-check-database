import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import {
  BigQuery,
  BigQueryOptions,
  Job,
  JobOptions,
} from '@google-cloud/bigquery'

import { logSdkFailure } from '../internal/logSdkFailure'

const moduleName = 'BigQueryClient'

/**
 * Provides a shared Google Cloud `BigQuery` client instance.
 *
 * This is the base layer required by `BigQueryClient`.
 * Credentials default to Application Default Credentials (ADC), which are
 * resolved automatically in Cloud Run via the attached service account.
 */
export class BigQueryClient extends Context.Tag('BigQueryClient')<
  BigQueryClient,
  {
    readonly client: BigQuery
  }
>() {}

/**
 * Thrown when a BigQuery client call rejects.
 */
export class BigQueryClientIOError extends Data.TaggedError(
  'BigQueryClientIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

type BigQueryOptionsConfig = {
  [k in keyof BigQueryOptions]?: Config.Config<NonNullable<BigQueryOptions[k]>>
}

function make(config?: BigQueryOptionsConfig) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ module: moduleName })
    const client = config
      ? new BigQuery(yield* Config.all(config))
      : new BigQuery()
    yield* Effect.logTrace('Client created')
    return { client }
  }).pipe(Effect.scoped)
}

/**
 * Creates an Effect layer providing a `BigQueryClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(BigQueryClient.layer())
 *
 * // With explicit project
 * Effect.provide(BigQueryClient.layer({ projectId: Config.string('GCP_PROJECT_ID') }))
 */
export const layer = flow(make, Layer.effect(BigQueryClient))

/**
 * Starts a BigQuery job (e.g. a load or query job) and returns the `Job`
 * handle. Requires `BigQueryClient` in context. Does not wait for the job to
 * finish — pass the result to {@link awaitJob} for that.
 *
 * Any rejection from the underlying `client.createJob()` call is caught and
 * wrapped as a {@link BigQueryClientIOError}.
 *
 * @example
 * const job = yield* createJob({ configuration: { load: { ... } } })
 * yield* awaitJob(job)
 */
export function createJob(options: JobOptions) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'job.id': options.jobId,
      'job.location': options.location,
    })
    const { client } = yield* BigQueryClient
    const result = yield* Effect.tryPromise({
      try: () => client.createJob(options),
      catch: (cause) =>
        new BigQueryClientIOError({
          cause,
          message: 'Failed to create BigQuery job',
        }),
    }).pipe(logSdkFailure('Job creation failed'))
    yield* Effect.logTrace('Job created')
    return result
  }).pipe(Effect.scoped)
}

/**
 * Waits for a BigQuery `Job` to finish, resolving on the job's `complete`
 * event and failing on its `error` event. Takes the `Job` handle directly
 * and does not require `BigQueryClient` in context.
 *
 * Any error emitted by the job is wrapped as a {@link BigQueryClientIOError}.
 *
 * @example
 * const job = yield* createJob(options)
 * yield* awaitJob(job)
 */
export function awaitJob(job: Job) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ module: moduleName, 'job.id': job.id })
    yield* Effect.tryPromise({
      try: () =>
        new Promise<void>((resolve, reject) => {
          job.on('error', reject).on('complete', () => resolve())
        }),
      catch: (cause) =>
        new BigQueryClientIOError({
          cause,
          message: 'BigQuery job failed',
        }),
    }).pipe(logSdkFailure('Job failed'))
    yield* Effect.logTrace('Job completed')
  }).pipe(Effect.scoped)
}

/**
 * Fetches an existing BigQuery `Job` by id, with its metadata (including
 * `status`) loaded. Requires `BigQueryClient` in context.
 *
 * Any rejection from the underlying `job.getMetadata()` call is caught and
 * wrapped as a {@link BigQueryClientIOError}.
 *
 * @example
 * const job = yield* getJob({ id: 'load_abc123', location: 'US' })
 * job.metadata.status.state // 'DONE'
 */
export function getJob(options: { id: string; location?: string }) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'job.id': options.id,
      'job.location': options.location,
    })
    const { client } = yield* BigQueryClient
    const job = yield* Effect.tryPromise({
      try: () => {
        const job = client.job(options.id, { location: options.location })
        return job.getMetadata().then(() => job)
      },
      catch: (cause) =>
        new BigQueryClientIOError({
          cause,
          message: 'Failed to get BigQuery job',
        }),
    }).pipe(logSdkFailure('Job fetch failed'))
    yield* Effect.annotateLogsScoped({
      'job.status.state': job.metadata?.status?.state,
    })
    yield* Effect.logTrace('Job fetched')
    return job
  }).pipe(Effect.scoped)
}

/**
 * Whether a {@link BigQueryClientIOError} was caused by the resource already
 * existing (HTTP 409) — e.g. {@link createJob} called with a `jobId` that has
 * already been used.
 */
export function isAlreadyExists(error: BigQueryClientIOError): boolean {
  const { cause } = error
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === 409
  )
}
