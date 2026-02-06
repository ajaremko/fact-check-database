import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { SourceTargetSchema } from '../../domain/SourceTarget'
import { TargetList, TargetListError } from '../../ports/TargetList'
import { parseUint8Array, parseCsv } from '../../utils/schema'

// SourceTarget[] -> Csv -> Uint8Array
const decodeSources = pipe(
  SourceTargetSchema,
  parseCsv({
    parse: {
      columns: true,
      skip_empty_lines: true,
    },
    stringify: {},
  }),
  parseUint8Array({ encoding: 'utf-8' }),
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
