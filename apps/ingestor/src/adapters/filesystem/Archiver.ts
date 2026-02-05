import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { Archiver, ArchiverError } from '../../ports/Archive'

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory(outputDir, { recursive: true })
  return Archiver.of({
    archive: (opts) =>
      Effect.try(() => {
        const data = JSON.stringify(opts)
        return Buffer.from(data)
      }).pipe(
        Effect.tap((buf) =>
          fs.writeFile(`${outputDir}/${opts.runId}_${opts.sourceName}.txt`, buf)
        ),
        Effect.mapError(
          (raw) =>
            new ArchiverError({
              raw,
            })
        )
      ),
  })
})

export const layer = Layer.effect(Archiver, make)
