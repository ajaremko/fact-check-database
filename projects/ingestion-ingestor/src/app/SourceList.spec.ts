import { describe, it, expect } from '@effect/vitest'
import { ConfigProvider, Effect } from 'effect'
import { FileSystem } from '@effect/platform'

import * as SourceList from './SourceList'

describe('SourceList.layer', () => {
  it.effect('reads the sources from the CSV file at TARGET_LIST_PATH', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sources.csv': [
          'id,name,collection,url',
          'politifact,politifact.com,rss,https://www.politifact.com/rss/factchecks/',
          'leadstories,Lead Stories,atom,https://leadstories.com/atom.xml',
          '',
        ].join('\n'),
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
            new Map([['TARGET_LIST_PATH', '/config/sources.csv']])
          )
        )
      )

      expect(sources).toStrictEqual([
        {
          id: 'politifact',
          name: 'politifact.com',
          collection: 'rss',
          url: 'https://www.politifact.com/rss/factchecks/',
        },
        {
          id: 'leadstories',
          name: 'Lead Stories',
          collection: 'atom',
          url: 'https://leadstories.com/atom.xml',
        },
      ])
    })
  )

  it.effect('fails when a row has a collection other than rss or atom', () =>
    Effect.gen(function* () {
      const files: Record<string, string> = {
        '/config/sources.csv': [
          'id,name,collection,url',
          'example,Example,html,https://example.com/fact-checks',
        ].join('\n'),
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
            new Map([['TARGET_LIST_PATH', '/config/sources.csv']])
          )
        ),
        Effect.flip
      )

      expect(error).toMatchObject({ _tag: 'ParseError' })
    })
  )
})
