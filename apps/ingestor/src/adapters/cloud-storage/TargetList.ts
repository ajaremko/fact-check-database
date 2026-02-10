import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'

import { SourceTargetSchema } from '../../domain/SourceTarget'
import { TargetList, TargetListError } from '../../ports/TargetList'
import { parseBuffer, parseCsv } from '../../utils/schema'

// SourceTarget[] -> Csv -> Buffer
const decodeSources = pipe(
  SourceTargetSchema,
  parseCsv({
    parse: {
      columns: true,
      skip_empty_lines: true,
    },
    stringify: {},
  }),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('TARGET_LIST_URI')
  const { bucket } = yield* StorageBucket.StorageBucket

  return TargetList.of({
    read: StorageBucket.downloadFile(uri).pipe(
      Effect.andThen(([buf]) => decodeSources(buf)),
      Effect.mapError((cause) => new TargetListError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    ),
  })
})

export const layer: Layer.Layer<
  TargetList,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(TargetList, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('TARGET_LIST_BUCKET_NAME')))
)
