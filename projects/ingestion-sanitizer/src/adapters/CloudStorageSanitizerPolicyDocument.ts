import {
  Config,
  ConfigError,
  Effect,
  ParseResult,
  Layer,
  pipe,
  Schema,
} from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'
import { SanitizerPolicyConfig } from '../ports/SanitizerPolicyConfig'

const decodeSources = pipe(
  SanitizerPolicy,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('SANITIZER_POLICY_URI')
  yield* Effect.annotateLogsScoped({ 'policy.uri': uri })
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const policy = yield* decodeSources(buf)
  yield* Effect.annotateLogsScoped({
    'policy.version': policy.version,
    'policy.collections.length': policy.collections.length,
  })
  yield* Effect.logInfo('Sanitizer policy loaded')
  return SanitizerPolicyConfig.of(policy)
}).pipe(Effect.scoped)

export const layer: Layer.Layer<
  SanitizerPolicyConfig,
  | ConfigError.ConfigError
  | ParseResult.ParseError
  | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(SanitizerPolicyConfig, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
