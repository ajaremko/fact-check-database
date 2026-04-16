import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Node, NodeCsv } from '@news-research/ingestion/util'
import { SourceTargetSchema } from '../../../../../packages/ingestion/dist/lib/steps/ingest'

import { TargetList } from '../../TargetList'

const decodeSources = pipe(
  SourceTargetSchema,
  NodeCsv.parseCsv({
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
  const fs = yield* FileSystem.FileSystem
  const sourcesPath = yield* Config.string('TARGET_LIST_PATH')
  const sourcesData = yield* fs.readFile(sourcesPath)
  const sources = yield* decodeSources(sourcesData)

  return TargetList.of({ sources })
})

export const layer = Layer.effect(TargetList, make)
