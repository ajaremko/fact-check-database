import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'
import { SanitizerPolicyConfig } from '../ports/SanitizerPolicyConfig'

const decodePolicy = pipe(
  SanitizerPolicy,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const path = yield* Config.string('SANITIZER_POLICY_PATH')
  yield* Effect.annotateLogsScoped({ 'policy.path': path })
  const fs = yield* FileSystem.FileSystem
  const buf = yield* fs.readFile(path)
  const policy = yield* decodePolicy(buf)
  yield* Effect.annotateLogsScoped({
    'policy.version': policy.version,
    'policy.collections.length': policy.collections.length,
  })
  yield* Effect.logInfo('Sanitizer policy loaded')
  return SanitizerPolicyConfig.of(policy)
}).pipe(Effect.scoped)

export const layer = Layer.effect(SanitizerPolicyConfig, make)
