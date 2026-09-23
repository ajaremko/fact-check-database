import { it, expect } from '@effect/vitest'
import { describe } from 'vitest'
import { Schema } from 'effect'

import { ArchivePathSchema } from './ArchivePath'

describe('ArchivePath', () => {
  it('can encode fetch attempt and file details into an archive path', () => {
    expect(
      Schema.encodeSync(ArchivePathSchema)({
        version: 1,
        collectionName: 'test_collection',
        ext: 'yml',
        sourceId: 'test-rss',
        date: 1704067200000,
        ingestorRunId: 'run-1',
        fileName: 'fetch_attempt',
      })
    ).toBe(
      'v1/test_collection/source=test-rss/date=2024-01-01/ingestor_run_id=run-1/fetch_attempt.yml'
    )
  })
})
