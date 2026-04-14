import { Context, Effect, Config, flow, Layer } from 'effect'
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery'

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

type BigQueryOptionsConfig = {
  [k in keyof BigQueryOptions]?: Config.Config<NonNullable<BigQueryOptions[k]>>
}

function make(config?: BigQueryOptionsConfig) {
  return Effect.gen(function* () {
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
