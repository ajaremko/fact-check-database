import {
  Config,
  ConfigError,
  Effect,
  ParseResult,
  Layer,
  pipe,
  Schema,
} from 'effect'

import * as Node from '@news-research/ingestion-data/Node'
import * as Yaml from '@news-research/ingestion-data/Yaml'
import {
  StorageBucket,
  StorageClient,
} from '@news-research/ingestion-vendor/cloud-storage'
import { SanitizerPolicy } from '@news-research/ingestion-pipeline/sanitize'

import { SanitizerPolicyConfig } from '../../SanitizerPolicyConfig'

const decodeSources = pipe(
  SanitizerPolicy,
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
  | ConfigError.ConfigError
  | ParseResult.ParseError
  | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(SanitizerPolicyConfig, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
