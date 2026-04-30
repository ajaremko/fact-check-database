import { Config, Effect, Layer } from 'effect'

import { FileSystem } from '@effect/platform'

import { StorageWriter } from '../../steps/shared'

function parentDir(filePath: string): string {
  return filePath.split('/').slice(0, -1).join('/')
}

function replaceExtension(filePath: string, suffix: string): string {
  const parts = filePath.split('.')
  if (parts.length < 2) {
    return `${filePath}.${suffix}`
  }
  parts.pop()
  return `${parts.join('.')}.${suffix}`
}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const outputDir = yield* Config.string('STORAGE_OUTPUT_DIR')

  return StorageWriter.StorageWriter.of({
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
            new StorageWriter.StorageWriteError({
              cause,
              path: opts.path,
              bucket: 'local',
            })
        )
      ),
  })
})

export const layer = Layer.effect(StorageWriter.StorageWriter, make)
