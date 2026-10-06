import { describe, it, expect } from '@effect/vitest'
import { ConfigProvider, Effect } from 'effect'
import { FileSystem } from '@effect/platform'

import * as SanitizerPolicyConfig from './SanitizerPolicyConfig'

describe('SanitizerPolicyConfig.layer', () => {
  it.effect(
    'reads the policy from the YAML file at SANITIZER_POLICY_PATH',
    () =>
      Effect.gen(function* () {
        const files: Record<string, string> = {
          '/config/sanitizer-policy.yml': [
            'version: 3',
            'stripQueryParams:',
            '  - utm_',
            '  - fbclid',
            'dropHeaders:',
            '  - set-cookie',
            'collections:',
            '  - collection: rss',
            '    maxBytes: 5000000',
            '    defaultLabel: SAFE_PUBLIC',
            '    rewriteBody: true',
          ].join('\n'),
        }

        const policy = yield* SanitizerPolicyConfig.SanitizerPolicyConfig.pipe(
          Effect.provide(SanitizerPolicyConfig.layer),
          Effect.provide(
            FileSystem.layerNoop({
              readFile: (path) =>
                Effect.succeed(new TextEncoder().encode(files[path])),
            })
          ),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ['SANITIZER_POLICY_PATH', '/config/sanitizer-policy.yml'],
              ])
            )
          )
        )

        expect(policy).toEqual({
          version: 3,
          stripQueryParams: ['utm_', 'fbclid'],
          dropHeaders: ['set-cookie'],
          collections: [
            {
              collection: 'rss',
              maxBytes: 5000000,
              defaultLabel: 'SAFE_PUBLIC',
              rewriteBody: true,
            },
          ],
        })
      })
  )

  it.effect('fails when the policy document has no version', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sanitizer-policy.yml': [
          'stripQueryParams: []',
          'dropHeaders: []',
          'collections: []',
        ].join('\n'),
      }

      const error = yield* SanitizerPolicyConfig.SanitizerPolicyConfig.pipe(
        Effect.provide(SanitizerPolicyConfig.layer),
        Effect.provide(
          FileSystem.layerNoop({
            readFile: (path) =>
              Effect.succeed(new TextEncoder().encode(files[path])),
          })
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([['SANITIZER_POLICY_PATH', '/config/sanitizer-policy.yml']])
          )
        ),
        Effect.flip
      )

      expect(error).toMatchObject({ _tag: 'ParseError' })
    })
  )
})
