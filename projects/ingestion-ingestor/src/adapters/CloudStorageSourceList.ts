import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'
import * as Node from '@fact-check-database/core-data/Node'
import * as Csv from '@fact-check-database/core-data/Csv'
import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'

import { SourceList } from '../ports/SourceList'

const decodeSources = pipe(
  SourceConfigSchema,
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
  yield* Effect.annotateLogsScoped({ 'sourceList.uri': uri })
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const sources = yield* decodeSources(buf)
  yield* Effect.annotateLogsScoped({ 'sources.length': sources.length })
  yield* Effect.logInfo('Source list loaded')
  return SourceList.of({ sources })
}).pipe(Effect.scoped)

export const layer: Layer.Layer<
  SourceList,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(SourceList, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('TARGET_LIST_BUCKET_NAME')))
)
