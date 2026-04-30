import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Node, NodeCsv } from '@news-research/ingestion/data'

import { SourceList, SourceSchema } from '../../TargetList'

const decodeSources = pipe(
  SourceSchema,
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
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const sources = yield* decodeSources(buf)
  return SourceList.of({ sources })
})

export const layer: Layer.Layer<
  SourceList,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(SourceList, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('TARGET_LIST_BUCKET_NAME')))
)
