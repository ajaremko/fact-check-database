import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import { Algoliasearch, algoliasearch } from 'algoliasearch'

/**
 * Provides a shared Algolia search client instance.
 *
 * This is the base layer required by this module's operations
 * (`saveObjects`, `saveObjectsWithTransformation`).
 */
export class AlgoliaSearchClient extends Context.Tag('AlgoliaSearchClient')<
  AlgoliaSearchClient,
  {
    readonly client: Algoliasearch
  }
>() {}

/**
 * Thrown when an Algolia search client call rejects.
 */
export class AlgoliaSearchClientIOError extends Data.TaggedError(
  'AlgoliaSearchClientIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

type ClientOptions = NonNullable<Parameters<typeof algoliasearch>[2]>

type AlgoliaSearchClientOptionsConfig = {
  apiKey: Config.Config<string>
  appId: Config.Config<string>
} & {
  [k in keyof ClientOptions]?: Config.Config<NonNullable<ClientOptions[k]>>
}

function make(config: AlgoliaSearchClientOptionsConfig) {
  return Effect.gen(function* () {
    yield* Effect.logTrace('Creating Algolia client')
    const { apiKey, appId, ...options } = yield* Config.all(config)
    const client = algoliasearch(appId, apiKey, options)
    return { client }
  })
}

/**
 * Creates an Effect layer providing an `AlgoliaSearchClient`.
 *
 * @example
 * Effect.provide(AlgoliaSearchClient.layer({
 *   apiKey: Config.string('ALGOLIA_API_KEY'),
 *   appId: Config.string('ALGOLIA_APP_ID'),
 * }))
 *
 */
export const layer = flow(make, Layer.effect(AlgoliaSearchClient))

/**
 * Saves objects to an index, applying the index's configured transformation
 * rules first. Requires `AlgoliaSearchClient` in context.
 *
 * Takes the same parameters as `Algoliasearch['saveObjectsWithTransformation']`.
 * Any rejection is caught and wrapped as an {@link AlgoliaSearchClientIOError}.
 *
 * @example
 * yield* saveObjectsWithTransformation({
 *   indexName: 'fact_checks',
 *   objects: records,
 * })
 */
export function saveObjectsWithTransformation(
  ...params: Parameters<Algoliasearch['saveObjectsWithTransformation']>
) {
  return AlgoliaSearchClient.pipe(
    Effect.flatMap(({ client }) =>
      Effect.tryPromise({
        try: () => client.saveObjectsWithTransformation(...params),
        catch: (cause) =>
          new AlgoliaSearchClientIOError({
            cause,
            message: 'Failed to save objects with transformation',
          }),
      })
    )
  )
}

/**
 * Saves objects to an index as is, with no transformation applied. Requires
 * `AlgoliaSearchClient` in context.
 *
 * Takes the same parameters as `Algoliasearch['saveObjects']`. Any rejection
 * is caught and wrapped as an {@link AlgoliaSearchClientIOError}.
 *
 * @example
 * yield* saveObjects({ indexName: 'fact_checks', objects: records })
 */
export function saveObjects(
  ...params: Parameters<Algoliasearch['saveObjects']>
) {
  return AlgoliaSearchClient.pipe(
    Effect.flatMap(({ client }) =>
      Effect.tryPromise({
        try: () => client.saveObjects(...params),
        catch: (cause) =>
          new AlgoliaSearchClientIOError({
            cause,
            message: 'Failed to save objects',
          }),
      })
    )
  )
}
