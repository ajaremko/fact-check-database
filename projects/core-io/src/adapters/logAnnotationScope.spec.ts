import { describe, it, expect } from '@effect/vitest'
import { ConfigProvider, Effect, HashMap, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import * as FileSystemMessageBatch from './FileSystemMessageBatch'
import * as FileSystemStorageWriter from './FileSystemStorageWriter'

// Adapters annotate logs while they build and while each operation runs.
// Those annotations must stay within the adapter: a scoped annotation left
// open on a layer's scope would be inherited by every log the consuming
// program writes afterwards.
describe('adapter log annotations', () => {
  it.effect('do not leak from layer construction into the program', () =>
    Effect.gen(function* () {
      const annotations = yield* Effect.logAnnotations
      expect(HashMap.has(annotations, 'adapter')).toBe(false)
      expect(HashMap.has(annotations, 'inputDir')).toBe(false)
    }).pipe(
      Effect.provide(
        Layer.merge(FileSystemMessageBatch.layer, FileSystemStorageWriter.layer)
      ),
      Effect.provide(
        FileSystem.layerNoop({ readDirectory: () => Effect.succeed([]) })
      ),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map([
            ['MESSAGE_QUEUE_INPUT_DIR', '/input'],
            ['STORAGE_OUTPUT_DIR', '/output'],
          ])
        )
      )
    )
  )
})
