import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Csv from '@fact-check-database/core-data/Csv'
import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'

import { SourceList } from '../ports/SourceList'

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

export const make = Effect.gen(function* () {
  const sourcesPath = yield* Config.string('TARGET_LIST_PATH')
  yield* Effect.logTrace(`Creating source list from ${sourcesPath}`)
  const fs = yield* FileSystem.FileSystem
  const sourcesData = yield* fs.readFile(sourcesPath)
  const sources = yield* decodeSources(sourcesData)

  return SourceList.of({ sources })
})

export const layer = Layer.effect(SourceList, make)
