import { Effect, Layer } from 'effect'

import { Archive, ArchiveError } from '../../ports'

export function layer(archive: Record<string, string>) {
  return Layer.succeed(Archive, {
    write: (opts) =>
      Effect.sync(() => {
        archive[opts.path] = opts.data.toString()
        return {
          object: opts.path,
          bucket: 'inmemory',
        }
      }),
    read: (pointer) =>
      archive[pointer.object]
        ? Effect.succeed(Buffer.from(archive[pointer.object]))
        : Effect.fail(
            new ArchiveError({
              cause: new Error(`Object not found: ${pointer.object}`),
            })
          ),
  })
}
