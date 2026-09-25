import { describe, it, expect } from '@effect/vitest'
import { Config, Effect, HashMap, Layer } from 'effect'

import * as StorageClient from './cloud-storage/StorageClient'
import * as StorageBucket from './cloud-storage/StorageBucket'

// Modules annotate logs while they build and while each action runs. Those
// annotations must stay within the module: a scoped annotation left open on
// a layer's scope would be inherited by every log the consuming program
// writes afterwards.
describe('core-vendor log annotations', () => {
  it.effect('do not leak from layer construction into the program', () =>
    Effect.gen(function* () {
      const annotations = yield* Effect.logAnnotations
      expect(HashMap.has(annotations, 'module')).toBe(false)
      expect(HashMap.has(annotations, 'bucket.name')).toBe(false)
    }).pipe(
      Effect.provide(
        StorageBucket.layer(Config.succeed('test-bucket')).pipe(
          Layer.provideMerge(StorageClient.layer())
        )
      )
    )
  )
})
