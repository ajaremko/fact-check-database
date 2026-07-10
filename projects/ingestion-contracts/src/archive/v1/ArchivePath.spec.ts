import { it, expect } from '@effect/vitest'
import { describe } from 'vitest'
import { Schema } from 'effect'

import { ArchivePathSchema } from './ArchivePath'

describe('ArchivePath', () => {
  it('can encode observation and file details into an archive path', () => {
    expect(
      Schema.encodeSync(ArchivePathSchema)({
        version: 1,
        collectionName: 'test_collection',
        ext: 'sanitizer.yml',
        sourceName: 'https://test-rss.com/rss',
        date: 1704067200000,
        ingestionId: 'run-1',
        observationId: 'obs-1',
      })
    ).toBe(
      'v1/test_collection/source=https://test-rss.com/rss/date=2024-01-01/ingestion_id=run-1/obs-1.sanitizer.yml'
    )
  })
})
