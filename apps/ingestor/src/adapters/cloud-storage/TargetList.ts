import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { NodeCsv } from '@news-research/node-csv'
import { Node } from '@news-research/node'

import { SourceTargetSchema } from '../../data/SourceTarget'
import { TargetList, TargetListError } from '../../ports/TargetList'

// SourceTarget[] -> Csv -> Buffer
const decodeSources = pipe(
  SourceTargetSchema,
  NodeCsv.parseCsv({
    parse: {
      columns: true,
      skip_empty_lines: true,
    },
    stringify: {},
  }),
  Node.parseBuffer({ encoding: 'utf-8' }),
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
