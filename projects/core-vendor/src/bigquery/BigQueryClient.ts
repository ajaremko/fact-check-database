import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import {
  BigQuery,
  BigQueryOptions,
  Job,
  JobOptions,
} from '@google-cloud/bigquery'

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
    yield* Effect.logTrace('Creating bq client')
    if (config) {
      const options = yield* Config.all(config)
      const client = new BigQuery(options)
      return { client }
    }
    const client = new BigQuery()
    return { client }
  })
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
  return BigQueryClient.pipe(
    Effect.flatMap(({ client }) =>
      Effect.tryPromise({
        try: () => client.createJob(options),
        catch: (cause) =>
          new BigQueryClientIOError({
            cause,
            message: 'Failed to create BigQuery job',
          }),
      })
    )
  )
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
  return Effect.tryPromise({
    try: () =>
      new Promise<void>((resolve, reject) => {
        job.on('error', reject).on('complete', () => resolve())
      }),
    catch: (cause) =>
      new BigQueryClientIOError({
        cause,
        message: 'BigQuery job failed',
      }),
  })
}
