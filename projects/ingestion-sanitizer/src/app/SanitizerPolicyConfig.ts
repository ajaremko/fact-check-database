import { Config, Context, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'

/**
 * The policy the sanitizer applies to every record. It is configuration,
 * read once at startup from the YAML file at `SANITIZER_POLICY_PATH`. In
 * deployed environments that file is a Secret Manager version mounted into
 * the service.
 */
export class SanitizerPolicyConfig extends Context.Tag('SanitizerPolicyConfig')<
  SanitizerPolicyConfig,
  SanitizerPolicy
>() {}

const decodePolicy = pipe(
  SanitizerPolicy,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const layer = Layer.effect(
  SanitizerPolicyConfig,
  Effect.gen(function* () {
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
)
