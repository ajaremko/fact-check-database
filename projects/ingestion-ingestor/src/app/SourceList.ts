import { Config, Context, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Csv from '@fact-check-database/core-data/Csv'
import {
  SourceConfig,
  SourceConfigSchema,
} from '@fact-check-database/ingestion-contracts/config/v1'

/**
 * The sources one ingestor run fetches. It is configuration, read once at
 * startup from the CSV file at `TARGET_LIST_PATH`. In deployed environments
 * that file is a Secret Manager version mounted into the job.
 */
export class SourceList extends Context.Tag('SourceList')<
  SourceList,
  {
    sources: readonly SourceConfig[]
  }
>() {}

const decodeSources = pipe(
  SourceConfigSchema,
  Csv.parseCsv({
    parse: {
      columns: true,
      skip_empty_lines: true,
    },
    stringify: {},
  }),
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
    const sources = yield* decodeSources(sourcesData)
    yield* Effect.annotateLogsScoped({ 'sources.length': sources.length })
    yield* Effect.logInfo('Source list loaded')

    return SourceList.of({ sources })
  }).pipe(Effect.scoped)
)
