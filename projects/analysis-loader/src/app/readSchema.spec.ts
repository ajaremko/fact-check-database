import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Logger } from 'effect'

import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'

import { provideSchemaReader, readSchema } from './readSchema'

describe('readSchema', () => {
  it.effect(
    'reads a schema once and serves later requests from the cache',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []

        const result = yield* Effect.gen(function* () {
          yield* readSchema({ bucket: 'staging', object: 'schemas/table.json' })
          return yield* readSchema({
            bucket: 'staging',
            object: 'schemas/table.json',
          })
        }).pipe(
          provideSchemaReader,
          Effect.provide(
            InMemoryStorageReader.layer({
              'schemas/table.json':
                '[{"name":"fact_check_id","type":"STRING"}]',
            })
          ),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(result).toStrictEqual([
          { name: 'fact_check_id', type: 'STRING' },
        ])
        expect(logs).toStrictEqual([
          {
            level: 'INFO',
            message: ['Batch schema read'],
            annotations: {
              'schema.bucket': 'staging',
              'schema.object': 'schemas/table.json',
            },
          },
        ])
      })
  )

  it.effect('retries a failed read instead of caching the failure', () =>
    Effect.gen(function* () {
      const storage: Record<string, string> = {}

      const result = yield* Effect.gen(function* () {
        const first = yield* readSchema({
          bucket: 'staging',
          object: 'schemas/table.json',
        }).pipe(Effect.flip)

        // The schema file appears, as after a redeploy restores it
        storage['schemas/table.json'] = '[{"name":"fact_check_id"}]'

        const second = yield* readSchema({
          bucket: 'staging',
          object: 'schemas/table.json',
        })
        return { first: first._tag, second }
      }).pipe(
        provideSchemaReader,
        Effect.provide(InMemoryStorageReader.layer(storage))
      )

      expect(result).toStrictEqual({
        first: 'StorageReadError',
        second: [{ name: 'fact_check_id' }],
      })
    })
  )
})
