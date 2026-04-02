import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { NodeCsv } from '@news-research/node-csv'
import { Node } from '@news-research/node'

import { SourceTargetSchema } from '../../data/SourceTarget'
import { TargetList, TargetListError } from '../../ports/TargetList'

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

  return TargetList.of({
    read: fs.readFile(path).pipe(
      Effect.andThen(decodeSources),
      Effect.mapError((cause) => new TargetListError({ cause }))
    ),
  })
})

export const layer = Layer.effect(TargetList, make)
