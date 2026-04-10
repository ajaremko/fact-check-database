import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Node, NodeCsv } from '@news-research/ingestion/util'
import { SourceTargetSchema } from '@news-research/ingestion/ingest'

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
  const path = yield* Config.string('TARGET_LIST_PATH')
  const fs = yield* FileSystem.FileSystem
  const buff = yield* fs.readFile(path)
  const targets = yield* decodeSources(buff)
  return TargetList.of(targets)
})

export const layer = Layer.effect(TargetList, make)
