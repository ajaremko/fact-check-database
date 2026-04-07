import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Yaml } from '@news-research/yaml'
import { Node } from '@news-research/node'
import { SanitizerPolicySchema } from '@news-research/ingestion/sanitize'

import {
  SanitizerPolicyDocument,
  SanitizerPolicyDocumentError,
} from '../../ports/SanitizerPolicyDocument'

// SanitizerPolicy -> Yaml -> Buffer
const decodeSources = pipe(
  SanitizerPolicySchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('SANITIZER_POLICY_URI')
  const { bucket } = yield* StorageBucket.StorageBucket

  return SanitizerPolicyDocument.of({
    read: StorageBucket.downloadFile(uri).pipe(
      Effect.andThen(([buf]) => decodeSources(buf)),
      Effect.mapError((cause) => new SanitizerPolicyDocumentError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    ),
  })
})

export const layer: Layer.Layer<
  SanitizerPolicyDocument,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(SanitizerPolicyDocument, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
