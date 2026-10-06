import { describe, it, expect } from '@effect/vitest'
import { ConfigProvider, Effect } from 'effect'
import { FileSystem } from '@effect/platform'

import * as SourceList from './SourceList'

describe('SourceList.layer', () => {
  it.effect(
    'reads the sources from the YAML file at TARGET_LIST_PATH, giving each its timeout',
    () =>
      Effect.gen(function* () {
        const files: Record<string, string> = {
          '/config/sources.yml': `
defaults:
  timeoutSeconds: 30

sources:
  - id: politifact
    name: politifact.com
    collection: rss
    url: https://www.politifact.com/rss/factchecks/

  - id: leadstories
    name: Lead Stories
    collection: atom
    url: https://leadstories.com/atom.xml
    timeoutSeconds: 90
    notes: Slow to respond
`,
        }

        const { sources } = yield* SourceList.SourceList.pipe(
          Effect.provide(SourceList.layer),
          Effect.provide(
            FileSystem.layerNoop({
              readFile: (path) =>
                Effect.succeed(new TextEncoder().encode(files[path])),
            })
          ),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([['TARGET_LIST_PATH', '/config/sources.yml']])
            )
          )
        )

        expect(sources).toStrictEqual([
          {
            id: 'politifact',
            name: 'politifact.com',
            collection: 'rss',
            url: 'https://www.politifact.com/rss/factchecks/',
            timeoutSeconds: 30,
          },
          {
            id: 'leadstories',
            name: 'Lead Stories',
            collection: 'atom',
            url: 'https://leadstories.com/atom.xml',
            timeoutSeconds: 90,
          },
        ])
      })
  )

  it.effect('leaves out a source marked enabled: false', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sources.yml': `
defaults:
  timeoutSeconds: 30

sources:
  - id: afpfactcheck
    name: factcheck.afp.com
    collection: rss
    url: https://factcheck.afp.com/rss.xml
    enabled: false

  - id: snopes
    name: snopes.com
    collection: rss
    url: https://www.snopes.com/feed/
    enabled: true
`,
      }

      const { sources } = yield* SourceList.SourceList.pipe(
        Effect.provide(SourceList.layer),
        Effect.provide(
          FileSystem.layerNoop({
            readFile: (path) =>
              Effect.succeed(new TextEncoder().encode(files[path])),
          })
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([['TARGET_LIST_PATH', '/config/sources.yml']])
          )
        )
      )

      expect(sources).toStrictEqual([
        {
          id: 'snopes',
          name: 'snopes.com',
          collection: 'rss',
          url: 'https://www.snopes.com/feed/',
          timeoutSeconds: 30,
        },
      ])
    })
  )

  it.effect('fails when two sources share an id', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sources.yml': `
defaults:
  timeoutSeconds: 30

sources:
  - id: factcheck
    name: factcheck.org
    collection: rss
    url: https://www.factcheck.org/feed/

  - id: factcheck
    name: factcheck.afp.com
    collection: rss
    url: https://factcheck.afp.com/rss.xml
`,
      }

      const error = yield* SourceList.SourceList.pipe(
        Effect.provide(SourceList.layer),
        Effect.provide(
          FileSystem.layerNoop({
            readFile: (path) =>
              Effect.succeed(new TextEncoder().encode(files[path])),
          })
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([['TARGET_LIST_PATH', '/config/sources.yml']])
          )
        ),
        Effect.flip
      )

      expect(error).toMatchObject({ _tag: 'ParseError' })
      expect(String(error)).toContain(
        'Source ids must be unique. Duplicated: factcheck'
      )
    })
  )

  it.effect('fails when a source has a collection other than rss or atom', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sources.yml': `
defaults:
  timeoutSeconds: 30

sources:
  - id: example
    name: Example
    collection: html
    url: https://example.com/fact-checks
`,
      }

      const error = yield* SourceList.SourceList.pipe(
        Effect.provide(SourceList.layer),
        Effect.provide(
          FileSystem.layerNoop({
            readFile: (path) =>
              Effect.succeed(new TextEncoder().encode(files[path])),
          })
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([['TARGET_LIST_PATH', '/config/sources.yml']])
          )
        ),
        Effect.flip
      )

      expect(error).toMatchObject({ _tag: 'ParseError' })
    })
  )
})
