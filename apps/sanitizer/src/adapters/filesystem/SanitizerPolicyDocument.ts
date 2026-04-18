import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { SanitizerPolicySchema } from '@news-research/ingestion/steps/sanitize'
import { Node, Yaml } from '@news-research/ingestion/util'

import { SanitizerPolicyConfig } from '../../SanitizerPolicyConfig'

const decodePolicy = pipe(
  SanitizerPolicySchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const path = yield* Config.string('SANITIZER_POLICY_PATH')
  const fs = yield* FileSystem.FileSystem
  const buf = yield* fs.readFile(path)
  const policy = yield* decodePolicy(buf)
  return SanitizerPolicyConfig.of(policy)
})

export const layer = Layer.effect(SanitizerPolicyConfig, make)
