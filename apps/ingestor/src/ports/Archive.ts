import { Context, Data, Effect } from 'effect'

import type { ArchivePointer } from '../domain/Observation'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly raw: unknown
}> {}

export type WriteRawOpts = {
  runId: string
  sourceName: string
  url: string
  fetchedAt: number
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly archive: (
      opts: WriteRawOpts
    ) => Effect.Effect<ArchivePointer, ArchiverError>
  }
>() {}
