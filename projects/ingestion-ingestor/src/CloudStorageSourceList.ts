import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'
import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'
import * as Node from '@news-research/core-data/Node'
import * as Csv from '@news-research/core-data/Csv'

import { SourceList, SourceSchema } from './SourceList'

const decodeSources = pipe(
  SourceSchema,
  Csv.parseCsv({
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
  yield* Effect.logTrace(`Creating source list from ${uri}`)
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
