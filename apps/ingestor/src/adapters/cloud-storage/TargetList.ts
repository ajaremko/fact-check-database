import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { NodeCsv } from '@news-research/node-csv'
import { Node } from '@news-research/node'
import { SourceTargetSchema } from '@news-research/ingestion/ingest'

import { TargetList } from '../../TargetList'

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
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const sources = yield* decodeSources(buf)
  return TargetList.of(sources)
})

export const layer: Layer.Layer<
  TargetList,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(TargetList, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('TARGET_LIST_BUCKET_NAME')))
)
