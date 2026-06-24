import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@news-research/core-data/Node'
import * as Csv from '@news-research/core-data/Csv'

import { SourceList, SourceSchema } from './SourceList'

const decodeSources = pipe(
  SourceSchema,
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
