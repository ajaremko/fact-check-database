import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { SanitizerPolicy } from '@news-research/ingestion-core/pipeline/sanitize'
import { Node, Yaml } from '@news-research/ingestion-data'

import { SanitizerPolicyConfig } from '../../SanitizerPolicyConfig'

const decodePolicy = pipe(
  SanitizerPolicy,
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
