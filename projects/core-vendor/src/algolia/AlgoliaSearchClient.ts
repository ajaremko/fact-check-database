import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import { Algoliasearch, algoliasearch } from 'algoliasearch'

/**
 * Provides a shared Algolia `AlgoliaSearchClient` instance.
 *
 * This is the base layer required by `AlgoliaSearchClient`.
 */
export class AlgoliaSearchClient extends Context.Tag('AlgoliaSearchClient')<
  AlgoliaSearchClient,
  {
    readonly client: Algoliasearch
  }
>() {}

/**
 * Provided to thrown when a BigQuery client call rejects.
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
