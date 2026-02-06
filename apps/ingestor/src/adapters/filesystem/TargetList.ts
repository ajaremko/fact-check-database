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
  console.log('path', path)

  return TargetList.of({
    read: Effect.gen(function* () {
      const buf = yield* fs.readFile(path)
      const targets = yield* decodeSources(buf)
      return targets
    }).pipe(
      Effect.mapError((raw) => {
        console.log('raw', raw)
        return new TargetListError({ raw })
      })
    ),
  })
})

export const layer = Layer.effect(TargetList, make)
