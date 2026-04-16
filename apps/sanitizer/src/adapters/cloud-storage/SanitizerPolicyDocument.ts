import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Yaml, Node } from '@news-research/ingestion/util'
import { SanitizerPolicySchema } from '../../../../../packages/ingestion/dist/lib/steps/sanitize'

import { SanitizerPolicyConfig } from '../../SanitizerPolicyConfig'

const decodeSources = pipe(
  SanitizerPolicySchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('SANITIZER_POLICY_URI')
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const policy = yield* decodeSources(buf)
  return SanitizerPolicyConfig.of(policy)
})

export const layer: Layer.Layer<
  SanitizerPolicyConfig,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(SanitizerPolicyConfig, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
