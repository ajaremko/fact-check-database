import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'

import { readDirectoryMessages } from './readDirectoryMessages'

describe('readDirectoryMessages', () => {
  it.effect('reads every file in the directory into a message', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const dir = yield* fs.makeTempDirectoryScoped()
      yield* fs.writeFileString(`${dir}/one.json`, 'first')
      yield* fs.writeFileString(`${dir}/two.json`, 'second')

      const entries = yield* readDirectoryMessages(dir)
      const byId = new Map(entries.map((entry) => [entry.message.messageId, entry]))

      expect(entries).toHaveLength(2)
      expect(byId.get('one.json')?.path).toBe(`${dir}/one.json`)
      expect(byId.get('one.json')?.message.data.toString()).toBe('first')
      expect(byId.get('two.json')?.message.data.toString()).toBe('second')
    }).pipe(Effect.scoped, Effect.provide(NodeFileSystem.layer))
  )

  it.effect('returns an empty array for an empty directory', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const dir = yield* fs.makeTempDirectoryScoped()

      const entries = yield* readDirectoryMessages(dir)
      expect(entries).toEqual([])
    }).pipe(Effect.scoped, Effect.provide(NodeFileSystem.layer))
  )

  it.effect('propagates the underlying FileSystem error', () =>
    Effect.gen(function* () {
      const result = yield* readDirectoryMessages(
        '/nonexistent/directory'
      ).pipe(Effect.flip)
      expect(result._tag).toBe('SystemError')
    }).pipe(Effect.provide(NodeFileSystem.layer))
  )
})
