import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Archiver, ArchiverError } from '../../ports/Archiver'
import { parseBuffer, parseJson } from '../../utils/schema'

// Object -> JSON -> Buffer
const encodeData = pipe(
  Schema.Object,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory(outputDir, { recursive: true })

  return Archiver.of({
    archive: (opts) =>
      Effect.gen(function* () {
        const path = `${outputDir}/${opts.runId}_${opts.sourceName}.json`
        const data = yield* encodeData(opts).pipe(
          Effect.mapError((cause) => new ArchiverError({ cause }))
        )
        yield* fs
          .writeFile(path, data)
          .pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
        return {
          object: path,
          bucket: outputDir,
        }
      }),
  })
})

export const layer = Layer.effect(Archiver, make)
