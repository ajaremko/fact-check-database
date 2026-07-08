import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { StorageWriteError, StorageWriter } from '../ports/StorageWriter'

/** Returns the parent directory portion of a `/`-separated path. */
function parentDir(filePath: string): string {
  return filePath.split('/').slice(0, -1).join('/')
}

/** Returns `filePath` with its final extension replaced by `suffix`, or `filePath.suffix` if it has no extension. */
function replaceExtension(filePath: string, suffix: string): string {
  const parts = filePath.split('.')
  if (parts.length < 2) {
    return `${filePath}.${suffix}`
  }
  parts.pop()
  return `${parts.join('.')}.${suffix}`
}

/**
 * Builds a {@link StorageWriter} that writes to
 * `{STORAGE_OUTPUT_DIR}/{path}`, creating parent directories as needed. If
 * `meta` is provided, it's also written as a `*.meta.json` sidecar file
 * alongside the object.
 */
export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('STORAGE_OUTPUT_DIR')

  yield* Effect.logTrace(
    `Creating filesystem writer with output directory: ${outputDir}`
  )
  const fs = yield* FileSystem.FileSystem

  return StorageWriter.of({
    write: (opts) =>
      Effect.gen(function* () {
        const filePath = `${outputDir}/${opts.path}`
        yield* fs.makeDirectory(parentDir(filePath), { recursive: true })
        yield* fs.writeFile(filePath, Buffer.from(opts.data))

        if (opts.meta) {
          const metaData = Buffer.from(JSON.stringify(opts.meta))
          yield* fs.writeFile(replaceExtension(filePath, 'meta.json'), metaData)
        }

        return {
          bucket: 'local',
          object: filePath,
        }
      }).pipe(
        Effect.mapError(
          (cause) =>
            new StorageWriteError({
              cause,
              message: 'Failed to write file to filesystem',
              path: opts.path,
              bucket: 'local',
            })
        )
      ),
  })
})

/** Layer providing {@link StorageWriter} backed by the `STORAGE_OUTPUT_DIR` local directory. Development adapter. */
export const layer = Layer.effect(StorageWriter, make)
