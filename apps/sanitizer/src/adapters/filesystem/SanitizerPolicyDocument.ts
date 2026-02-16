import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Yaml } from '@news-research/yaml'
import { Node } from '@news-research/node'

import {
  SanitizerPolicyDocument,
  SanitizerPolicyDocumentError,
} from '../../ports/SanitizerPolicyDocument'
import { SanitizerPolicySchema } from '../../data/SanitizerPolicy'

// SanitizerPolicy -> Yaml -> Uint8Array
const decodePolicy = pipe(
  SanitizerPolicySchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const path = yield* Config.string('SANITIZER_POLICY_PATH')
  const fs = yield* FileSystem.FileSystem

  return SanitizerPolicyDocument.of({
    read: fs.readFile(path).pipe(
      Effect.andThen(decodePolicy),
      Effect.mapError((cause) => new SanitizerPolicyDocumentError({ cause }))
    ),
  })
})

export const layer = Layer.effect(SanitizerPolicyDocument, make)
