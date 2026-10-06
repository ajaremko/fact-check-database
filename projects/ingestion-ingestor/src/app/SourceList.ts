import { Config, Context, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import {
  SourceConfig,
  SourceListSchema,
} from '@fact-check-database/ingestion-contracts/config/v1'

/**
 * A source the run will fetch, with its fetch timeout already resolved: the
 * source's own `timeoutSeconds` when the list sets one, the list's default
 * otherwise.
 */
export type ResolvedSource = SourceConfig & {
  readonly timeoutSeconds: number
}

/**
 * The sources one ingestor run fetches. It is configuration, read once at
 * startup from the YAML file at `TARGET_LIST_PATH`. In deployed environments
 * that file is a Secret Manager version mounted into the job.
 *
 * Sources the list marks `enabled: false` are left out.
 */
export class SourceList extends Context.Tag('SourceList')<
  SourceList,
  {
    sources: readonly ResolvedSource[]
  }
>() {}

const decodeSourceList = pipe(
  SourceListSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const layer = Layer.effect(
  SourceList,
  Effect.gen(function* () {
    const sourcesPath = yield* Config.string('TARGET_LIST_PATH')
    yield* Effect.annotateLogsScoped({ 'sourceList.path': sourcesPath })
    const fs = yield* FileSystem.FileSystem
    const sourcesData = yield* fs.readFile(sourcesPath)
    const list = yield* decodeSourceList(sourcesData)

    const sources = list.sources
      .filter((entry) => entry.enabled !== false)
      .map(
        (entry): ResolvedSource => ({
          id: entry.id,
          name: entry.name,
          url: entry.url,
          collection: entry.collection,
          timeoutSeconds: entry.timeoutSeconds ?? list.defaults.timeoutSeconds,
        })
      )
    yield* Effect.annotateLogsScoped({
      'sources.length': sources.length,
      'sources.disabled': list.sources.length - sources.length,
    })
    yield* Effect.logInfo('Source list loaded')

    return SourceList.of({ sources })
  }).pipe(Effect.scoped)
)
